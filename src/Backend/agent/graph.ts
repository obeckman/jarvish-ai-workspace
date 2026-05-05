import { StateGraph, START, END } from "@langchain/langgraph";
import { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint";
import { AgentStateType } from "@/Backend/agent/state"; // AgentState is an interface, not a value
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages"; // Import BaseMessage and other message types
import { contextNode } from "@/Backend/agent/nodes/context";
import { processingNode } from "@/Backend/agent/nodes/processing";
import { supervisorNode } from "@/Backend/agent/nodes/supervisor";
import { researchWorkerNode } from "@/Backend/agent/nodes/workers/research";
import { googleWorkerNode } from "@/Backend/agent/nodes/workers/google";
import { coderWorkerNode } from "@/Backend/agent/nodes/workers/coder";
import { toolsNode } from "@/Backend/agent/nodes/tools";
import { archiveNode } from "@/Backend/agent/nodes/archive";
import { clarificationNode } from "@/Backend/agent/nodes/clarification";
import { NODE_NAMES, TOOL_CONFIDENCE_THRESHOLD, STAGES } from "@/Backend/agent/constants"; // Import STAGES

const graphState = {
  messages: {
    reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
    default: () => [],
  },
  memories: {
    reducer: (x: Memory[], y: Memory[]) => y, // Always replace with latest retrieval
    default: () => [],
  },
  researchNotes: {
    reducer: (x: string[], y: string[]) => x.concat(y),
    default: () => [],
  },
  metadata: {
    reducer: (x: Record<string, any>, y: Record<string, any>) => ({ ...x, ...y }),
    default: () => ({ stage: STAGES.PREPARE, status: "idle" }),
  },
  attachments: {
    reducer: (x: any[], y: any[]) => y,
    default: () => [],
  },
  processedAttachments: {
    reducer: (x: any[], y: any[]) => x.concat(y),
    default: () => [],
  },
  googleToken: {
    reducer: (x: string | null, y: string | null) => y ?? x,
    default: () => null,
  },
  lastWorker: {
    reducer: (x: string | null, y: string | null) => y ?? x,
    default: () => null,
  },
  toolConfidence: {
    reducer: (x: number | null, y: number | null) => y ?? x,
    default: () => null,
  },
  sessionId: {
    reducer: (x: string | null, y: string | null) => y ?? x,
    default: () => null,
  },
};

/**
 * Assembler for the Agent Graph.
 * Defines the logical sequence of operations.
 */
export function createAgentGraph(checkpointer?: BaseCheckpointSaver) {
  const workflow = new StateGraph<AgentStateType>({ channels: graphState }) // Pass graphState with channels
    // 1. Add all nodes
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
