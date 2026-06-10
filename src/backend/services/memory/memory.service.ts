import { GoogleGenerativeAI } from '@google/generative-ai';
import { IVectorStore, Memory, MemoryMetadata } from '@/backend/services/memory/vector_store.interface';
import { logger } from '@/backend/utils/logger';
let vectorStore: IVectorStore | null = null;

export const MAX_MEMORY_CANDIDATES = 50;
export const DEFAULT_MEMORY_CONTEXT_LIMIT = 10;

export const MEMORY_TYPES = {
  ATTACHMENT: 'attachment',
  HISTORY: 'history',
  OVERALL_SESSION_SUMMARY: 'overall_session_summary',
  STRUCTURED_FACT: 'structured_fact',
  TOOL_FACT: 'tool_fact',
} as const;

type RetrieveMemoryOptions = {
  userId?: string;
  candidateLimit?: number;
};

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
export async function addMemory(text: string, metadata: MemoryMetadata = {}): Promise<string> {
  if (!vectorStore) throw new Error('Vector store not initialized');

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  
  // Generate embedding for the text
  const result = await withRetry(() => model.embedContent(text));
  const embedding = result.embedding.values;

  // Save to the specific store implementation
  return await vectorStore.add(text, embedding, metadata);
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
export async function retrieveMemories(
  query: string,
  topK: number = DEFAULT_MEMORY_CONTEXT_LIMIT,
  options: RetrieveMemoryOptions = {},
): Promise<Memory[]> {
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

    const candidateLimit = getCandidateLimit(topK, options.candidateLimit);

    // Perform vector similarity search in the store
    const results = await vectorStore.search(queryVector, { limit: candidateLimit });
    
    logger.info({ results }, `[Memory Service] Raw search results for "${query}":`);
    
    const filtered = curateRetrievedMemories(results, topK, options.userId);
    
    logger.info({
      query,
      candidateLimit,
      resultsLength: results.length,
      filteredLength: filtered.length,
    }, `[Memory Service] Query: "${query}" | Found ${results.length} results | ${filtered.length} curated`);
    
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

function getCandidateLimit(topK: number, candidateLimit: number | undefined): number {
  const requestedLimit = candidateLimit ?? MAX_MEMORY_CANDIDATES;
  const minimumUsefulLimit = Math.max(topK, 1);
  return Math.min(Math.max(requestedLimit, minimumUsefulLimit), MAX_MEMORY_CANDIDATES);
}

function curateRetrievedMemories(memories: Memory[], topK: number, userId: string | undefined): Memory[] {
  const currentMemories = memories
    .filter((memory) => memory.score >= RELEVANCE_THRESHOLD)
    .filter((memory) => isAllowedForUser(memory, userId))
    .filter(isActiveMemory);

  const latestAttachments = selectLatestAttachmentMemories(currentMemories);
  const nonAttachments = currentMemories.filter((memory) => getMetadataString(memory.metadata, 'type') !== MEMORY_TYPES.ATTACHMENT);

  return [...latestAttachments, ...nonAttachments]
    .sort(compareMemoryRank)
    .slice(0, Math.max(topK, 0));
}

function isAllowedForUser(memory: Memory, userId: string | undefined): boolean {
  if (!userId) {
    return true;
  }

  const memoryUserId = getMetadataString(memory.metadata, 'userId');
  if (!memoryUserId) {
    return true;
  }

  return memoryUserId === userId;
}

function isActiveMemory(memory: Memory): boolean {
  const active = memory.metadata?.isActive;
  if (active === false) {
    return false;
  }

  const latest = memory.metadata?.isLatest;
  if (latest === false) {
    return false;
  }

  return true;
}

function selectLatestAttachmentMemories(memories: Memory[]): Memory[] {
  const grouped = new Map<string, Memory>();
  const ungrouped: Memory[] = [];

  for (const memory of memories) {
    if (getMetadataString(memory.metadata, 'type') !== MEMORY_TYPES.ATTACHMENT) {
      continue;
    }

    const documentGroupKey = getMetadataString(memory.metadata, 'documentGroupKey');
    if (!documentGroupKey) {
      ungrouped.push(memory);
      continue;
    }

    const existing = grouped.get(documentGroupKey);
    if (!existing) {
      grouped.set(documentGroupKey, memory);
      continue;
    }

    if (getMemoryTime(memory) >= getMemoryTime(existing)) {
      grouped.set(documentGroupKey, memory);
    } else {
      grouped.set(documentGroupKey, existing);
    }
  }

  return [...grouped.values(), ...ungrouped];
}

function compareMemoryRank(a: Memory, b: Memory): number {
  const priorityDiff = getMemoryPriority(b) - getMemoryPriority(a);
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const scoreDiff = b.score - a.score;
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  return getMemoryTime(b) - getMemoryTime(a);
}

function getMemoryPriority(memory: Memory): number {
  const type = getMetadataString(memory.metadata, 'type');
  if (type === MEMORY_TYPES.STRUCTURED_FACT) {
    return 3;
  }

  if (type === MEMORY_TYPES.ATTACHMENT) {
    return 2;
  }

  if (type === MEMORY_TYPES.OVERALL_SESSION_SUMMARY) {
    return 1;
  }

  return 0;
}

function getMemoryTime(memory: Memory): number {
  const timestamp = getMetadataString(memory.metadata, 'timestamp') ?? getMetadataString(memory.metadata, 'createdAt');
  if (!timestamp) {
    return 0;
  }

  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

function getMetadataString(metadata: MemoryMetadata | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return undefined;
}
