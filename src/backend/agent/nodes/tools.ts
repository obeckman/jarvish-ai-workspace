import { logger } from "@/backend/utils/logger";
import { AgentStateType } from "../state";
import { executeAgentTool, formatToolNote } from "@/backend/agent/tools/tool-executor";
import { STAGES, TOOL_CONFIDENCE_THRESHOLD } from "@/shared/jarvish.constants";
import { ToolMessage } from "@langchain/core/messages";
import { getAgentToolCalls } from "@/backend/agent/contracts/message.contract";

/**
 * Node: Tool Execution
 * Responsibilities:
 * 1. Extract tool calls from the last AI message.
 * 2. Route calls to the correct service implementation.
 * 3. Accumulate results into the 'researchNotes' state.
 */
export async function toolsNode(state: AgentStateType) {
  logger.debug({ sessionId: state.sessionId, messagesCount: state.messages.length }, "Node: Tools");
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = getAgentToolCalls(lastMessage);
  
  logger.info({ sessionId: state.sessionId, toolCallsCount: toolCalls.length }, "Executing tools");

  const results: ToolMessage[] = [];
  const notes: string[] = [];

  let minimumConfidence = 100;
  const reasons: string[] = [];

  for (const call of toolCalls) {
    const { output, confidence, reason } = await executeAgentTool(call, state);

    if (confidence < minimumConfidence) {
      minimumConfidence = confidence;
    } else {
      logger.debug({ sessionId: state.sessionId, toolName: call.name, confidence }, "Tool confidence did not lower minimum confidence");
    }
    reasons.push(`${call.name}: ${reason}`);

    results.push(new ToolMessage({
      name: call.name,
      content: typeof output === 'string' ? output : JSON.stringify(output),
      tool_call_id: call.id,
    }));
    notes.push(formatToolNote(call, output, confidence, reason));
  }

  const status = minimumConfidence < TOOL_CONFIDENCE_THRESHOLD
    ? `Completed ${toolCalls.length} research steps. Confidence: ${minimumConfidence}%. Asking for clarification.`
    : `Completed ${toolCalls.length} research steps. Confidence: ${minimumConfidence}%.`;

  return {
    messages: results,
    researchNotes: notes,
    toolConfidence: minimumConfidence,
    metadata: {
      stage: STAGES.RESEARCH,
      status,
      confidence: minimumConfidence,
      validationReason: reasons.join("; "),
    }
  };
}
