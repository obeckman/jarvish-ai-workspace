import { logger } from "@/backend/utils/logger";
import { GoogleGenerativeAI, SchemaType, type Part } from "@google/generative-ai";
import { AgentStateType } from "@/backend/agent/state";
import { REASONING_MODEL } from "@/backend/agent/models";
import { STAGES, BLOCK_TYPES, NODE_NAMES } from "@/shared/jarvish.constants";;
import { mapStateToGeminiHistory } from "./utils";
import { AIMessage } from "@langchain/core/messages";
import { HumanMessage } from "@langchain/core/messages";
import { getAgentMessageName } from "@/backend/agent/contracts/message.contract";
import {
  createClarificationBlockContent,
  formatConfidenceStatus,
  validateOrRepairNodeResponse,
} from "@/backend/agent/validation/node-response.validator";
import { createGeminiErrorBlockContent, getGeminiErrorDetails } from "@/backend/services/gemini-error";
/**
 * Node: Supervisor
 * Responsibilities:
 * 1. Analyze user intent.
 * 2. Delegate to specialized workers (Research, Google, System).
 * 3. Synthesize final answers from worker findings.
 */
export async function supervisorNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Supervisor");
  try{
    const lastMessage = state.messages[state.messages.length - 1];
    const lastMessageName = getAgentMessageName(lastMessage);

    // If the last message is from a worker, it's the final answer for this turn.
    if (lastMessageName === NODE_NAMES.CODER_WORKER || lastMessageName === NODE_NAMES.RESEARCH_WORKER || lastMessageName === NODE_NAMES.GOOGLE_WORKER) {
      logger.debug({ sessionId: state.sessionId, workerName: lastMessageName }, "Worker response detected. Ending turn.");
      return {}; // Return empty object to avoid re-broadcasting the message.
    }
  logger.info({ sessionId: state.sessionId, messages: state.messages }, "[Agent Graph] Node: Supervisor | State messages param:");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  // Format memories for context
  const memoriesText = state.memories.length > 0 
    ? state.memories.map(m => `- ${m.text}`).join('\n')
    : "No relevant verified memories found.";

  const systemInstruction = `You are the Jarvish Supervisor, a HIGH-ACCURACY RESEARCH ORCHESTRATOR.
  
  Current Date and Time: ${new Date().toLocaleString()}

  STRICT ANTI-HALLUCINATION PROTOCOL:
  1. ZERO TOLERANCE: Never invent facts, URLs, dates, or technical specifications.
  2. VERIFY-THEN-SPEAK: If a worker provides information, treat it as "unverified" until you have cross-referenced it or it comes from a trusted source (e.g., user's own Gmail/Docs).
  3. "I DON'T KNOW": If the team cannot find the information, explicitly state what was tried and that the information is unavailable. Never guess.
  4. NO SYSTEM LEAKAGE: Do not mention internal tool names (e.g., 'delegate_to_...') or your own reasoning process to the user.

  VERIFIED CONTEXT FROM MEMORY:
  ${memoriesText}

  **Your primary goal is to synthesize answers directly from the VERIFIED CONTEXT above. Do not fall back to canned responses if the answer is present in the memories.**

  USER AUTHENTICATION STATUS:
  - Google Services: ${state.googleToken ? "AUTHENTICATED" : "NOT AUTHENTICATED"}

  THE TEAM:
  1. research_worker: Search the web, read PDFs, fetch URLs, and analyze uploaded documents.
  2. google_worker: SEARCH AND RETRIEVE from user's Gmail, Calendar, and Google Docs.
  3. coder_worker: CREATE AND IMPLEMENT. Best for drafting documents (proposals, emails), writing code, analyzing codebase, and updating local files.

  DELEGATION STRATEGY:
  - If the user wants to DRAFT, WRITE, or IMPLEMENT something, delegate to the coder_worker.
  - If the user wants to FIND info in their private accounts, delegate to the google_worker.
  - If the user wants to FIND info on the web or in documents, delegate to the research_worker.
  - If the task requires multiple steps, delegate sequentially.

  UI BLOCK OUTPUT MANDATE:
  - When providing a final answer, you MUST use a JSON array of UI blocks.
  - NEVER wrap the JSON in markdown code blocks.
  - Use 'text' for standard prose: { "type": "${BLOCK_TYPES.TEXT}", "content": "..." }
  - Use 'data' for tables/charts: { "type": "${BLOCK_TYPES.DATA}", "displayType": "chart" | "table", "title": "...", "data": [...] }
  - Use 'code' for snippets: { "type": "${BLOCK_TYPES.CODE}", "language": "...", "content": "..." }`;

  const model = genAI.getGenerativeModel({
    model: REASONING_MODEL,
    systemInstruction,
    tools: [{
      functionDeclarations: [
        {
          name: "delegate_to_research_worker",
          description: "Hands off the task to the Research Worker for web search, document analysis, or PDF reading.",
          parameters: { type: SchemaType.OBJECT, properties: { reason: { type: SchemaType.STRING } } }
        },
        {
          name: "delegate_to_google_worker",
          description: "Hands off the task to the Google Worker for Gmail, Calendar, or Google Docs access.",
          parameters: { type: SchemaType.OBJECT, properties: { reason: { type: SchemaType.STRING } } }
        },
        {
          name: "delegate_to_coder_worker",
          description: "Hands off the task to the Coder Worker for codebase analysis, reading local files, or technical implementation.",
          parameters: { type: SchemaType.OBJECT, properties: { reason: { type: SchemaType.STRING } } }
        }
      ]
    }]
  });

  const history = mapStateToGeminiHistory(state);
  const lastHistoryMsg = history.pop(); 
  
  logger.info({ sessionId: state.sessionId, lastHistoryMsg }, "[Agent Graph] Node: Supervisor | Last user message for Gemini:");
  
  if (!lastHistoryMsg) throw new Error("No messages found in history for Supervisor.");

  // Add raw attachments to the last message if they exist
  if (state.attachments && Array.isArray(state.attachments)) {
    state.attachments.forEach(att => {
      if (att.data && att.mimeType) {
        lastHistoryMsg.parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } } satisfies Part);
      }
    });
  }
  // find last humen message in messages 
  const userMsg = state.messages.slice().reverse().find(msg => { 
    return msg instanceof HumanMessage 
  }) || null;
  const sentMessage: string | Part[] = typeof userMsg?.content === "string"
    ? userMsg.content
    : lastHistoryMsg.parts;
  logger.info({ sessionId: state.sessionId }, "Sending message to Gemini");
  logger.debug({ sessionId: state.sessionId, sentMessage }, "Sent message details");
  const chat = model.startChat({ history });

  const result = await chat.sendMessage(sentMessage);
  const response = result.response;
  logger.debug({ sessionId: state.sessionId, rawResponse: response.text() }, "Raw response text from Gemini");

  let content = response.text();
  const toolCalls = response.functionCalls();
  let confidence = toolCalls?.length ? 100 : 0;
  let validationReason = toolCalls?.length
    ? "Supervisor returned tool calls for delegation."
    : "Supervisor response has not been validated yet.";

  // --- UI Block Validation ---
  if (content && !toolCalls?.length) {
    const validation = await validateOrRepairNodeResponse(content, async (repairPrompt) => {
      logger.warn({ sessionId: state.sessionId }, "Supervisor response failed validation; requesting repair");
      const repairResult = await chat.sendMessage(repairPrompt);
      return repairResult.response.text();
    });

    if (validation.valid) {
      content = validation.content;
      confidence = validation.confidence;
      validationReason = validation.reason;
    } else {
      content = validation.content;
      confidence = validation.confidence;
      validationReason = validation.reason;
    }
  } else if (toolCalls?.length) {
    logger.debug({ sessionId: state.sessionId, toolCallsCount: toolCalls.length }, "Supervisor delegated with tool calls");
  } else {
    content = createClarificationBlockContent("Supervisor returned no content and no delegation.");
    confidence = 0;
    validationReason = "Supervisor returned no content and no delegation.";
  }
  
  return {
    messages: [new AIMessage({
      
      content: content,
      tool_calls: toolCalls,
      name: "supervisor"
    })],
    metadata: {
      stage: STAGES.SYNTHESIZE,
      status: formatConfidenceStatus("Supervisor is orchestrating...", confidence, validationReason),
      confidence,
      validationReason,
    }
  };
}
  catch (error) {
    const geminiError = getGeminiErrorDetails(error);
    logger.error({ sessionId: state.sessionId, error: geminiError }, "Node: Supervisor | Error during processing");
    return {
      messages: [new AIMessage({
        content: createGeminiErrorBlockContent(error),
        tool_calls: [],
        name: "supervisor"
      })],
      metadata: {
        stage: STAGES.SYNTHESIZE,
        status: "Supervisor encountered a model provider error.",
        confidence: 0,
        validationReason: geminiError.message,
      }
    };
  }
}
