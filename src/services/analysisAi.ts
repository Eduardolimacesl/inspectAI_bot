import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

export interface AiAnalysisResult {
  falha: string;
  diretriz: string;
  criticidade: 'ALTA' | 'MEDIA' | 'BAIXA';
  justificativa_risco: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Analisa uma foto de inspeção usando o Gemini 2.5 Flash Lite Preview.
 */
export async function analyzeInspectionPhoto(
  imageBuffer: Buffer,
  caption: string
): Promise<AiAnalysisResult | null> {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY ausente no ambiente.");
    return null;
  }

  try {
    // Modelo solicitado: gemini-2.5-flash-lite-preview-04-17
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      }
    });

    const prompt = `Você é um Engenheiro Sênior de Fiscalização. Analise a imagem da obra executada e o seguinte comentário do inspetor de campo: "${caption}", de muita importância para o comentário do inspetor de campo. 
    Retorne EXCLUSIVAMENTE um objeto JSON estruturado com as seguintes chaves:
    {
      "falha": "Descrição técnica e objetiva do erro de execução visível",
      "diretriz": "Procedimento técnico normativo esperado para o reparo",
      "criticidade": "ALTA, MEDIA ou BAIXA",
      "justificativa_risco": "Breve justificativa estrutural ou funcional para a criticidade escolhida"
    }`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: "image/jpeg"
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Fallback de segurança contra formatação markdown do Gemini
    const cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as AiAnalysisResult;
  } catch (error) {
    console.error("❌ Erro na análise do Gemini:", error);
    return null;
  }
}
