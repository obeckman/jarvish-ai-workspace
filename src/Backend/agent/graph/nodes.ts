import { contextNode } from "@/Backend/agent/nodes/context";
import { processingNode } from "@/Backend/agent/nodes/processing";
import { supervisorNode } from "@/Backend/agent/nodes/supervisor";
import { researchWorkerNode } from "@/Backend/agent/nodes/workers/research";
import { googleWorkerNode } from "@/Backend/agent/nodes/workers/google";
import { coderWorkerNode } from "@/Backend/agent/nodes/workers/coder";
import { toolsNode } from "@/Backend/agent/nodes/tools";
import { archiveNode } from "@/Backend/agent/nodes/archive";
import { clarificationNode } from "@/Backend/agent/nodes/clarification";
import { NODE_NAMES } from "@/shared/jarvish.constants";

export const AGENT_GRAPH_NODES = [
  [NODE_NAMES.CONTEXT, contextNode],
  [NODE_NAMES.PROCESSING, processingNode],
  [NODE_NAMES.SUPERVISOR, supervisorNode],
  [NODE_NAMES.RESEARCH_WORKER, researchWorkerNode],
  [NODE_NAMES.GOOGLE_WORKER, googleWorkerNode],
  [NODE_NAMES.CODER_WORKER, coderWorkerNode],
  [NODE_NAMES.TOOLS, toolsNode],
  [NODE_NAMES.CLARIFICATION, clarificationNode],
  [NODE_NAMES.ARCHIVE, archiveNode],
] as const;
