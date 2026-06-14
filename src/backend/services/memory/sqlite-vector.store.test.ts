import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';

import { SQLiteVectorStore } from '@/backend/services/memory/sqlite-vector.store';

describe('SQLiteVectorStore', () => {
  let database: Database.Database | null = null;

  afterEach(() => {
    database?.close();
    database = null;
  });

  function createStore(vectorScanLimit?: number) {
    database = new Database(':memory:');
    return new SQLiteVectorStore(database, vectorScanLimit);
  }

  it('creates schema, persists memories, and ranks by similarity', async () => {
    const store = createStore();

    await store.ensureSchema();
    const id = await store.add('calendar preference', [1, 0], {
      type: 'preference',
      userId: 'developer',
    });
    await store.add('travel preference', [0, 1], {
      type: 'preference',
      userId: 'developer',
    });

    const results = await store.search([1, 0], { limit: 2 });

    expect(results[0]).toMatchObject({
      id,
      text: 'calendar preference',
      metadata: {
        type: 'preference',
        userId: 'developer',
      },
      score: 1,
    });
    expect(results[1].text).toBe('travel preference');
  });

  it('deletes persisted memories idempotently', async () => {
    const store = createStore();

    await store.ensureSchema();
    const id = await store.add('temporary memory', [1], { type: 'test' });

    await store.delete(id);
    await store.delete(id);

    expect(await store.search([1], { limit: 10 })).toEqual([]);
  });

  it('bounds local similarity scoring to the newest persisted rows', async () => {
    const store = createStore(1);

    await store.ensureSchema();
    database?.prepare(`
      INSERT INTO vector_memories (id, text, embedding, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('older-match', 'older matching memory', '[1,0]', '{}', 100);
    database?.prepare(`
      INSERT INTO vector_memories (id, text, embedding, metadata, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('newer-candidate', 'newer scanned memory', '[0,1]', '{}', 200);

    expect(await store.search([1, 0], { limit: 1 })).toMatchObject([
      {
        id: 'newer-candidate',
        text: 'newer scanned memory',
        score: 0,
      },
    ]);
  });

  it('tolerates malformed persisted vectors and metadata', async () => {
    const store = createStore();

    await store.ensureSchema();
    database?.prepare(`
      INSERT INTO vector_memories (id, text, embedding, metadata)
      VALUES (?, ?, ?, ?)
    `).run('bad-row', 'corrupt row', '{"not":"a vector"}', 'not-json');

    expect(await store.search([1], { limit: 1 })).toEqual([
      {
        id: 'bad-row',
        text: 'corrupt row',
        metadata: {},
        score: 0,
      },
    ]);
  });
});
