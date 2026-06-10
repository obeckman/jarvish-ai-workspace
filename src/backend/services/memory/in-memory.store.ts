import { randomUUID } from 'node:crypto'

import type {
  IVectorStore,
  Memory,
  MemoryMetadata,
  MemorySearchOptions,
} from '@/backend/services/memory/vector_store.interface'
import { cosineSimilarity } from '@/backend/services/memory/vector-math'

type StoredMemory = {
  id: string
  text: string
  embedding: number[]
  metadata: MemoryMetadata
}

export class InMemoryVectorStore implements IVectorStore {
  private readonly memories = new Map<string, StoredMemory>()

  async ensureSchema(): Promise<void> {
    return Promise.resolve()
  }

  async add(text: string, embedding: number[], metadata: MemoryMetadata): Promise<string> {
    const id = randomUUID()

    this.memories.set(id, {
      id,
      text,
      embedding,
      metadata,
    })

    return id
  }

  async search(queryEmbedding: number[], options: MemorySearchOptions): Promise<Memory[]> {
    return [...this.memories.values()]
      .map((memory) => ({
        id: memory.id,
        text: memory.text,
        metadata: memory.metadata,
        score: cosineSimilarity(queryEmbedding, memory.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit)
  }

  async delete(id: string): Promise<void> {
    this.memories.delete(id)
  }
}
