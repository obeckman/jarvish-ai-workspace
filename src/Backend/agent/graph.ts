import { StateGraph, START, END } from "@langchain/langgraph";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { AgentState, AgentStateType } from "@/Backend/agent/state"; // AgentState is a value
import { Memory } from "@/Backend/services/memory/vector_store.interface"; // Memory is needed for graphState
import { BaseMessage } from "@langchain/core/messages"; // BaseMessage is needed for graphState
import { contextNode } from "@/Backend/agent/nodes/context";
import { processingNode } from "@/Backend/agent/nodes/processing";
import { supervisorNode } from "@/Backend/agent/nodes/supervisor";
import { researchWorkerNode } from "@/Backend/agent/nodes/workers/research";
import { googleWorkerNode } from "@/Backend/agent/nodes/workers/google";
import { coderWorkerNode } from "@/Backend/agent/nodes/workers/coder";
import { toolsNode } from "@/Backend/agent/nodes/tools";
import { archiveNode } from "@/Backend/agent/nodes/archive";
import { clarificationNode } from "@/Backend/agent/nodes/clarification";
import { NODE_NAMES, TOOL_CONFIDENCE_THRESHOLD, STAGES } from "@/shared/jarvish.constants";; // Import STAGES
import { AIMessage } from "@langchain/core/messages";

/**
 * Supervisor Router: Decides which specialized worker to call or to finish.
 */
function supervisorRouter(state: AgentStateType) {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    const toolName = lastMessage.tool_calls[0].name;
    if (toolName === 'delegate_to_research_worker') return NODE_NAMES.RESEARCH_WORKER;
    if (toolName === 'delegate_to_google_worker') return NODE_NAMES.GOOGLE_WORKER;
    if (toolName === 'delegate_to_coder_worker') return NODE_NAMES.CODER_WORKER;
  }

  return NODE_NAMES.ARCHIVE;
}

/**
 * Worker Router: Decides whether to execute a tool or return to the supervisor.
 */
function workerRouter(state: AgentStateType) {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    return NODE_NAMES.TOOLS;
  }

  return NODE_NAMES.SUPERVISOR;
}

/**
 * Tools Router: Returns to the worker that initiated the tool call.
 */
function toolsRouter(state: AgentStateType) {
  if (state.toolConfidence !== null && state.toolConfidence < TOOL_CONFIDENCE_THRESHOLD) {
    return NODE_NAMES.CLARIFICATION;
  }
  return state.lastWorker || NODE_NAMES.SUPERVISOR;
}

/**
 * Assembler for the Agent Graph.
 * Defines the logical sequence of operations.
 */
export function createAgentGraph(checkpointer?: BaseCheckpointSaver) {
  const workflow = new StateGraph(AgentState) // Pass AgentState Annotation.Root directly to the constructor    // 1. Add all nodes    
    .addNode(NODE_NAMES.CONTEXT, contextNode)
    .addNode(NODE_NAMES.PROCESSING, processingNode)
    .addNode(NODE_NAMES.SUPERVISOR, supervisorNode)
    .addNode(NODE_NAMES.RESEARCH_WORKER, researchWorkerNode)
    .addNode(NODE_NAMES.GOOGLE_WORKER, googleWorkerNode)
    .addNode(NODE_NAMES.CODER_WORKER, coderWorkerNode)
    .addNode(NODE_NAMES.TOOLS, toolsNode)
    .addNode(NODE_NAMES.CLARIFICATION, clarificationNode)
    .addNode(NODE_NAMES.ARCHIVE, archiveNode)

    // 2. Define the edges (The Flow)
    .addEdge(START, NODE_NAMES.CONTEXT)
    .addEdge(NODE_NAMES.CONTEXT, NODE_NAMES.PROCESSING)
    .addEdge(NODE_NAMES.PROCESSING, NODE_NAMES.SUPERVISOR)

    // Supervisor Routes
    .addConditionalEdges(NODE_NAMES.SUPERVISOR, supervisorRouter, {
      [NODE_NAMES.RESEARCH_WORKER]: NODE_NAMES.RESEARCH_WORKER,
      [NODE_NAMES.GOOGLE_WORKER]: NODE_NAMES.GOOGLE_WORKER,
      [NODE_NAMES.CODER_WORKER]: NODE_NAMES.CODER_WORKER,
      [NODE_NAMES.ARCHIVE]: NODE_NAMES.ARCHIVE,
    })

    // Worker Routes
    .addConditionalEdges(NODE_NAMES.RESEARCH_WORKER, workerRouter, {
      [NODE_NAMES.TOOLS]: NODE_NAMES.TOOLS,
      [NODE_NAMES.SUPERVISOR]: NODE_NAMES.SUPERVISOR,
    })
    .addConditionalEdges(NODE_NAMES.GOOGLE_WORKER, workerRouter, {
      [NODE_NAMES.TOOLS]: NODE_NAMES.TOOLS,
      [NODE_NAMES.SUPERVISOR]: NODE_NAMES.SUPERVISOR,
    })
    .addConditionalEdges(NODE_NAMES.CODER_WORKER, workerRouter, {
      [NODE_NAMES.TOOLS]: NODE_NAMES.TOOLS,
      [NODE_NAMES.SUPERVISOR]: NODE_NAMES.SUPERVISOR,
    })

    // Tools return route
    .addConditionalEdges(NODE_NAMES.TOOLS, toolsRouter, {
      [NODE_NAMES.RESEARCH_WORKER]: NODE_NAMES.RESEARCH_WORKER,
      [NODE_NAMES.GOOGLE_WORKER]: NODE_NAMES.GOOGLE_WORKER,
      [NODE_NAMES.CODER_WORKER]: NODE_NAMES.CODER_WORKER,
      [NODE_NAMES.SUPERVISOR]: NODE_NAMES.SUPERVISOR,
      [NODE_NAMES.CLARIFICATION]: NODE_NAMES.CLARIFICATION,
    })

    // Clarification goes to archive to wait for user input
    .addEdge(NODE_NAMES.CLARIFICATION, NODE_NAMES.ARCHIVE)

    // Finish after archiving
    .addEdge(NODE_NAMES.ARCHIVE, END);

  return workflow.compile({ checkpointer });
}
