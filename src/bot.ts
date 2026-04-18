import { Telegraf, session, Scenes } from 'telegraf';
import { message } from 'telegraf/filters';
import dotenv from 'dotenv';
import axios from 'axios';
import dns from 'dns';
import { resolveLocationPath, uploadPhotoToDrive, findOrCreateSpreadsheet, findOrCreateSheetTab, appendToSheetTab } from './services/google';
import { analyzeInspectionPhoto } from './services/analysisAi';
import sectorWizard, { MyBotContext } from './scenes/sectorWizard';
import stream from 'stream';

dns.setDefaultResultOrder('ipv4first');

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

4️⃣ *Re-inspeção:* Use /reinspecao para entrar no modo de correção. A IA comparará a nova foto com a anterior para fechar o ciclo de falha.

5️⃣ *Cancele ou Resete:* Use /cancelar para limpar o setor atual e as mensagens pendentes na RAM.

💡 *Dica:* O bot mantém o setor na memória até que você o altere ou cancele. Você pode enviar várias fotos e sincronizar tudo no final!

*Comandos:*
/setor - Define a localização
/reinspecao - Alterna modo de re-inspeção (Correção)
/sincronizar - Envia dados para a nuvem
/cancelar - Limpa o buffer atual
/ajuda - Mostra esta explicação`;

  ctx.reply(helpText, { parse_mode: 'Markdown' });
});

bot.command('reinspecao', (ctx) => {
  ctx.session.reinspectionMode = !ctx.session.reinspectionMode;
  const status = ctx.session.reinspectionMode ? "ATIVADO ✅" : "DESATIVADO ❌";
  ctx.reply(`🔄 **Modo Re-inspeção:** ${status}\n\n${ctx.session.reinspectionMode ? "Envie fotos da CORREÇÃO do problema. Elas serão marcadas como evidência de fechamento." : "Voltando ao modo de inspeção normal (identificação de novas falhas)."}`);
});

bot.command('sincronizar', async (ctx) => {
  const bufferLength = ctx.session.mediaBuffer.length;
  
  if (bufferLength === 0) {
    return ctx.reply('📭 Não há nenhuma evidência na fila para sincronizar no momento. Envie fotos ou use /setor.');
  }

  // Verifica se há itens sem localização (Modo Lote pendente)
  const pendingSectors = ctx.session.mediaBuffer.filter(item => !item.location);
  if (pendingSectors.length > 0) {
    return ctx.reply(`⚠️ Você tem ${pendingSectors.length} itens aguardando a definição de um setor.\nUse o comando /setor para definir o destino antes de sincronizar.`);
  }

  const startTime = Date.now();
  const statusMsg = await ctx.reply(`🚀 Iniciando sincronização de ${bufferLength} itens...`);

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

    const topicFolderId = await resolveLocationPath([topicName], rootId);
    const spreadsheetName = `Vistoria_${topicName}`;
    const spreadsheetId = await findOrCreateSpreadsheet(spreadsheetName, topicFolderId);

    // Agrupar por setor para minimizar trocas de pasta/aba
    const groupedBySector: Record<string, any[]> = {};
    for (const item of ctx.session.mediaBuffer) {
      const loc = item.location || "Indefinida";
      if (!groupedBySector[loc]) groupedBySector[loc] = [];
      groupedBySector[loc].push(item);
    }

    const sectors = Object.keys(groupedBySector);
    let processedCount = 0;
    const userName = ctx.from.username || ctx.from.first_name || 'Desconhecido';

    for (const sectorLocation of sectors) {
      const items = groupedBySector[sectorLocation];
      const locationParts = sectorLocation.split('/');
      const sectorName = locationParts[locationParts.length - 1].trim();
      
      const sectorFolderId = await resolveLocationPath(locationParts, topicFolderId);
      const tabName = await findOrCreateSheetTab(spreadsheetId, sectorName);
      
      const sheetRows: any[][] = [];

      // Processar itens do setor em paralelo (chunks de 3 para não estourar rate limit)
      const CHUNK_SIZE = 3;
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        
        await Promise.all(chunk.map(async (item) => {
          processedCount++;
          const currentStep = `(${processedCount}/${bufferLength})`;
          const comentario = item.type === 'photo' ? item.caption : (item.text || "");
          const dtStr = new Date(item.timestamp * 1000).toISOString();

          let driveUrl = "Sincronizado Apenas Texto";
          let driveFileId = "";
          let aiAnalysis = null;

          if (item.type === 'photo') {
            const fileLink = await ctx.telegram.getFileLink(item.file_id);
            const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer', timeout: 30000 });
            let buffer: Buffer | null = Buffer.from(response.data);
            
            // IA e Upload em paralelo para o mesmo item
            const [analysis, upload] = await Promise.all([
              analyzeInspectionPhoto(buffer, comentario),
              (async () => {
                const fileName = `${item.timestamp}_evidencia.jpg`;
                const readable = new stream.PassThrough();
                readable.end(buffer);
                const result = await uploadPhotoToDrive(readable, fileName, sectorFolderId, `${sectorLocation} | ${topicName} | ${comentario}`);
                return result;
              })()
            ]);

            aiAnalysis = analysis;
            driveUrl = upload.driveUrl;
            driveFileId = upload.fileId;
            
            // Liberar buffer explicitamente
            buffer = null;
          }

          const aiCommentStr = aiAnalysis 
            ? `CRITICIDADE: ${aiAnalysis.criticidade} | FALHA: ${aiAnalysis.falha} | DIRETRIZ: ${aiAnalysis.diretriz}`
            : "N/A";

          sheetRows.push([
            dtStr,
            userName,
            item.type === 'photo' ? `${item.timestamp}_evidencia.jpg` : 'nota.txt',
            driveUrl,
            comentario,
            aiCommentStr,
            driveFileId,
            sectorLocation,
            item.isReinspection ? "RE-INSPEÇÃO" : "ORIGINAL"
          ]);

          // Atualizar UI a cada 3 itens ou no último
          if (processedCount % 3 === 0 || processedCount === bufferLength) {
            await ctx.telegram.editMessageText(statusMsg.chat.id, statusMsg.message_id, undefined, `⏳ ${currentStep} Processando mídias e IA...`).catch(() => {});
          }
        }));
      }

      // Batch Update para o setor
      if (sheetRows.length > 0) {
        await appendToSheetTab(spreadsheetId, tabName, sheetRows);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    ctx.session.mediaBuffer = []; // Limpa buffer após sucesso total
    
    await ctx.telegram.editMessageText(
      statusMsg.chat.id, 
      statusMsg.message_id, 
      undefined, 
      `✅ \`${bufferLength}\` itens sincronizados em \`${duration}s\`!\n\n📂 **Pasta:** [Acessar](https://drive.google.com/drive/folders/${topicFolderId})\n📊 **Planilha:** [Acessar](https://docs.google.com/spreadsheets/d/${spreadsheetId})`, 
      { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } }
    );

  } catch(error: any) {
    console.error("Falha na sincronização otimizada:", error);
    await ctx.reply(`❌ Erro na sincronização: ${error.message}`);
  }
});

