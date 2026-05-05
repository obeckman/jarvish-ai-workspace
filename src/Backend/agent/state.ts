import { Memory } from "@/Backend/services/memory/vector_store.interface";
import { STAGES } from "@/Backend/agent/constants";

/**
 * Definition of the Agent's shared state.
 * This object is passed between nodes and modified along the graph's edges.
 */
export interface AgentState {
  /**
   * The core conversation history (User and Assistant turns).
   */
  messages: any[]; // Changed from Annotation<any[]>
  memories: Memory[]; // Changed from Annotation<Memory[]>
  researchNotes: string[]; // Changed from Annotation<string[]>
  metadata: Record<string, any>; // Changed from Annotation<Record<string, any>>
  attachments: any[]; // Changed from Annotation<any[]>
  processedAttachments: any[]; // Changed from Annotation<any[]>
  googleToken: string | null; // Changed from Annotation<string | null>
  lastWorker: string | null; // Changed from Annotation<string | null>
  toolConfidence: number | null; // Changed from Annotation<number | null>
  sessionId: string | null; // Changed from Annotation<string | null>
}

/**
 * Type-safe interface for the Agent State.
 */
export type AgentStateType = AgentState;
