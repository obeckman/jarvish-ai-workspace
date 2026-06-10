import { contextNode } from "@/backend/agent/nodes/context";
import { processingNode } from "@/backend/agent/nodes/processing";
import { supervisorNode } from "@/backend/agent/nodes/supervisor";
import { researchWorkerNode } from "@/backend/agent/nodes/workers/research";
import { googleWorkerNode } from "@/backend/agent/nodes/workers/google";
import { coderWorkerNode } from "@/backend/agent/nodes/workers/coder";
import { toolsNode } from "@/backend/agent/nodes/tools";
import { archiveNode } from "@/backend/agent/nodes/archive";
import { clarificationNode } from "@/backend/agent/nodes/clarification";
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
