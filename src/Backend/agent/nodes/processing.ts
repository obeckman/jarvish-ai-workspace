import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/Backend/agent/state";
import { PROCESSING_MODEL } from "@/Backend/agent/models";
import { ROLES, STAGES, TOOL_NAMES } from "@/shared/jarvish.constants";
import { searchWeb } from "../../services/tools/search.service";
import { readFile } from "../../services/tools/file.service";
import { AIMessage } from "@langchain/core/messages";
import { logger } from "@/Backend/utils/logger";

/**
 * Node: Attachment & Shadow Tooling Processing
 * Responsibilities:
 * 1. Identify and process new attachments.
 * 2. Shadow Tooling: Predict and pre-execute tools (like web search) to reduce latency.
 * 3. Store clean extractions and pre-fetched data in the state.
 */
export async function processingNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Processing");
  const attachments = state.attachments || [];
  const processedCount = state.processedAttachments?.length || 0;
  const newAttachments = attachments.slice(processedCount);
  
  const lastMessage = state.messages[state.messages.length - 1];
  const query = typeof lastMessage.content === 'string' ? lastMessage.content : "";

  logger.info({ sessionId: state.sessionId }, "Starting background analysis");
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: PROCESSING_MODEL });
  
  const processedResults: any[] = [];
  const shadowResults: string[] = [];

  // 1. Process New Attachments
  for (const att of newAttachments) {
    try {
      const prompt = `Extract all relevant text and data from this file. 
      Format it into a clean, highly readable, and structured text version. 
      File Name: ${att.name}
      MIME Type: ${att.mimeType}`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { data: att.data, mimeType: att.mimeType } }
      ]);
      
      processedResults.push({
        name: att.name,
        mimeType: att.mimeType,
        extractedText: result.response.text(),
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error({ sessionId: state.sessionId, attachmentName: att.name, error }, "Processing Node Error");
    }
  }

  // 2. Shadow Tooling: Predict and pre-execute
  if (query && query.length > 10) {
    try {
      const shadowPrompt = `Analyze the user's query and predict if specific tools will DEFINITELY be needed.
      Query: "${query}"
      
      Predict ONE of:
      - WEB_SEARCH: If they ask for news, current events, or external info.
      - READ_FILE: If they mention a specific file path or "this code".
      - NONE: If it's a general question or doesn't need external data.
      
      Output ONLY the tool name and the suggested argument (query or path).
      Example: WEB_SEARCH | latest nvidia stock price
      Example: READ_FILE | src/App.tsx`;

      const shadowResult = await model.generateContent(shadowPrompt);
      const [tool, arg] = shadowResult.response.text().split('|').map(s => s.trim());

      if (tool === 'WEB_SEARCH' && arg) {
        logger.info({ sessionId: state.sessionId, arg }, "Shadow Tooling: Pre-executing web search");
        const searchResult = await searchWeb({ query: arg });
        shadowResults.push(`[Shadow Search Result] ${String(searchResult).substring(0, 1000)}`);
      } else if (tool === 'READ_FILE' && arg) {
        logger.info({ sessionId: state.sessionId, arg }, "Shadow Tooling: Pre-reading file");
        const fileResult = await readFile({ path: arg });
        shadowResults.push(`[Shadow File Content: ${arg}] ${String(fileResult).substring(0, 1000)}`);
      }
    } catch (e) {
      logger.warn({ sessionId: state.sessionId, error: e }, "Shadow Tooling Warning");
    }
  }

  const messages = [];
  if (processedResults.length > 0 || shadowResults.length > 0) {
    messages.push(new AIMessage({
      content: `Background processing complete. ${processedResults.length} files processed. ${shadowResults.length} shadow tools executed.`,
      name: ROLES.REASONING
    }));
  }

  logger.info({ sessionId: state.sessionId }, `[Agent Graph] Node: Processing | Background analysis complete. Processed ${processedResults.length} attachments. Shadow tooling executed: ${shadowResults.length}.`);
  return {
    processedAttachments: processedResults,
    researchNotes: shadowResults,
    messages,
    metadata: { 
      stage: STAGES.RESEARCH, 
      status: `Background analysis finished.` 
    }
  };
}
