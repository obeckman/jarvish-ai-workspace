import { GoogleGenerativeAI } from '@google/generative-ai';
import { IVectorStore } from './vector_store.interface.js';
import { withRetry } from './agent.js';

export interface Memory {
  id: string;
  text: string;
  score: number;
  metadata?: Record<string, any>;
}

let vectorStore: IVectorStore | null = null;

/**
 * Injects the vector store implementation.
 */
export function setVectorStore(store: IVectorStore) {
  vectorStore = store;
}

/**
 * Saves a new memory to the vector store.
 * Automatically generates an embedding using Gemini.
 */
export async function addMemory(text: string, metadata: Record<string, any> = {}) {
  if (!vectorStore) throw new Error('Vector store not initialized');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  
  console.log(`[Memory] Generating embedding for new memory: "${text.substring(0, 30)}..."`);
  const result = await withRetry(() => model.embedContent(text));
  const embedding = result.embedding.values;

  await vectorStore.add(text, embedding, metadata);
  console.log(`[Memory] Memory saved to Weaviate.`);
}

/**
 * Retrieves the most semantically relevant memories using Weaviate vector search.
 */
export async function retrieveMemories(query: string, topK: number = 5): Promise<Memory[]> {
  if (!vectorStore) {
    console.warn('[Memory] Vector store not initialized. Returning empty memories.');
    return [];
  }

  console.log(`[Memory] Retrieving memories for: "${query}" using Weaviate...`);
  
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    
    // Generate embedding for the search query
    const result = await withRetry(() => model.embedContent(query));
    const queryVector = result.embedding.values;

    // Search in Weaviate
    const results = await vectorStore.search(queryVector, topK);
    return results;
  } catch (error) {
    console.error(`[Memory Error]`, error);
    return [];
  }
}
