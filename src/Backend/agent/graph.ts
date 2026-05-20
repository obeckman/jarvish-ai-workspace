import { StateGraph } from "@langchain/langgraph";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { AgentState, type AgentStateType } from "@/Backend/agent/state";
import { AGENT_GRAPH_NODES } from "@/Backend/agent/graph/nodes";
import { addAgentGraphTopology } from "@/Backend/agent/graph/topology";

type GraphRunnableConfig = {
  configurable?: {
    thread_id?: string;
  };
  streamMode?: string[];
};

export type DynamicAgentGraph = {
  addNode(nodeName: string, node: (...args: never[]) => unknown): DynamicAgentGraph;
  addEdge(source: string, target: string): DynamicAgentGraph;
  addConditionalEdges(
    source: string,
    route: (...args: never[]) => string,
    pathMap: Readonly<Record<string, string>>,
  ): DynamicAgentGraph;
  compile(config: { checkpointer?: BaseCheckpointSaver }): {
    stream(input: Partial<AgentStateType>, options: GraphRunnableConfig): Promise<AsyncIterable<unknown>>;
    getState(config: GraphRunnableConfig): Promise<{ values?: AgentStateType } | null | undefined>;
  };
};

/**
 * Assembler for the Agent Graph.
 * Defines the logical sequence of operations.
 */
export function createAgentGraph(checkpointer?: BaseCheckpointSaver) {
  let workflow = new StateGraph(AgentState) as DynamicAgentGraph;

  for (const [nodeName, node] of AGENT_GRAPH_NODES) {
    workflow = workflow.addNode(nodeName, node as (...args: never[]) => unknown);
  }

  workflow = addAgentGraphTopology(workflow);

  return workflow.compile({ checkpointer });
}
