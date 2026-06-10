import { randomUUID } from 'node:crypto'

import type Database from 'better-sqlite3'

import type {
  IVectorStore,
  Memory,
  MemoryMetadata,
  MemorySearchOptions,
} from '@/backend/services/memory/vector_store.interface'
import { cosineSimilarity } from '@/backend/services/memory/vector-math'

type VectorMemoryRow = {
  id: string
  text: string
  embedding: string
  metadata: string | null
}

export class SQLiteVectorStore implements IVectorStore {
  constructor(private readonly database: Database.Database) {}

  async ensureSchema(): Promise<void> {
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS vector_memories (
        id text PRIMARY KEY,
        text text NOT NULL,
        embedding text NOT NULL,
        metadata text,
        created_at integer NOT NULL DEFAULT (unixepoch())
      );

      CREATE INDEX IF NOT EXISTS idx_vector_memories_created_at
        ON vector_memories(created_at);
    `)
  }

  async add(text: string, embedding: number[], metadata: MemoryMetadata): Promise<string> {
    const id = randomUUID()

    this.database
      .prepare(`
        INSERT INTO vector_memories (id, text, embedding, metadata)
        VALUES (@id, @text, @embedding, @metadata)
      `)
      .run({
        id,
        text,
        embedding: JSON.stringify(embedding),
        metadata: JSON.stringify(metadata),
      })

    return id
  }

  async search(queryEmbedding: number[], options: MemorySearchOptions): Promise<Memory[]> {
    const rows = this.database
      .prepare('SELECT id, text, embedding, metadata FROM vector_memories')
      .all() as VectorMemoryRow[]

    return rows
      .map((row) => {
        const embedding = parseEmbedding(row.embedding)

        return {
          id: row.id,
          text: row.text,
          metadata: parseMetadata(row.metadata),
          score: cosineSimilarity(queryEmbedding, embedding),
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit)
  }

  async delete(id: string): Promise<void> {
    this.database
      .prepare('DELETE FROM vector_memories WHERE id = ?')
      .run(id)
  }
}

function parseEmbedding(value: string): number[] {
  try {
    const parsed = JSON.parse(value)

    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is number => typeof item === 'number')
    }

    return []
  } catch (_error) {
    return []
  }
}

function parseMetadata(value: string | null): MemoryMetadata {
  if (!value) {
    return {}
  }

  try {
    const parsed = JSON.parse(value)

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as MemoryMetadata
    }

    return {}
  } catch (_error) {
    return {}
  }
}
