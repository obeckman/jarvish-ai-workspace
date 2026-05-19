import { AIMessage } from "@langchain/core/messages";
import { AgentStateType } from "@/Backend/agent/state";
import { NODE_NAMES, TOOL_CONFIDENCE_THRESHOLD } from "@/shared/jarvish.constants";

export function supervisorRouter(state: AgentStateType) {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    const toolName = lastMessage.tool_calls[0].name;
    if (toolName === "delegate_to_research_worker") return NODE_NAMES.RESEARCH_WORKER;
    if (toolName === "delegate_to_google_worker") return NODE_NAMES.GOOGLE_WORKER;
    if (toolName === "delegate_to_coder_worker") return NODE_NAMES.CODER_WORKER;
  }

  return NODE_NAMES.ARCHIVE;
}

export function workerRouter(state: AgentStateType) {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    return NODE_NAMES.TOOLS;
  }

  return NODE_NAMES.SUPERVISOR;
}

export function toolsRouter(state: AgentStateType) {
  if (state.toolConfidence !== null && state.toolConfidence < TOOL_CONFIDENCE_THRESHOLD) {
    return NODE_NAMES.CLARIFICATION;
  }

  return state.lastWorker || NODE_NAMES.SUPERVISOR;
}
