import { logger } from "@/backend/utils/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/backend/agent/state";
import { REASONING_MODEL } from "@/backend/agent/models";
import { ROLES, TOOL_NAMES, STAGES, NODE_NAMES } from "@/shared/jarvish.constants";;
import { mapStateToGeminiHistory } from "../utils";
import { AIMessage } from "@langchain/core/messages";
import { 
  webSearchDeclaration, 
  fetchWebPageDeclaration, 
  readPdfDeclaration, 
  queryAttachmentsDeclaration
} from "@/backend/agent/nodes/registry";
import {
  createClarificationBlockContent,
  formatConfidenceStatus,
  validateOrRepairNodeResponse,
} from "@/backend/agent/validation/node-response.validator";

/**
 * Node: Research Worker
 * Specialized in web search and document analysis.
 */
export async function researchWorkerNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Research Worker");
  try {
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
          webSearchDeclaration,
          fetchWebPageDeclaration,
          readPdfDeclaration,
          queryAttachmentsDeclaration
        ]
      }]
    });

    const history = mapStateToGeminiHistory(state);
    const lastMsg = history.pop();
    
    if (!lastMsg) throw new Error("No messages found for Research Worker.");

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMsg.parts);
    const response = result.response;
    logger.debug({ sessionId: state.sessionId, rawResponse: response.text() }, "Research Worker | Raw response text");
    const toolCalls = response.functionCalls();
    let content = response.text();
    let confidence = toolCalls?.length ? 100 : 0;
    let validationReason = toolCalls?.length
      ? "Research Worker returned tool calls."
      : "Research Worker response has not been validated yet.";

    if (content && !toolCalls?.length) {
      const validation = await validateOrRepairNodeResponse(content, async (repairPrompt) => {
        logger.warn({ sessionId: state.sessionId }, "Research Worker response failed validation; requesting repair");
        const repairResult = await chat.sendMessage(repairPrompt);
        return repairResult.response.text();
      });

      content = validation.content;
      confidence = validation.confidence;
      validationReason = validation.reason;
    } else if (toolCalls?.length) {
      logger.debug({ sessionId: state.sessionId, toolCallsCount: toolCalls.length }, "Research Worker requested tools");
    } else {
      content = createClarificationBlockContent("Research Worker returned no content and no tool calls.");
      confidence = 0;
      validationReason = "Research Worker returned no content and no tool calls.";
    }
    
    return {
      messages: [new AIMessage({
        content,
        tool_calls: toolCalls,
        name: "research_worker"
      })],
      lastWorker: NODE_NAMES.RESEARCH_WORKER,
      metadata: {
        stage: STAGES.RESEARCH,
        status: formatConfidenceStatus("Research Worker is investigating...", confidence, validationReason),
        confidence,
        validationReason,
      }
    };
  } catch (error) {
    logger.error({ sessionId: state.sessionId, error }, "Node: Research Worker | Error during processing");
    throw error;
  }
}
