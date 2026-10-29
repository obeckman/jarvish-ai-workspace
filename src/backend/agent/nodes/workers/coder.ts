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
  buildCoderWorkerSystemInstruction,
  getCoderWorkerFunctionDeclarations,
} from "@/backend/agent/nodes/prompts";
import { normalizeWorkerContent } from "@/backend/agent/workers/worker-response";

/**
 * Node: Coder Worker
 * Specialized in local system operations, codebase analysis, and technical implementation.
 */
export async function coderWorkerNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Coder Worker");
  try {
    const model = createGeminiModel({
      systemInstruction: buildCoderWorkerSystemInstruction(),
      functionDeclarations: getCoderWorkerFunctionDeclarations(),
    });

    const history = mapStateToGeminiHistory(state);
    const lastMsg = history.pop();
    
    if (!lastMsg) throw new Error("No messages found for Coder Worker.");

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(lastMsg.parts);
    const response = result.response;
    logger.debug({ sessionId: state.sessionId, rawResponse: response.text() }, "Coder Worker | Raw response text");

    const toolCalls = response.functionCalls();
    let content = normalizeWorkerContent(response.text(), Boolean(toolCalls?.length));
    let confidence = toolCalls?.length ? 100 : 0;
    let validationReason = toolCalls?.length
      ? "Coder Worker returned tool calls."
      : "Coder Worker response has not been validated yet.";

    if (content && !toolCalls?.length) {
      const validation = await validateOrRepairNodeResponse(content, async (repairPrompt) => {
        logger.warn({ sessionId: state.sessionId }, "Coder Worker response failed validation; requesting repair");
        const repairResult = await chat.sendMessage(repairPrompt);
        return repairResult.response.text();
      });

      content = validation.content;
      confidence = validation.confidence;
      validationReason = validation.reason;
    } else if (toolCalls?.length) {
      logger.debug({ sessionId: state.sessionId, toolCallsCount: toolCalls.length }, "Coder Worker requested tools");
    } else {
      content = createClarificationBlockContent("Coder Worker returned no content and no tool calls.");
      confidence = 0;
      validationReason = "Coder Worker returned no content and no tool calls.";
    }

    return {
      messages: [new AIMessage({
        content: content,
        tool_calls: toolCalls,
        name: "coder_worker"
      })],
      lastWorker: NODE_NAMES.CODER_WORKER,
      metadata: {
        stage: STAGES.RESEARCH,
        status: formatConfidenceStatus("Coder Worker is analyzing code...", confidence, validationReason),
        confidence,
        validationReason,
      }
    };
  } catch (error) {
    logger.error({ sessionId: state.sessionId, error }, "Node: Coder Worker | Error during processing");
    throw error;
  }
}
