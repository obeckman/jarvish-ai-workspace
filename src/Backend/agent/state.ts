import { Annotation } from "@langchain/langgraph";
import { Memory } from "@/Backend/services/memory/vector_store.interface";
import { STAGES } from "@/Backend/agent/constants";

/**
 * Definition of the Agent's shared state.
 * This object is passed between nodes and modified along the graph's edges.
 */
export const AgentState = Annotation.Root({
  /**
   * The core conversation history (User and Assistant turns).
   */
  messages: Annotation<any[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  /**
   * Raw memories retrieved from the vector database.
   */
  memories: Annotation<Memory[]>({
    reducer: (x, y) => y, // Always replace with latest retrieval
    default: () => [],
  }),

  /**
   * Aggregated research notes from web searches and page crawls.
   */
  researchNotes: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  /**
   * Metadata about the current processing step.
   */
  metadata: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({ stage: STAGES.PREPARE, status: "idle" }),
  }),

  /**
   * Files attached to the user's query.
   */
  attachments: Annotation<any[]>({
    reducer: (x, y) => y,
    default: () => [],
  }),

  /**
   * AI-processed/extracted versions of attachments.
   */
  processedAttachments: Annotation<any[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),

  /**
   * OAuth token for Google Workspace tools.
   */
  googleToken: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /**
   * Tracks which worker was last active to return to them after tool execution.
   */
  lastWorker: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /**
   * Tracks the confidence score (0-100) of the most recently executed tool.
   * If below 70, the graph routes to a Clarification Node.
   */
  toolConfidence: Annotation<number | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),

  /**
   * Current session ID for persistence.
   */
  sessionId: Annotation<string | null>({
    reducer: (x, y) => y ?? x,
    default: () => null,
  }),
});

/**
 * Type-safe interface for the Agent State.
 */
export type AgentStateType = typeof AgentState.State;
