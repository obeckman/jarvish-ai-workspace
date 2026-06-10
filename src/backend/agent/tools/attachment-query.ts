import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/backend/agent/state";
import { TOOL_EXECUTION_MODEL } from "@/backend/agent/models";

export async function queryProcessedAttachments(query: string, state: AgentStateType) {
  if (!state.processedAttachments || state.processedAttachments.length === 0) {
    return "No processed attachments found to query.";
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: TOOL_EXECUTION_MODEL });

  const context = state.processedAttachments.map((attachment) =>
    `--- DOCUMENT: ${attachment.name} ---\n${attachment.extractedText}\n`
  ).join("\n\n");

  const prompt = `You are a document search assistant. Using the provided document context, answer the following query. 
  If the information is not in the documents, say so.
  
  CONTEXT:
  ${context}
  
  QUERY: ${query}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
