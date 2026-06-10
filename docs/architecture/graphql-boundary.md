# GraphQL Boundary

The frontend talks to Jarvish through GraphQL Yoga. The schema is defined in `src/backend/graphql/schema.ts`, resolver composition starts in `src/backend/graphql/resolvers.ts`, and the frontend generated client lives under `src/frontend/features/jarvishAgent/graphql/__generated__`.

## API Shape

Queries:

- `status`
- `getSessions`
- `getSessionHistory`
- `getSessionSummary`
- `getStructuredFacts`

Mutations:

- `createSession`
- `startResearch`
- `deleteSession`
- `deleteStructuredFact`

Subscription:

- `agentEvents`

## Agent Event Stream

`agentEvents` is the live boundary between the LangGraph workflow and the React chat surface. It streams status, reasoning, message, retry, and error events so the UI can show progressive agent state rather than waiting for one final response.

## Contract Strategy

GraphQL codegen writes server resolver types and frontend operation types from the same schema. Shared block constants and schemas stay in `src/shared`, while transport-specific mapping stays in `src/backend/graphql/mappers` and `src/frontend/features/jarvishAgent/utils`.
