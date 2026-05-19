import { StateGraph } from "@langchain/langgraph";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { AgentState } from "@/Backend/agent/state";
import { AGENT_GRAPH_NODES } from "@/Backend/agent/graph/nodes";
import { addAgentGraphTopology } from "@/Backend/agent/graph/topology";

/**
 * Assembler for the Agent Graph.
 * Defines the logical sequence of operations.
 */
export function createAgentGraph(checkpointer?: BaseCheckpointSaver) {
  let workflow: any = new StateGraph(AgentState);

  for (const [nodeName, node] of AGENT_GRAPH_NODES) {
    workflow = workflow.addNode(nodeName, node);
  }

  workflow = addAgentGraphTopology(workflow);

  return workflow.compile({ checkpointer });
}
