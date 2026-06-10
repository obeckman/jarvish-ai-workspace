import { describe, expect, it } from 'vitest';

import { InMemoryVectorStore } from '@/backend/services/memory/in-memory.store';
import { cosineSimilarity } from '@/backend/services/memory/vector-math';

describe('Jarvish memory vector store', () => {
  it('calculates cosine similarity with zero-vector protection', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
    expect(cosineSimilarity([], [1, 1])).toBe(0);
  });

  it('ranks memories by vector similarity and respects limits', async () => {
    const store = new InMemoryVectorStore();

    await store.ensureSchema();
    await store.add('likes pizza', [1, 0], { userId: 'developer', type: 'preference' });
    await store.add('likes hiking', [0, 1], { userId: 'developer', type: 'preference' });
    await store.add('likes pasta', [0.8, 0.2], { userId: 'developer', type: 'preference' });

    const results = await store.search([1, 0], { limit: 2 });

    expect(results.map((result) => result.text)).toEqual(['likes pizza', 'likes pasta']);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('deletes memories without throwing when an id is already absent', async () => {
    const store = new InMemoryVectorStore();
    const id = await store.add('temporary memory', [1], { type: 'test' });

    await store.delete(id);
    await store.delete(id);

    expect(await store.search([1], { limit: 10 })).toEqual([]);
  });
});
