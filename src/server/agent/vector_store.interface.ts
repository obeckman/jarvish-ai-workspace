import { Memory } from './memory';

export interface IVectorStore {
  /**
   * Initializes the store, ensuring the schema/collection exists.
   */
  ensureSchema(): Promise<void>;

  /**
   * Adds a new document with its vector and metadata to the store.
   */
  add(text: string, embedding: number[], metadata: Record<string, any>): Promise<void>;

  /**
   * Searches for the most semantically relevant documents using vector similarity.
   */
  search(queryEmbedding: number[], topK: number): Promise<Memory[]>;
}
