import { GoogleGenerativeAI } from "@google/generative-ai";
import { REASONING_MODEL } from "@/backend/agent/models";
import { ROLES } from "@/shared/jarvish.constants";
import { messageContentToPlainText } from "@/shared/messageContent";
import { logger } from '@/backend/utils/logger';
import { getGeminiErrorDetails } from "@/backend/services/gemini-error";

export async function summarizeSession(history: { role: string, content: string }[]) {
  if (process.env.ARCHIVE_AI_ENRICHMENT_ENABLED !== "true") {
    return createFallbackSummary(history);
  }

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

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text() || "";
    // Clean up potential markdown code blocks
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return normalizeSummary(parsed);
  } catch (e) {
    logger.warn({ error: getGeminiErrorDetails(e) }, "[Summarization Warning] Falling back to deterministic summary.");
    return createFallbackSummary(history);
  }
}

function createFallbackSummary(history: { role: string, content: string }[]) {
  return {
    summaryTitle: "Conversation Summary",
    userMessage: messageContentToPlainText(history.find(m => {
      const r = (m.role || "");
      return r === ROLES.USER || r === ROLES.HUMAN;
    })?.content).substring(0, 100) || "N/A",
    aiAnswer: messageContentToPlainText([...history].reverse().find(m => {
      const r = (m.role || "");
      return r === ROLES.AGENT || r === ROLES.ASSISTANT || r === ROLES.MODEL || r === "ai";
    })?.content).substring(0, 100) || "N/A"
  };
}

function normalizeSummary(summary: { summaryTitle?: unknown; userMessage?: unknown; aiAnswer?: unknown }) {
  return {
    summaryTitle: messageContentToPlainText(summary.summaryTitle) || "Conversation Summary",
    userMessage: messageContentToPlainText(summary.userMessage) || "N/A",
    aiAnswer: messageContentToPlainText(summary.aiAnswer) || "N/A",
  };
}
