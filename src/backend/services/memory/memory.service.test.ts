import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addMemory,
  forgetMemory,
  MEMORY_TYPES,
  retrieveMemories,
  setVectorStore,
} from '@/backend/services/memory/memory.service';
import type {
  IVectorStore,
  Memory,
  MemoryMetadata,
  MemorySearchOptions,
} from '@/backend/services/memory/vector_store.interface';

class MockVectorStore implements IVectorStore {
  add = vi.fn<(text: string, embedding: number[], metadata: MemoryMetadata) => Promise<string>>();
  search = vi.fn<(queryEmbedding: number[], options: MemorySearchOptions) => Promise<Memory[]>>();
  delete = vi.fn<(id: string) => Promise<void>>();

  async ensureSchema(): Promise<void> {
    return Promise.resolve();
  }
}

describe('Jarvish memory service', () => {
  let store: MockVectorStore;

  beforeEach(() => {
    store = new MockVectorStore();
    store.add.mockResolvedValue('memory-1');
    store.search.mockResolvedValue([]);
    store.delete.mockResolvedValue(undefined);
    setVectorStore(store);
  });

  it('embeds and stores new memories through the injected vector store', async () => {
    await expect(addMemory('User prefers concise summaries', {
      type: MEMORY_TYPES.STRUCTURED_FACT,
      userId: 'developer',
    })).resolves.toBe('memory-1');

    expect(store.add).toHaveBeenCalledWith(
      'User prefers concise summaries',
      expect.arrayContaining([expect.any(Number)]),
      {
        type: MEMORY_TYPES.STRUCTURED_FACT,
        userId: 'developer',
      },
    );
    expect(store.add.mock.calls[0][1]).toHaveLength(128);
  });

  it('curates retrievals by relevance, user scope, active flags, priority, and topK', async () => {
    store.search.mockResolvedValue([
      memory('old attachment', 0.99, {
        type: MEMORY_TYPES.ATTACHMENT,
        userId: 'developer',
        documentGroupKey: 'doc-1',
        timestamp: '2026-06-10T08:00:00.000Z',
      }),
      memory('latest attachment', 0.9, {
        type: MEMORY_TYPES.ATTACHMENT,
        userId: 'developer',
        documentGroupKey: 'doc-1',
        timestamp: '2026-06-10T09:00:00.000Z',
      }),
      memory('structured fact', 0.7, {
        type: MEMORY_TYPES.STRUCTURED_FACT,
        userId: 'developer',
        timestamp: '2026-06-10T07:00:00.000Z',
      }),
      memory('wrong user', 0.99, {
        type: MEMORY_TYPES.STRUCTURED_FACT,
        userId: 'someone-else',
      }),
      memory('inactive', 0.99, {
        isActive: false,
      }),
      memory('low relevance', 0.2, {
        userId: 'developer',
      }),
    ]);

    await expect(retrieveMemories('calendar', 2, {
      userId: 'developer',
      candidateLimit: 200,
    })).resolves.toEqual([
      expect.objectContaining({ text: 'structured fact' }),
      expect.objectContaining({ text: 'latest attachment' }),
    ]);

    expect(store.search.mock.calls[0][1]).toEqual({ limit: 50 });
  });

  it('deletes memories through the injected store', async () => {
    await forgetMemory('memory-1');

    expect(store.delete).toHaveBeenCalledWith('memory-1');
  });
});

function memory(text: string, score: number, metadata: MemoryMetadata): Memory {
  return {
    id: text,
    text,
    score,
    metadata,
  };
}
