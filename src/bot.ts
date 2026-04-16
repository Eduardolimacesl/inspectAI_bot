import { Telegraf, session, Scenes } from 'telegraf';
import { message } from 'telegraf/filters';
import dotenv from 'dotenv';
import axios from 'axios';
import { resolveLocationPath, uploadPhotoToDrive, readDriveJson, writeDriveJson, findOrCreateSpreadsheet, findOrCreateSheetTab, appendToSheetTab } from './services/google';
import { analyzeInspectionPhoto } from './services/analysisAi';
import sectorWizard, { MyBotContext } from './scenes/sectorWizard';
import stream from 'stream';

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN) {
  console.error("ERRO: TELEGRAM_BOT_TOKEN ausente. Verifique o .env");
  process.exit(1);
}

// Inicializa bot com tipagem estendida
export const bot = new Telegraf<MyBotContext>(TOKEN);

// Configuração das sessões e middleware para injetar RAM storage (buffer)
bot.use(session());

bot.use((ctx, next) => {
  if (!ctx.session) {
    (ctx as any).session = {};
  }
  // Garante que o mediaBuffer sempre exista na sessão atual do usuário
  if (!ctx.session.mediaBuffer) {
    ctx.session.mediaBuffer = [];
  }
  return next();
});

// Registrar Scenes
const stage = new Scenes.Stage<MyBotContext>([sectorWizard]);
bot.use(stage.middleware());

// --- COMANDOS ---

bot.start((ctx) => {
  ctx.reply('👋 Bem-vindo ao Bot InspectAI!\n\nPara entender como o bot funciona, digite /ajuda.\n\nPara iniciar uma vistoria agora, digite /setor.');
});

// Dispara o inicio da Máquina de Estados hierárquica
bot.command('setor', (ctx) => ctx.scene.enter('SECTOR_WIZARD'));

// Cancela o setor atual e reseta localização
bot.command('cancelar', (ctx) => {
  ctx.session.currentLocation = undefined;
  ctx.session.mediaBuffer = [];
  ctx.reply('❌ Setor cancelado e buffer esvaziado.\nPara nova vistoria, digite /setor.');
});

bot.command(['ajuda', 'help'], (ctx) => {
  const helpText = `📖 *Como o InspectAI funciona:*

1️⃣ *Defina o Setor:* Use o comando /setor para informar a Edificação, Bloco, Pavimento e Sala que você está vistoriando. Isso organiza as fotos automaticamente em pastas no Drive.

2️⃣ *Colete Evidências:* Após definir o setor, você pode enviar fotos:
• Se enviar uma foto com legenda, a legenda será o comentário daquela evidência.
• Você também pode enviar mensagens de texto avulsas, que serão salvas como notas de inspeção.

3️⃣ *Sincronize:* Quando terminar de coletar, use o comando /sincronizar.
• O bot fará o upload das imagens para o Google Drive.
• Os dados (data, usuário, local e comentário) serão registrados no Google Sheets.

4️⃣ *Cancele ou Resete:* Use /cancelar para limpar o setor atual e as mensagens pendentes na RAM.

💡 *Dica:* O bot mantém o setor na memória até que você o altere ou cancele. Você pode enviar várias fotos e sincronizar tudo no final!

*Comandos:*
/setor - Define a localização
/sincronizar - Envia dados para a nuvem
/cancelar - Limpa o buffer atual
/ajuda - Mostra esta explicação`;

  ctx.reply(helpText, { parse_mode: 'Markdown' });
});

