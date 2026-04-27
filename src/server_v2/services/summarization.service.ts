import { GoogleGenerativeAI } from "@google/generative-ai";
import { REASONING_MODEL } from "../agent/models.js";

export async function summarizeSession(history: { role: string, content: string }[]) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ 
    model: REASONING_MODEL,
    systemInstruction: `You are a summarization assistant. Your goal is to provide a concise but comprehensive summary of a research conversation. 
    
    IMPORTANT PROTOCOLS:
    1. LANGUAGE: You MUST generate the summary in the SAME LANGUAGE as the user's primary messages.
    2. DEPTH: Do not just gist the final message. Analyze the entire history to identify key data points, facts, and conclusions discovered at ANY stage of the conversation.
    3. STRUCTURE: Return a JSON object with:
       - 'summaryTitle': A very short, descriptive title.
       - 'userMessage': The core essence of the user's initial inquiry and intent.
       - 'aiAnswer': A synthesis of the most important findings and conclusions from the WHOLE conversation.
    4. ACCURACY: Do not invent information. Only include what was actually discussed.`
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
