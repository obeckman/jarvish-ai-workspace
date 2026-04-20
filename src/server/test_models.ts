import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  try {
    const models = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-pro-latest',
      'gemini-2.0-flash-lite'
    ];
    
    console.log("Testing 2026-era model availability...");
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("test");
        console.log(`✅ ${modelName} is AVAILABLE: ${result.response.text().substring(0, 30)}...`);
      } catch (e: any) {
        console.log(`❌ ${modelName} failed: ${e.message}`);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

listModels();
