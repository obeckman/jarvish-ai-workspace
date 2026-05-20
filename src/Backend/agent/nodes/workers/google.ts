import { logger } from "@/Backend/utils/logger";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/Backend/agent/state";
import { REASONING_MODEL } from "@/Backend/agent/models";
import { STAGES, NODE_NAMES } from "@/shared/jarvish.constants";
import { mapStateToGeminiHistory } from "../utils";
import { AIMessage } from "@langchain/core/messages";
import { 
  googleCalendarDeclaration,
  gmailSearchDeclaration,
  googleDocsDeclaration,
  updateGoogleDocDeclaration
} from "@/Backend/agent/nodes/registry";
import {
  createClarificationBlockContent,
  formatConfidenceStatus,
  validateOrRepairNodeResponse,
} from "@/Backend/agent/validation/node-response.validator";

/**
 * Node: Google Worker
 * Specialized in Google Workspace tools.
 */
export async function googleWorkerNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Google Worker");
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    const systemInstruction = `You are the Google Worker, part of the Jarvish team. Your job is to use Google Workspace tools to find information and assist in content creation.
    
    STRICT PROTOCOLS:
    1. ZERO HALLUCINATION: If a search returns no results, state that clearly.
    2. RAW TRUTH: Report data exactly as found in the tools.
    3. COLLABORATION: Use update_google_doc to help the user draft or update their documents.
    4. HANDOFF: If a task is purely technical (coding) or requires deep web research, provide what you found and suggest the Coder or Research worker.

    AVAILABLE TOOLS:
    - list_calendar_events: For schedule and events.
    - search_gmail_messages: For emails.
    - get_google_doc_content: For reading documents.
    - update_google_doc: For writing or appending to documents.`;

    const model = genAI.getGenerativeModel({
      model: REASONING_MODEL,
      systemInstruction,
      tools: [{
        functionDeclarations: [
          googleCalendarDeclaration,
          gmailSearchDeclaration,
          googleDocsDeclaration,
          updateGoogleDocDeclaration
        ]
      }]
    });

    const history = mapStateToGeminiHistory(state);
    const lastMsg = history.pop();
    
    if (!lastMsg) throw new Error("No messages found for Google Worker.");

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMsg.parts);
    const response = result.response;
    logger.debug({ sessionId: state.sessionId, rawResponse: response.text() }, "Google Worker | Raw response text");

    let content = response.text();
    const toolCalls = response.functionCalls();
    let confidence = toolCalls?.length ? 100 : 0;
    let validationReason = toolCalls?.length
      ? "Google Worker returned tool calls."
      : "Google Worker response has not been validated yet.";

    if (content && !toolCalls?.length) {
      const validation = await validateOrRepairNodeResponse(content, async (repairPrompt) => {
        logger.warn({ sessionId: state.sessionId }, "Google Worker response failed validation; requesting repair");
        const repairResult = await chat.sendMessage(repairPrompt);
        return repairResult.response.text();
      });

      content = validation.content;
      confidence = validation.confidence;
      validationReason = validation.reason;
    } else if (toolCalls?.length) {
      logger.debug({ sessionId: state.sessionId, toolCallsCount: toolCalls.length }, "Google Worker requested tools");
    } else {
      content = createClarificationBlockContent("Google Worker returned no content and no tool calls.");
      confidence = 0;
      validationReason = "Google Worker returned no content and no tool calls.";
    }

    return {
      messages: [new AIMessage({
        content: content,
        tool_calls: toolCalls,
        name: "google_worker"
      })],
      lastWorker: NODE_NAMES.GOOGLE_WORKER,
      metadata: {
        stage: STAGES.RESEARCH,
        status: formatConfidenceStatus("Google Worker is searching...", confidence, validationReason),
        confidence,
        validationReason,
      }
    };
  } catch (error) {
    logger.error({ sessionId: state.sessionId, error }, "Node: Google Worker | Error during processing");
    throw error;
  }
}
