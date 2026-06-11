import { logger } from "@/backend/utils/logger";
import { AgentStateType } from "@/backend/agent/state";
import { STAGES, NODE_NAMES } from "@/shared/jarvish.constants";;
import { mapStateToGeminiHistory } from "../utils";
import { AIMessage } from "@langchain/core/messages";
import {
  createClarificationBlockContent,
  formatConfidenceStatus,
  validateOrRepairNodeResponse,
} from "@/backend/agent/validation/node-response.validator";
import { createGeminiModel } from "@/backend/agent/nodes/model-adapters";
import {
  buildResearchWorkerSystemInstruction,
  getResearchWorkerFunctionDeclarations,
} from "@/backend/agent/nodes/prompts";

/**
 * Node: Research Worker
 * Specialized in web search and document analysis.
 */
export async function researchWorkerNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Research Worker");
  try {
    const model = createGeminiModel({
      systemInstruction: buildResearchWorkerSystemInstruction(state),
      functionDeclarations: getResearchWorkerFunctionDeclarations(),
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
