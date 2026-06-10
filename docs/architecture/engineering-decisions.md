# Engineering Decisions

This document captures the main design choices behind Jarvish. It is intentionally short and review-oriented.

## Jarvish-First App Shell

The app opens directly into the Jarvish workspace because the portfolio goal is AI engineering, not a general React playground. Secondary frontend examples remain available through a lazy-loaded capability launcher, but they no longer dominate the first screen.

Tradeoff: the app still keeps selected frontend capability demos in the same repository. That is useful for a pure frontend CV, but the public surface needs to stay curated so reviewers see the AI system first.

## GraphQL Boundary

GraphQL Yoga is used as the boundary between React and the agent runtime. Queries and mutations handle durable session data, while `agentEvents` streams progressive agent state back to the UI.

Why this shape:

- GraphQL gives the frontend a typed contract for sessions, summaries, structured facts, and agent events.
- Subscriptions map well to long-running agent work.
- Resolver and mapper layers keep transport concerns separate from the LangGraph state shape.

Tradeoff: GraphQL adds schema/codegen overhead. The repo keeps this visible through `codegen.ts`, generated types, and the `npm run codegen` / `npm run verify` scripts.

## LangGraph Orchestration

The agent is modeled as an explicit graph rather than a single request handler. Context retrieval, request processing, supervision, worker routing, tool execution, clarification, and archival are separate nodes.

Why this shape:

- Routing is reviewable in `src/backend/agent/graph/topology.ts`.
- Worker responsibilities stay narrow.
- Tool loops and termination paths are easier to reason about.
- The graph can preserve session state through a checkpointer.

Tradeoff: the graph introduces more files than a linear chain. The benefit is clearer operational boundaries as the agent grows.

## Memory Abstraction

Memory writes and retrievals go through `memory.service.ts` and an `IVectorStore` interface. The default local implementation is SQLite-backed so vector memory persists across backend restarts without requiring external infrastructure.

Why this shape:

- Embedding, retry, curation, and metadata policy live in one service.
- Vector-store implementation details are replaceable.
- Retrieval can apply relevance, user scoping, active/latest filtering, and memory priority before context reaches the model.

Tradeoff: SQLite cosine search is simple and reviewer-friendly, but it is not a high-scale vector index. Larger deployments should add a dedicated `IVectorStore` adapter such as pgvector, Qdrant, Weaviate, or Pinecone.

## Tool Execution Contract

Model-requested tools pass through a central executor. Each tool has argument validation, a service handler, and output validation that returns confidence and reason fields.

Why this shape:

- Tool calls are not trusted just because the model emitted them.
- Low-confidence external results can be surfaced back into graph reasoning.
- The registry makes tool availability easy to audit.

Tradeoff: confidence scoring is rule-based today. It is useful as a guardrail, but it is not a substitute for full eval coverage.

## Optimistic UI

The app shell updates selected capabilities immediately while lazy imports resolve behind Suspense. Jarvish chat state also treats user interaction as immediate UI state while backend events stream in progressively.

Why this shape:

- The interface feels responsive even when agent work is long-running.
- Loading and streamed states are explicit instead of hidden behind one final response.

Tradeoff: optimistic UI needs rollback/error states wherever the backend can reject an action. That is a priority for session mutations and memory-management actions.

## Known Next Steps

- Add screenshot assets to the README.
- Add unit tests around memory curation and graph routing.
- Add an offline demo mode for reviewers without API keys.
- Reduce Shiki language chunk size through narrower imports or manual chunking.
- Add a high-scale vector-store adapter for deployed environments.
