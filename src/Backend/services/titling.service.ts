import { GoogleGenerativeAI } from "@google/generative-ai";
import { REASONING_MODEL } from "@/Backend/agent/models";

/**
 * Generates a concise, descriptive title for a research session based on the initial query.
 */
export async function generateTitle(query: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ 
    model: REASONING_MODEL,
    systemInstruction: `You are a titling assistant. Your goal is to provide a very short (max 5 words), professional title for a research inquiry. 
    Do not use quotes, punctuation, or filler words like "Research on...". 
    Focus on the core intent.`
  });

  const prompt = `Generate a short title for this research query: "${query}"`;

  try {
    const result = await model.generateContent(prompt);
    const title = result.response.text()?.trim() || "New Research";
    // Clean up any extra quotes or markdown
    return title.replace(/['"]+/g, '').substring(0, 50);
  } catch (e) {
    console.error(`[Titling Error]`, e);
    return query.substring(0, 30) + "...";
  }
}
