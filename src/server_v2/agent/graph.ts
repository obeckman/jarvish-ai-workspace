import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState, AgentStateType } from "./state.js";
import { contextNode } from "./nodes/context.js";
import { processingNode } from "./nodes/processing.js";
import { reasoningNode } from "./nodes/reasoning.js";
import { toolsNode } from "./nodes/tools.js";
import { archiveNode } from "./nodes/archive.js";

/**
 * Conditional Edge: Decides whether to continue tool execution or finish.
 */
function shouldContinue(state: AgentStateType) {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // If the LLM requested tool calls, we move to the tools node
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  
  // Otherwise, we have a final answer, so we go to archive then finish
  return "archive";
}

/**
 * Assembler for the Agent Graph.
 * Defines the logical sequence of operations.
 */
export function createAgentGraph() {
  const workflow = new StateGraph(AgentState)
    // 1. Add all nodes
    .addNode("context", contextNode)
    .addNode("processing", processingNode)
    .addNode("reasoning", reasoningNode)
    .addNode("tools", toolsNode)
    .addNode("archive", archiveNode)

    // 2. Define the edges (The Flow)
    .addEdge(START, "context")
    .addEdge("context", "processing")
    .addEdge("processing", "reasoning")
    
    // The conditional loop back for research
    .addConditionalEdges("reasoning", shouldContinue, {
      tools: "tools",
      archive: "archive",
    })
    
    // Always return to reasoning after using tools
    .addEdge("tools", "reasoning")
    
    // Finish after archiving
    .addEdge("archive", END);

  return workflow.compile();
}
