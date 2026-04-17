import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const creds = JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64!, 'base64').toString('utf8'));
  const authClient = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  const driveService = google.drive({ version: 'v3', auth: authClient });
  
  try {
    const file = await driveService.files.get({
      fileId: '1SX53jJdXdwgwGhD63_fjjPayQKePX9BN',
      fields: 'id, name, owners, capabilities, kind, mimeType, size'
    });
    console.log(JSON.stringify(file.data, null, 2));
  } catch (error: any) {
    console.error("Erro na foto:", error.message);
  }
}
check();
