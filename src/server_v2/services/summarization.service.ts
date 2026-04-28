import { GoogleGenerativeAI } from "@google/generative-ai";
import { REASONING_MODEL } from "@/server_v2/agent/models";

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
  const text = response.text() || "";
  console.log(`[Summarization] AI Response text length: ${text.length}`);
  
  try {
    // Clean up potential markdown code blocks
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    console.log(`[Summarization] Successfully parsed JSON for session.`);
    return parsed;
  } catch (e) {
    console.error(`[Summarization Error] Failed to parse JSON. Raw text preview: ${text.substring(0, 100)}...`);
    return {
      summaryTitle: "Conversation Summary",
      userMessage: history.find(m => {
        const r = (m.role || "").toLowerCase();
        return r === 'user' || r === 'human';
      })?.content?.substring(0, 100) || "N/A",
      aiAnswer: [...history].reverse().find(m => {
        const r = (m.role || "").toLowerCase();
        return r === 'agent' || r === 'assistant' || r === 'model' || r === 'ai';
      })?.content?.substring(0, 100) || "N/A"
    };
  }
}
