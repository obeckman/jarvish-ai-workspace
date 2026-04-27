import { GoogleGenerativeAI } from "@google/generative-ai";
import { REASONING_MODEL } from "../agent/models.js";

export async function summarizeSession(history: { role: string, content: string }[]) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ 
    model: REASONING_MODEL,
    systemInstruction: "You are a summarization assistant. Your goal is to provide a concise summary of a conversation history. You MUST return a JSON object with three fields: 'summaryTitle' (a short title), 'userMessage' (the core of the user's initial request), and 'aiAnswer' (the gist of the final AI response). Do not invent information. Keep it short but important."
  });

  const prompt = `Summarize the following conversation history:
  ${JSON.stringify(history)}
  
  Return ONLY a JSON object:
  {
    "summaryTitle": "...",
    "userMessage": "...",
    "aiAnswer": "..."
  }`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  try {
    // Clean up potential markdown code blocks
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse summary JSON:", text);
    return {
      summaryTitle: "Conversation Summary",
      userMessage: history.find(m => m.role === 'user')?.content?.substring(0, 100) || "N/A",
      aiAnswer: history.reverse().find(m => m.role === 'agent' || m.role === 'assistant' || m.role === 'model')?.content?.substring(0, 100) || "N/A"
    };
  }
}
