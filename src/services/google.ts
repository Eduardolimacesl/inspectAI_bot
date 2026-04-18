import { google, drive_v3, sheets_v4 } from 'googleapis';
import dotenv from 'dotenv';
import stream from 'stream';
import axios from 'axios';

dotenv.config();

let authClient: any = null;
let driveService: drive_v3.Drive | null = null;
let sheetsService: sheets_v4.Sheets | null = null;

const initGoogleServices = () => {
  if (driveService && sheetsService) return;

  const base64Creds = process.env.GOOGLE_CREDENTIALS_BASE64;
  if (!base64Creds) {
    console.warn("⚠️ GOOGLE_CREDENTIALS_BASE64 is missing. Google API will fail.");
    return;
  }

  try {
    const credText = Buffer.from(base64Creds, 'base64').toString('utf8');
    const credentials = JSON.parse(credText);

    authClient = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });

    driveService = google.drive({ version: 'v3', auth: authClient });
    sheetsService = google.sheets({ version: 'v4', auth: authClient });
    
    console.log("✅ Google Services Auth initialized successfully.");
  } catch (error) {
    console.error("❌ Failed to initialize Google Auth:", error);
  }
};

/**
 * Searches for a folder by name inside a parent folder. Returns folder ID or null.
 */
export async function findFolder(folderName: string, parentId: string): Promise<string | null> {
  initGoogleServices();
  if (!driveService) throw new Error("Drive service disconnected.");

  const query = `name = '${folderName}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  
  const res = await driveService.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive'
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id || null;
  }
  return null;
}

export async function createFolder(folderName: string, parentId: string): Promise<string> {
  if (process.env.APPS_SCRIPT_WEBHOOK_URL) {
    try {
      const res = await axios.post(process.env.APPS_SCRIPT_WEBHOOK_URL, {
        action: 'createFolder',
        parentId: parentId,
        folderName: folderName
      });
      if (res.data && res.data.status === 'success') {
        return res.data.folderId;
      }
    } catch (err: any) {
      console.warn("⚠️ Falha ao criar pasta via Webhook, tentando fallback...", err.message);
    }
  }

  // --- TRADICIONAL SERVICE ACCOUNT (Fallback) ---
  initGoogleServices();
  if (!driveService) throw new Error("Drive service disconnected.");

  const res = await driveService.files.create({
    requestBody: {
       name: folderName,
       mimeType: 'application/vnd.google-apps.folder',
       parents: [parentId]
    },
    fields: 'id'
  });

  return res.data.id!;
}

/**
 * Recycles a folder if it exists, or creates it if it doesn't.
 */
export async function findOrCreateFolder(folderName: string, parentId: string): Promise<string> {
  const existing = await findFolder(folderName, parentId);
  if (existing) return existing;
  return await createFolder(folderName, parentId);
}

/**
 * Walks through an array of folder names, creating/finding them sequentially under the rootId.
 */
export async function resolveLocationPath(pathArray: string[], rootId: string): Promise<string> {
   let currentParent = rootId;
   for (const folder of pathArray) {
       currentParent = await findOrCreateFolder(folder, currentParent);
   }
   return currentParent;
}

async function streamToBase64(stream: stream.Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
  });
}

/**
 * Uploads a readable stream to Google Drive. Usa o Webhook do Apps Script para contornar cota de Service Account.
 */
export async function uploadPhotoToDrive(
  fileStream: stream.Readable, 
  fileName: string, 
  parentId: string, 
  itemDescription: string
): Promise<{ driveUrl: string; fileId: string }> {

  if (process.env.APPS_SCRIPT_WEBHOOK_URL) {
    const base64Data = await streamToBase64(fileStream);
    const res = await axios.post(process.env.APPS_SCRIPT_WEBHOOK_URL, {
      parentId: parentId,
      fileName: fileName,
      base64Data: base64Data,
      description: itemDescription
    });

    if (res.data && res.data.status === 'success') {
      return {
        driveUrl: res.data.url || '',
        fileId: res.data.id || '' // Assuming your apps script returns id now, adjust later if needed.
      };
    } else {
      throw new Error(`Erro no Webhook: ${res.data.message}`);
    }
  }

  // --- IMPLEMENTAÇÃO TRADICIONAL SERVICE ACCOUNT (Fallback) ---
  initGoogleServices();
  if (!driveService) throw new Error("Drive service disconnected.");

  const res = await driveService.files.create({
      requestBody: {
          name: fileName,
          parents: [parentId],
          description: itemDescription
      },
      media: {
          body: fileStream
      },
      fields: 'id, webViewLink'
  });

  return {
    driveUrl: res.data.webViewLink || '',
    fileId: res.data.id || ''
  };
}

/**
 * Busca ou cria uma planilha na pasta especificada.
 */
export async function findOrCreateSpreadsheet(name: string, parentId: string): Promise<string> {
  initGoogleServices();
  if (!driveService) throw new Error("Drive service disconnected.");

  const query = `name = '${name}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const res = await driveService.files.list({ q: query, fields: 'files(id)' });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // --- CRIAÇÃO ---
  if (process.env.APPS_SCRIPT_WEBHOOK_URL) {
    const createRes = await axios.post(process.env.APPS_SCRIPT_WEBHOOK_URL, {
      action: 'createSpreadsheet',
      parentId: parentId,
      fileName: name
    });
    if (createRes.data && createRes.data.status === 'success') {
      return createRes.data.fileId;
    }
  }

  // Fallback para Service Account
  const newSheet = await driveService.files.create({
    requestBody: {
      name: name,
      parents: [parentId],
      mimeType: 'application/vnd.google-apps.spreadsheet'
    },
    fields: 'id'
  });

  return newSheet.data.id!;
}

/**
 * Busca ou cria uma aba específica dentro de uma planilha.
 */
export async function findOrCreateSheetTab(spreadsheetId: string, tabName: string): Promise<string> {
  initGoogleServices();
  if (!sheetsService) throw new Error("Sheets service disconnected.");

  const res = await sheetsService.spreadsheets.get({ spreadsheetId });
  const sheet = res.data.sheets?.find(s => s.properties?.title === tabName);

  if (sheet) return tabName;

  await sheetsService.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        addSheet: {
          properties: { title: tabName }
        }
      }]
    }
  });

  return tabName;
}

/**
 * Adiciona múltiplas linhas de dados em uma aba específica em uma única chamada.
 */
export async function appendToSheetTab(spreadsheetId: string, tabName: string, rows: any[][]): Promise<void> {
  initGoogleServices();
  if (!sheetsService) throw new Error("Sheets service disconnected.");

  await sheetsService.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rows
    }
  });
}
