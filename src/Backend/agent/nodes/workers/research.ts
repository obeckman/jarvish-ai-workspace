import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/Backend/agent/state";
import { REASONING_MODEL } from "@/Backend/agent/models";
import { ROLES, TOOL_NAMES, STAGES, NODE_NAMES } from "@/Backend/agent/constants";
import { mapStateToGeminiHistory } from "../utils";
import { 
  webSearchDeclaration, 
  fetchWebPageDeclaration, 
  readPdfDeclaration, 
  queryAttachmentsDeclaration
} from "@/Backend/agent/nodes/registry";

/**
 * Node: Research Worker
 * Specialized in web search and document analysis.
 */
export async function researchWorkerNode(state: AgentStateType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  // Format processed attachments for context
  const attachmentsContext = state.processedAttachments?.length > 0
    ? state.processedAttachments.map(a => `[Document: ${a.name}]\n${a.extractedText?.substring(0, 1000)}...`).join('\n\n')
    : "No processed documents available.";

  const systemInstruction = `You are the Research Worker, a specialist in CROSS-TOOL SYNTHESIS and comparative analysis.
  
  Your job is to find information using web search, document analysis, and local file tools.
  
  STRICT PROTOCOLS:
  1. CROSS-SYNTHESIS MANDATE: If the task involves multiple data sources (e.g., a PDF link and a Google Doc), you MUST fetch both and provide a synthesized comparison.
  2. ZERO HALLUCINATION: If a search or query yields no info, say so.
  3. CITATION MANDATE: Always include the source for every fact.
  4. COMPARISON TABLES: When comparing data, prefer outputting Markdown tables for clarity.

  AVAILABLE TOOLS:
  - web_search: For general internet search.
  - fetch_web_page: For reading specific URLs.
  - read_pdf: For extracting text from PDF links.
  - query_attachments: For searching through already uploaded files.

  PROCESSED DOCUMENTS (EXTRACTED TEXT):
  ${attachmentsContext}`;

  const model = genAI.getGenerativeModel({
    model: REASONING_MODEL,
    systemInstruction,
    tools: [{
      functionDeclarations: [
        webSearchDeclaration as any,
        fetchWebPageDeclaration as any,
        readPdfDeclaration as any,
        queryAttachmentsDeclaration as any
      ]
    }]
  });

  const history = mapStateToGeminiHistory(state);
  const lastMsg = history.pop();
  
  if (!lastMsg) throw new Error("No messages found for Research Worker.");

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMsg.parts);
  const response = result.response;
  
  return {
    messages: [{
      role: ROLES.MODEL,
      content: response.text(),
      tool_calls: response.functionCalls(),
      name: "research_worker"
    }],
    lastWorker: NODE_NAMES.RESEARCH_WORKER,
    metadata: { stage: STAGES.RESEARCH, status: "Research Worker is investigating..." }
  };
}
