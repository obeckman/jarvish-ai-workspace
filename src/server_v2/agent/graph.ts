import { StateGraph, START, END } from "@langchain/langgraph";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { AgentState, AgentStateType } from "@/server_v2/agent/state";
import { contextNode } from "@/server_v2/agent/nodes/context";
import { processingNode } from "@/server_v2/agent/nodes/processing";
import { reasoningNode } from "@/server_v2/agent/nodes/reasoning";
import { toolsNode } from "@/server_v2/agent/nodes/tools";
import { archiveNode } from "@/server_v2/agent/nodes/archive";
import { NODE_NAMES } from "@/server_v2/agent/constants";

/**
 * Conditional Edge: Decides whether to continue tool execution or finish.
 */
function shouldContinue(state: AgentStateType) {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // If the LLM requested tool calls, we move to the tools node
  if (lastMessage.tool_calls?.length) {
    return NODE_NAMES.TOOLS;
  }
  
  // Otherwise, we have a final answer, so we go to archive then finish
  return NODE_NAMES.ARCHIVE;
}

/**
 * Assembler for the Agent Graph.
 * Defines the logical sequence of operations.
 */
export function createAgentGraph(checkpointer?: BaseCheckpointSaver) {
  const workflow = new StateGraph(AgentState)
    // 1. Add all nodes
    .addNode(NODE_NAMES.CONTEXT, contextNode)
    .addNode(NODE_NAMES.PROCESSING, processingNode)
    .addNode(NODE_NAMES.REASONING, reasoningNode)
    .addNode(NODE_NAMES.TOOLS, toolsNode)
    .addNode(NODE_NAMES.ARCHIVE, archiveNode)

    // 2. Define the edges (The Flow)
    .addEdge(START, NODE_NAMES.CONTEXT)
    .addEdge(NODE_NAMES.CONTEXT, NODE_NAMES.PROCESSING)
    .addEdge(NODE_NAMES.PROCESSING, NODE_NAMES.REASONING)
    
    // The conditional loop back for research
    .addConditionalEdges(NODE_NAMES.REASONING, shouldContinue, {
      [NODE_NAMES.TOOLS]: NODE_NAMES.TOOLS,
      [NODE_NAMES.ARCHIVE]: NODE_NAMES.ARCHIVE,
    })
    
    // Always return to reasoning after using tools
    .addEdge(NODE_NAMES.TOOLS, NODE_NAMES.REASONING)
    
    // Finish after archiving
    .addEdge(NODE_NAMES.ARCHIVE, END);

  return workflow.compile({ checkpointer });
}
