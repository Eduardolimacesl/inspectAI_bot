import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { analyzeInspectionPhoto } from '../src/services/analysisAi';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testIA() {
  const imagePath = path.join(__dirname, '5116562319340145962_121.jpg');
  const buffer = fs.readFileSync(imagePath);
  console.log("🤖 Testando Gemini com imagem...");
  const result = await analyzeInspectionPhoto(buffer, "Infiltração no teto");
  console.log("Resultado:", JSON.stringify(result, null, 2));
}

testIA();
