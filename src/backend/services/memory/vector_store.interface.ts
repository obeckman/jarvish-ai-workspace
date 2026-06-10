import type { JsonValue } from "@/shared/jarvish.blocks";

export type MemoryMetadata = Record<string, JsonValue>;

/**
 * Memory interface representing a semantically retrieved fact or interaction.
 */
export interface Memory {
  id: string;
  text: string;
  score: number;
  metadata?: MemoryMetadata;
}

export type MemorySearchOptions = {
  limit: number;
};

/**
 * Standard interface for Vector Store implementations (e.g., Weaviate, Pinecone, Local).
 * This allows us to swap the underlying database without changing the agent logic.
 */
export interface IVectorStore {
  /**
   * Initializes the store, ensuring the schema or collections exist.
   */
  ensureSchema(): Promise<void>;

  /**
   * Adds a new document with its vector embedding and metadata to the store.
   * @param text The raw text to store.
   * @param embedding The numerical vector representation of the text.
   * @param metadata Optional structured data (category, timestamp, etc.).
   */
  add(text: string, embedding: number[], metadata: MemoryMetadata): Promise<string>;

  /**
   * Searches for the most semantically relevant documents using vector similarity.
   * @param queryEmbedding The numerical vector of the search query.
   * @param topK Number of results to return.
   */
  search(queryEmbedding: number[], options: MemorySearchOptions): Promise<Memory[]>;

  /**
   * Removes a memory from the store by its ID.
   * @param id The unique identifier of the memory.
   */
  delete(id: string): Promise<void>;
}
