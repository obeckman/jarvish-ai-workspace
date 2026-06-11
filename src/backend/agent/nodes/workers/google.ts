import { logger } from "@/backend/utils/logger";
import { AgentStateType } from "@/backend/agent/state";
import { STAGES, NODE_NAMES } from "@/shared/jarvish.constants";
import { mapStateToGeminiHistory } from "../utils";
import { AIMessage } from "@langchain/core/messages";
import {
  createClarificationBlockContent,
  formatConfidenceStatus,
  validateOrRepairNodeResponse,
} from "@/backend/agent/validation/node-response.validator";
import { createGeminiModel } from "@/backend/agent/nodes/model-adapters";
import {
  buildGoogleWorkerSystemInstruction,
  getGoogleWorkerFunctionDeclarations,
} from "@/backend/agent/nodes/prompts";

/**
 * Node: Google Worker
 * Specialized in Google Workspace tools.
 */
export async function googleWorkerNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Google Worker");
  try {
    const model = createGeminiModel({
      systemInstruction: buildGoogleWorkerSystemInstruction(),
      functionDeclarations: getGoogleWorkerFunctionDeclarations(),
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
