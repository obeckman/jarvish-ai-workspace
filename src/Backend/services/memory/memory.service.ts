import { GoogleGenerativeAI } from '@google/generative-ai';
import { IVectorStore, Memory, MemoryMetadata } from '@/Backend/services/memory/vector_store.interface';
import { logger } from '@/Backend/utils/logger';
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
  } catch (error: unknown) {
    const status = getRetryableStatus(error);
    if (retries > 0 && (status === 503 || status === 429)) {
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
export async function addMemory(text: string, metadata: MemoryMetadata = {}) {
  if (!vectorStore) throw new Error('Vector store not initialized');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  
  // Generate embedding for the text
  const result = await withRetry(() => model.embedContent(text));
  const embedding = result.embedding.values;

  // Save to the specific store implementation
  await vectorStore.add(text, embedding, metadata);
}

const RELEVANCE_THRESHOLD = 0.65;

/**
 * Retrieves the most semantically relevant memories based on a text query.
 * Filters results by a RELEVANCE_THRESHOLD to avoid context poisoning.
 * 
 * @param query The user's question or topic.
 * @param topK Number of relevant snippets to retrieve.
 * @returns An array of Memory objects with similarity scores.
 */
export async function retrieveMemories(query: string, topK: number = 5): Promise<Memory[]> {
  if (!vectorStore) {
    logger.warn('[Memory Service] Vector store not initialized.');
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
    
    logger.info({ results }, `[Memory Service] Raw search results for "${query}":`);
    
    // Apply relevance threshold to prevent poisoning
    const filtered = results.filter(m => m.score >= RELEVANCE_THRESHOLD);
    
    logger.info({ query, resultsLength: results.length, filteredLength: filtered.length }, `[Memory Service] Query: "${query}" | Found ${results.length} results | ${filtered.length} passed threshold (${RELEVANCE_THRESHOLD})`);
    
    return filtered;
  } catch (error) {
    logger.error(error, `[Memory Service Error]`);
    return [];
  }
}

/**
 * Removes a memory from the store.
 * @param id The ID of the memory to forget.
 */
export async function forgetMemory(id: string) {
  if (!vectorStore) throw new Error('Vector store not initialized');
  await vectorStore.delete(id);
}

function getRetryableStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) {
    return undefined;
  }

  return typeof error.status === 'number' ? error.status : undefined;
}