// --- LISTENER DE EVIDÊNCIAS PASSIVO ---

// Ao receber foto
bot.on(message('photo'), async (ctx) => {
  const loc = ctx.session?.currentLocation;
  
  // Pegar a foto de maior resolução
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const fileId = photo.file_id;
  const fileUniqueId = photo.file_unique_id;
  const caption = (ctx.message as any).caption || '';
  
  // Verifica duplicidade no buffer atual para o mesmo setor
  const isDuplicate = ctx.session.mediaBuffer.some(item => 
    item.type === 'photo' && 
    item.file_unique_id === fileUniqueId && 
    item.location === loc
  );

  if (isDuplicate) {
    return ctx.reply(`⚠️ **Foto duplicada detectada!**\nEsta imagem já foi adicionada ao setor: \`${loc || 'Modo Lote'}\` e não será repetida.`);
  }

  ctx.session.mediaBuffer.push({
    type: 'photo',
    file_id: fileId,
    file_unique_id: fileUniqueId,
    caption: caption,
    timestamp: (ctx.message as any).forward_date || ctx.message.date,
    location: loc, // Pode ser undefined (Modo Lote)
    isReinspection: ctx.session.reinspectionMode || false
  });

  if (!loc) {
    await ctx.reply('📦 **Mídia salva em Modo Lote!**\nVocê ainda não definiu um setor. Envie /setor para dar um destino a esta e outras fotos pendentes.');
  } else {
    await ctx.reply(`📸 Mídia salva para o setor: \`${loc}\`\n(Envie /sincronizar para finalizar)`);
  }
});

// Ao receber texto (que não seja comandos)
bot.on(message('text'), async (ctx) => {
  const loc = ctx.session?.currentLocation;
  
  ctx.session.mediaBuffer.push({
    type: 'text',
    text: ctx.message.text,
    timestamp: ctx.message.date,
    location: loc, // Pode ser undefined
    isReinspection: ctx.session.reinspectionMode || false
  });

  if (!loc) {
    await ctx.reply('📦 **Comentário salvo em Modo Lote!**\nLembre-se de definir o /setor antes de sincronizar.');
  } else {
    await ctx.reply('💬 Comentário avulso salvo na RAM!');
  }
});

// Catch errors gracefully
bot.catch((err, ctx) => {
  console.error(`Status Error em ${ctx.updateType}:`, err);
});
