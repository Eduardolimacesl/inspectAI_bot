import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
async function run() {
  const models = await genAI.getModels();
  models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
}
// Try with direct REST call if SDK doesn't support getModels:
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`)
  .then(r => r.json())
  .then(d => console.log(d.models?.map((m: any) => m.name)));
