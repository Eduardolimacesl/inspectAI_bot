/**
 * Google Apps Script Webhook para o ecossistema InspectAI.
 * 
 * PROPÓSITO:
 * Este script serve como uma ponte para contornar as severas limitações de armazenamento
 * de Contas de Serviço (Service Accounts) da Google (limite de 0 bytes). 
 * Ele recebe chamadas HTTP POST vindas do backend (Bot) - especificamente do `src/services/google.ts` -
 * e executa a solicitação sob a titularidade e cota grátis (15 GB) da conta Google de origem.
 * 
 * AÇÕES SUPORTADAS:
 * 1. createFolder: Criação de pastas aninhadas.
 * 2. createSpreadsheet: Criação e manuseio da Planilha Vistoria.
 * 3. writeJson: Criação dos manifestos JSON da Vistoria.
 * 4. Padrão (Sem Action): Upload de evidências/fotos com descrições atreladas.
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    // 1. AÇÃO: CRIAR PASTA
    if (action === 'createFolder') {
      var parentFolder = DriveApp.getFolderById(data.parentId);
      var newFolder = parentFolder.createFolder(data.folderName);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        folderId: newFolder.getId()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. AÇÃO: CRIAR PLANILHA (Spreadsheet)
    else if (action === 'createSpreadsheet') {
      // O Google cria planilhas direto na raiz por padrão, nós criamos e depois movemos
      var ss = SpreadsheetApp.create(data.fileName);
      var file = DriveApp.getFileById(ss.getId());
      var parentFolder = DriveApp.getFolderById(data.parentId);
      
      file.moveTo(parentFolder);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        fileId: file.getId()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. AÇÃO: ESCREVER ARQUIVO JSON
    else if (action === 'writeJson') {
      var parentFolder = DriveApp.getFolderById(data.parentId);
      
      // Apaga a versão antiga se existir
      var existing = parentFolder.getFilesByName(data.fileName);
      while (existing.hasNext()) {
        existing.next().setTrashed(true);
      }
      
      // Cria o novo JSON
      var blob = Utilities.newBlob(data.jsonContent, 'application/json', data.fileName);
      var newFile = parentFolder.createFile(blob);
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        fileId: newFile.getId()
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 4. FALLBACK: UPLOAD DE FOTOS (quando não tem "action" explícito)
    else {
      var parentFolder = DriveApp.getFolderById(data.parentId);
      var decoded = Utilities.base64Decode(data.base64Data);
      var blob = Utilities.newBlob(decoded, 'image/jpeg', data.fileName);
      var newFile = parentFolder.createFile(blob);
      
      if (data.description) {
        newFile.setDescription(data.description);
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        id: newFile.getId(),
        url: newFile.getUrl()
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch(err) {
    // Caso de erro do Google ou campos errados, retornamos formato JSON padronizado
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
