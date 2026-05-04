import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/Backend/agent/state";
import { PROCESSING_MODEL } from "@/Backend/agent/models";
import { ROLES, STAGES, TOOL_NAMES } from "@/Backend/agent/constants";
import { searchWeb } from "../../services/tools/search.service";
import { readFile } from "../../services/tools/file.service";

/**
 * Node: Attachment & Shadow Tooling Processing
 * Responsibilities:
 * 1. Identify and process new attachments.
 * 2. Shadow Tooling: Predict and pre-execute tools (like web search) to reduce latency.
 * 3. Store clean extractions and pre-fetched data in the state.
 */
export async function processingNode(state: AgentStateType) {
  const attachments = state.attachments || [];
  const processedCount = state.processedAttachments?.length || 0;
  const newAttachments = attachments.slice(processedCount);
  
  const lastMessage = state.messages[state.messages.length - 1];
  const query = typeof lastMessage.content === 'string' ? lastMessage.content : "";

  console.log(`[Agent Graph] Node: Processing | Starting background analysis.`);
  
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
      console.error(`[Processing Node Error: ${att.name}]`, error);
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
        console.log(`[Shadow Tooling] Pre-executing web search: ${arg}`);
        const searchResult = await searchWeb({ query: arg });
        shadowResults.push(`[Shadow Search Result] ${String(searchResult).substring(0, 1000)}`);
      } else if (tool === 'READ_FILE' && arg) {
        console.log(`[Shadow Tooling] Pre-reading file: ${arg}`);
        const fileResult = await readFile({ path: arg });
        shadowResults.push(`[Shadow File Content: ${arg}] ${String(fileResult).substring(0, 1000)}`);
      }
    } catch (e) {
      console.warn("[Shadow Tooling Warning]", e);
    }
  }

  return {
    processedAttachments: processedResults,
    researchNotes: shadowResults,
    messages: [{
      role: ROLES.REASONING,
      content: `Background processing complete. ${processedResults.length} files processed. ${shadowResults.length} shadow tools executed.`
    }],
    metadata: { 
      stage: STAGES.RESEARCH, 
      status: `Background analysis finished.` 
    }
  };
}
