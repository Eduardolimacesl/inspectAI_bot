import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import stream from 'stream';
import { 
  resolveLocationPath, 
  uploadPhotoToDrive, 
  readDriveJson, 
  writeDriveJson, 
  findOrCreateSpreadsheet, 
  findOrCreateSheetTab, 
  appendToSheetTab 
} from '../src/services/google';
import { analyzeInspectionPhoto } from '../src/services/analysisAi';

// Carrega as chaves (.env da pasta bot)
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runPipelineTest() {
  console.log("🚀 Iniciando Teste de Integração: Pipeline Completo (IA + Drive + Sheets)");
  
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const imagePath = path.join(__dirname, '5116562319340145962_121.jpg');
  
  if (!rootId) throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID não configurado.");
  if (!fs.existsSync(imagePath)) throw new Error(`Imagem de teste não encontrada em: ${imagePath}`);

  try {
    // 0. Preparação dos dados
    const topicName = "OBRA_TESTE_ALTA_RENDA";
    const localLocation = "Bloco A / 10 Andar / Hall Social";
    const inspectorComment = "Piso de mármore com manchas amareladas e rejunte falho.";
    const timestamp = Math.floor(Date.now() / 1000);
    const userName = "Teste_Integracao_Pipeline";

    // 1. ANÁLISE IA
    console.log("\n🧠 Passo 1: Analisando com Gemini 2.5 Flash Lite...");
    const imageBuffer = fs.readFileSync(imagePath);
    const aiResult = await analyzeInspectionPhoto(imageBuffer, inspectorComment);
    
    if (aiResult) {
      console.log("✅ IA respondeu com sucesso:");
      console.log(`   🔸 Criticidade: ${aiResult.criticidade}`);
      console.log(`   🔸 Falha: ${aiResult.falha}`);
      console.log(`   🔸 Diretriz: ${aiResult.diretriz}`);
    } else {
      console.warn("⚠️ IA não retornou resultado. Prosseguindo teste sem IA...");
    }

    // 2. RESOLUÇÃO DE PASTAS
    console.log("\n📁 Passo 2: Resolvendo hierarquia de pastas...");
    const topicFolderId = await resolveLocationPath([topicName], rootId);
    const sectorFolderId = await resolveLocationPath(localLocation.split(' / '), topicFolderId);
    console.log(`✅ Pasta do setor garantida: ${sectorFolderId}`);

    // 3. UPLOAD DA FOTO
    console.log("\n📤 Passo 3: Fazendo upload da imagem para o Drive...");
    const fileName = `${timestamp}_evidencia_teste.jpg`;
    
    const readable = new stream.PassThrough();
    readable.end(imageBuffer);
    
    const uploadRes = await uploadPhotoToDrive(readable, fileName, sectorFolderId, inspectorComment);
    console.log(`✅ Upload concluído! URL: ${uploadRes.driveUrl}`);

    // 4. METADATA JSON
    console.log("\n💾 Passo 4: Atualizando metadata.json no setor...");
    const currentMetadata = await readDriveJson(sectorFolderId, "metadata.json");
    
    const newEntry = {
      fileName,
      driveFileId: uploadRes.fileId,
      driveUrl: uploadRes.driveUrl,
      timestamp: new Date(timestamp * 1000).toISOString(),
      inspector: userName,
      location: localLocation,
      inspectorComment,
      aiAnalysis: aiResult || "Análise indisponível"
    };

    currentMetadata.unshift(newEntry);
    await writeDriveJson(sectorFolderId, "metadata.json", currentMetadata);
    console.log("✅ metadata.json atualizado no Drive.");

    // 5. GOOGLE SHEETS
    console.log("\n📊 Passo 5: Registrando na planilha da edificação...");
    const spreadsheetId = await findOrCreateSpreadsheet(`Vistoria_${topicName}`, topicFolderId);
    const sectorTab = localLocation.split(' / ').pop()!.trim();
    await findOrCreateSheetTab(spreadsheetId, sectorTab);
    
    const aiCommentStr = aiResult 
      ? `CRITICIDADE: ${aiResult.criticidade} | FALHA: ${aiResult.falha} | DIRETRIZ: ${aiResult.diretriz}`
      : "Processamento sem IA";

    const row = [
      newEntry.timestamp,
      userName,
      fileName,
      uploadRes.driveUrl,
      inspectorComment,
      aiCommentStr
    ];

    await appendToSheetTab(spreadsheetId, sectorTab, row);
    console.log(`✅ Registro adicionado na aba [${sectorTab}] da planilha [${spreadsheetId}]`);

    console.log("\n✨ TESTE DE PIPELINE FINALIZADO COM SUCESSO! ✨");
    console.log(`🔗 Verifique os resultados na pasta do tópico: https://drive.google.com/drive/folders/${topicFolderId}`);

  } catch (error) {
    console.error("\n❌ FALHA NO TESTE DO PIPELINE:");
    console.error(error);
  }
}

runPipelineTest();
