import { Annotation } from "@langchain/langgraph";
import { Memory } from "../services/memory/vector_store.interface.js";

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
    default: () => ({ stage: 1, status: "idle" }),
  }),
});

/**
 * Type-safe interface for the Agent State.
 */
export type AgentStateType = typeof AgentState.State;
