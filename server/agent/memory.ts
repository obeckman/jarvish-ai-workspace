import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'node:fs/promises';
import path from 'node:path';

// Local storage for memories
const MEMORY_FILE = path.join(process.cwd(), 'server', 'memories.json');

export interface Memory {
  id: string;
  text: string;
  score: number;
  embedding?: number[];
  metadata?: Record<string, any>;
}

/**
 * Loads memories from the local JSON file.
 */
async function loadMemories(): Promise<Memory[]> {
  try {
    const data = await fs.readFile(MEMORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, return empty array
    return [];
  }
}

/**
 * Saves a new memory to the local store.
 * Automatically generates an embedding using Gemini.
 */
export async function addMemory(text: string, metadata: Record<string, any> = {}) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  
  console.log(`[Memory] Generating embedding for new memory: "${text.substring(0, 30)}..."`);
  const result = await model.embedContent(text);
  const embedding = result.embedding.values;

  const memories = await loadMemories();
  const newMemory: Memory = {
    id: Date.now().toString(),
    text,
    embedding,
    metadata,
    score: 0
  };

  memories.push(newMemory);
  await fs.writeFile(MEMORY_FILE, JSON.stringify(memories, null, 2));
  console.log(`[Memory] Memory saved to local store.`);
  return newMemory;
}

/**
 * Retrieves the most semantically relevant memories using local vector search.
 */
export async function retrieveMemories(query: string, topK: number = 5): Promise<Memory[]> {
  console.log(`[Memory] Retrieving memories for: "${query}" using local store...`);
  
  try {
    const memories = await loadMemories();
    if (memories.length === 0) {
      console.log(`[Memory] Local store is empty.`);
      return [];
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    
    // Generate embedding for the search query
    const result = await model.embedContent(query);
    const queryVector = result.embedding.values;

    // Calculate similarity (Dot Product)
    const scored = memories.map(mem => {
      let score = 0;
      if (mem.embedding) {
        // Since Gemini embeddings are normalized, dot product = cosine similarity
        score = queryVector.reduce((acc, val, i) => acc + val * mem.embedding![i], 0);
      }
      return { ...mem, score };
    });

    // Sort by score descending
    const results = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ embedding, ...rest }) => {
        console.log(`[Memory] Match: "${rest.text.substring(0, 40)}..." (Score: ${rest.score.toFixed(4)})`);
        return rest;
      });

    return results;
  } catch (error) {
    console.error(`[Memory Error]`, error);
    return [];
  }
}
