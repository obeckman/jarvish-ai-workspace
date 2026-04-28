import { GoogleGenerativeAI } from '@google/generative-ai';
import { IVectorStore, Memory } from '@/server_v2/services/memory/vector_store.interface';

let vectorStore: IVectorStore | null = null;

/**
 * Injects the vector store implementation (Dependency Injection).
 */
export function setVectorStore(store: IVectorStore) {
  vectorStore = store;
}

/**
 * Utility for retrying stateless API calls with exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 503 || error.status === 429)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Saves a new memory to the vector store.
 * Automatically generates a vector embedding using the Gemini Embedding model.
 * 
 * @param text The raw information to remember.
 * @param metadata Contextual data (category, source, type, etc.).
 */
export async function addMemory(text: string, metadata: Record<string, any> = {}) {
  if (!vectorStore) throw new Error('Vector store not initialized');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  
  // Generate embedding for the text
  const result = await withRetry(() => model.embedContent(text));
  const embedding = result.embedding.values;

  // Save to the specific store implementation
  await vectorStore.add(text, embedding, metadata);
}

/**
 * Retrieves the most semantically relevant memories based on a text query.
 * 
 * @param query The user's question or topic.
 * @param topK Number of relevant snippets to retrieve.
 * @returns An array of Memory objects with similarity scores.
 */
export async function retrieveMemories(query: string, topK: number = 5): Promise<Memory[]> {
  if (!vectorStore) {
    console.warn('[Memory Service] Vector store not initialized.');
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    // Convert query text into a vector
    const result = await withRetry(() => model.embedContent(query));
    const queryVector = result.embedding.values;

    // Perform vector similarity search in the store
    const results = await vectorStore.search(queryVector, topK);
    return results;
  } catch (error) {
    console.error(`[Memory Service Error]`, error);
    return [];
  }
}