bot.command('sincronizar', async (ctx) => {
  const bufferLength = ctx.session.mediaBuffer.length;
  
  if (bufferLength === 0) {
    return ctx.reply('📭 Não há nenhuma evidência na fila para sincronizar no momento. Envie fotos após escolher um /setor.');
  }

  const statusMsg = await ctx.reply(`🔄 Resolvendo caminhos do Google Drive (0/${bufferLength})...`);

  try {
    const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!rootId) throw new Error("A variável de ambiente GOOGLE_DRIVE_ROOT_FOLDER_ID está ausente.");

    // Resolução de nomes e tópicos
    let topicName = "Geral";
    const threadId = ctx.message.message_thread_id; 
    if (threadId) {
      topicName = `Topico_${threadId}`;
    } else if (ctx.chat?.type !== 'private' && (ctx.chat as any)?.title) {
      topicName = (ctx.chat as any).title;
    }

    // Pasta do Tópico (Edificação)
    const topicFolderId = await resolveLocationPath([topicName], rootId);
    
    // Planilha da Edificação
    const spreadsheetName = `Vistoria_${topicName}`;
    const spreadsheetId = await findOrCreateSpreadsheet(spreadsheetName, topicFolderId);

    // Iteração real pelas mídias (removendo 1 a 1 em caso de erro para evitar upload duplicado)
    const clonedBuffer = [...ctx.session.mediaBuffer];
    for (let index = 0; index < clonedBuffer.length; index++) {
      const item = clonedBuffer[index];
      const currentStep = `(${index + 1}/${bufferLength})`;
      
      await ctx.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, `🔄 ${currentStep} Processando evidência...`);

      const localLocation = item.location || "Indefinida";
      const locationParts = localLocation.split('/');
      const sectorName = locationParts[locationParts.length - 1].trim();
      
      // Pasta do Setor (dentro da Edificação)
      const sectorFolderId = await resolveLocationPath(locationParts, topicFolderId);

      let driveUrl = "Sincronizado Apenas Texto";
      let driveFileId = "";
      let aiAnalysis = null;
      const comentario = item.type === 'photo' ? item.caption : (item.text || "");

      if (item.type === 'photo') {
        // 1. Download e Análise IA
        await ctx.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, `🧠 ${currentStep} Analisando com Gemini IA...`);
        const fileLink = await ctx.telegram.getFileLink(item.file_id);
        const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        
        // Chamada assíncrona para o Gemini
        aiAnalysis = await analyzeInspectionPhoto(buffer, comentario);

        // 2. Upload para Drive
        await ctx.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, `📤 ${currentStep} Fazendo upload para o Drive...`);
        const fileName = `${item.timestamp}_evidencia.jpg`;
        const driveDescriptionPayload = `${localLocation} | ${topicName} | ${comentario}`;
        
        const readable = new stream.PassThrough();
        readable.end(buffer);
        
        const uploadResult = await uploadPhotoToDrive(readable, fileName, sectorFolderId, driveDescriptionPayload);
        driveUrl = uploadResult.driveUrl;
        driveFileId = uploadResult.fileId;
      }

      // 3. Registro no JSON de Metadados do Setor
      await ctx.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, `💾 ${currentStep} Atualizando metadados JSON...`);
      const metadataRecords = await readDriveJson(sectorFolderId, "metadata.json");
      const userName = ctx.from.username || ctx.from.first_name || 'Desconhecido';
      const dtStr = new Date(item.timestamp * 1000).toISOString();

      const newRecord = {
        fileName: item.type === 'photo' ? `${item.timestamp}_evidencia.jpg` : 'nota.txt',
        driveFileId,
        driveUrl,
        timestamp: dtStr,
        inspector: userName,
        location: localLocation,
        inspectorComment: comentario,
        aiAnalysis: aiAnalysis || "Análise indisponível"
      };

      metadataRecords.unshift(newRecord); // Novo registro no topo
      await writeDriveJson(sectorFolderId, "metadata.json", metadataRecords);

      // 4. Registro no Google Sheets (Aba do Setor)
      await ctx.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, `📊 ${currentStep} Registrando na planilha...`);
      const tabName = await findOrCreateSheetTab(spreadsheetId, sectorName);
      
      const aiCommentStr = aiAnalysis 
        ? `CRITICIDADE: ${aiAnalysis.criticidade} | FALHA: ${aiAnalysis.falha} | DIRETRIZ: ${aiAnalysis.diretriz}`
        : "N/A";

      const sheetRow = [
        dtStr,
        userName,
        newRecord.fileName,
        driveUrl,
        comentario,
        aiCommentStr
      ];

      await appendToSheetTab(spreadsheetId, tabName, sheetRow);

      // Remove com segurança o item processado da sessão original
      ctx.session.mediaBuffer.shift();
    }

    
    await ctx.telegram.editMessageText(
      statusMsg.chat.id, 
      statusMsg.message_id, 
      undefined, 
      `✅ \`${bufferLength}\` arquivos sincronizados e analisados!\n\n📂 **Pasta do Tópico:** [Acessar](https://drive.google.com/drive/folders/${topicFolderId})\n📊 **Planilha:** [Acessar](https://docs.google.com/spreadsheets/d/${spreadsheetId})\n\nSua sessão em \`${ctx.session.currentLocation}\` continua ativa.`, 
      { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } }
    );

  } catch(error: any) {
    console.error("Falha ao subir dados:", error);
    await ctx.reply(`❌ Ocorreu um erro no processo Cloud: ${error.message}`);
  }
});

// --- LISTENER DE EVIDÊNCIAS PASSIVO ---

// Ao receber foto
bot.on(message('photo'), async (ctx) => {
  const loc = ctx.session?.currentLocation;
  if (!loc) {
    return ctx.reply('⚠️ Você precisa definir o setor antes de enviar evidências!\nDigite o comando /setor.');
  }

  // Pegar a foto de maior resolução
  const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
  const caption = (ctx.message as any).caption || '';
  
  ctx.session.mediaBuffer.push({
    type: 'photo',
    file_id: fileId,
    caption: caption,
    timestamp: ctx.message.date,
    location: loc
  });

  await ctx.reply('📸 Mídia salva na RAM do InspectAI! (Envie /sincronizar para finalizar)');
});

// Ao receber texto (que não seja comandos)
bot.on(message('text'), async (ctx) => {
  const loc = ctx.session?.currentLocation;
  if (!loc) {
    return ctx.reply('⚠️ Você precisa definir o setor antes de enviar comentários/evidências!\nDigite o comando /setor.');
  }

  ctx.session.mediaBuffer.push({
    type: 'text',
    text: ctx.message.text,
    timestamp: ctx.message.date,
    location: loc
  });

  await ctx.reply('💬 Comentário avulso salvo na RAM do InspectAI! (Envie /sincronizar para finalizar)');
});

// Catch errors gracefully
bot.catch((err, ctx) => {
  console.error(`Status Error em ${ctx.updateType}:`, err);
});
