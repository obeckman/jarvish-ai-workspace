# Memory Layer

Jarvish separates memory orchestration from vector-store implementation. The public service API lives in `src/backend/services/memory/memory.service.ts`; the default local store implementation lives in `src/backend/services/memory/sqlite-vector.store.ts`.

## Write Path

```txt
agent/tool/archive event
  -> addMemory(text, metadata)
  -> Gemini embedding model
  -> IVectorStore.add(text, embedding, metadata)
  -> vector store implementation
```

Memory metadata carries the context needed for later filtering, including memory type, user id, session id, timestamps, and active/latest flags.

## Read Path

```txt
user query
  -> retrieveMemories(query, topK, options)
  -> Gemini query embedding
  -> IVectorStore.search(queryVector)
  -> relevance, user, active/latest, and priority filtering
  -> curated memories injected into graph context
```

The retrieval layer intentionally asks for more candidates than it returns. That gives the service room to apply relevance thresholds, user scoping, stale-memory filtering, and memory-type prioritization before the agent sees the context.

## Boundaries

- `IVectorStore` keeps the agent independent from storage-specific APIs.
- `memory.service.ts` owns embedding, retry, curation, and metadata policy.
- `sqlite-vector.store.ts` owns durable local vector persistence used by `npm start`.
- `in-memory.store.ts` remains available for ephemeral tests and future adapter comparison.

## Persistence

The default SQLite implementation persists vectors to `sqlite.db`, alongside the existing session/checkpoint data. Embeddings are stored as JSON arrays and searched with cosine similarity in TypeScript. This is intentionally simple and infrastructure-free for reviewers.

Future production deployments can add another `IVectorStore` adapter without changing agent orchestration, GraphQL resolvers, or frontend code.
