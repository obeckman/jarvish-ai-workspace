import { END, START } from "@langchain/langgraph";
import { NODE_NAMES } from "@/shared/jarvish.constants";
import { supervisorRouter, toolsRouter, workerRouter } from "@/Backend/agent/graph/routers";
import { SUPERVISOR_ROUTES, TOOL_ROUTES, WORKER_ROUTES } from "@/Backend/agent/graph/routes";
import type { DynamicAgentGraph } from "@/Backend/agent/graph";

export function addAgentGraphTopology(workflow: DynamicAgentGraph): DynamicAgentGraph {
  return workflow
    .addEdge(START, NODE_NAMES.CONTEXT)
    .addEdge(NODE_NAMES.CONTEXT, NODE_NAMES.PROCESSING)
    .addEdge(NODE_NAMES.PROCESSING, NODE_NAMES.SUPERVISOR)
    .addConditionalEdges(NODE_NAMES.SUPERVISOR, supervisorRouter, SUPERVISOR_ROUTES)
    .addConditionalEdges(NODE_NAMES.RESEARCH_WORKER, workerRouter, WORKER_ROUTES)
    .addConditionalEdges(NODE_NAMES.GOOGLE_WORKER, workerRouter, WORKER_ROUTES)
    .addConditionalEdges(NODE_NAMES.CODER_WORKER, workerRouter, WORKER_ROUTES)
    .addConditionalEdges(NODE_NAMES.TOOLS, toolsRouter, TOOL_ROUTES)
    .addEdge(NODE_NAMES.CLARIFICATION, NODE_NAMES.ARCHIVE)
    .addEdge(NODE_NAMES.ARCHIVE, END);
}
