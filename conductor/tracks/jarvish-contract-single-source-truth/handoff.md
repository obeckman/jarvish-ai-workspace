# Jarvish Contract Single Source Of Truth - Handoff

## 1. Original Goal & Context

The task was to verify and reduce wrong duplication across the frontend/backend communication types for the Jarvish Agent. The suspected duplication involved:

- `src/features/jarvishAgent/graphql`
- `src/shared/jarvish.constants.ts`
- `src/Backend/agent/contracts/state.contract.ts`
- `src/Backend/graphql/__generated__/resolvers-types.ts`

The approved goal was not to collapse every type into one file. The goal was to establish the correct source of truth per boundary:

- Shared domain constants own semantic values used across FE/BE.
- GraphQL schema/codegen owns transport payload shapes.
- Zod remains only for runtime validation at unsafe boundaries such as SSE/raw `fetch`.
- Backend agent contracts remain backend-internal unless they truly describe the public API.

## 2. Approved Architecture

Approved approach: Approach B, "Shared domain contract as the single source for semantic constants, GraphQL as transport contract."

Frontend patterns:

- Keep Jarvish chat state local in `useJarvishChat`.
- Do not introduce global state, URL state, persistence, or server cache for this task.
- Use generated GraphQL operation types for network payloads.
- Use shared constants for semantic domain values such as event types, roles, stages, statuses, and block types.
- Use runtime parsing only at unsafe boundaries, especially SSE stream events.

Styling structure:

- No styling work was needed.
- Existing SCSS Modules and `classnames` convention remains unchanged.
- No inline styles were introduced.

Backend layer separation:

- GraphQL schema and generated resolver types remain the transport layer.
- Resolver/service code maps between GraphQL transport values and shared domain constants.
- Mapping logic is isolated in dedicated mapper files.
- Agent contracts remain internal to the backend agent layer.

Shared contracts:

- `src/shared/jarvish.constants.ts` remains the semantic source for Jarvish domain constants.
- GraphQL generated types remain the source for transport request/response shapes.
- Explicit event mappers bridge casing/value differences between the two.

Rejected alternatives:

- Rejected making GraphQL SDL the only source of truth for all values, because UI block types and backend agent semantics are not all public API.
- Rejected making Zod schemas the only source of truth, because that would add another competing schema layer unless GraphQL was generated from Zod.
- Rejected broad new abstractions, new libraries, or global state.

## 3. Current Code State

Runtime/source files changed by the implementation:

- `src/shared/jarvish.constants.ts`
  - Added `EVENT_TYPES.RETRY = 'retry'` so shared domain constants cover the full GraphQL `EventType` enum.

- `src/Backend/graphql/mappers/event.mapper.ts`
  - New file.
  - Exports `DOMAIN_TO_GRAPHQL_EVENT_TYPE`.
  - Exports `mapDomainEventTypeToGraphQL(type)`.
  - Maps lowercase shared domain values to generated GraphQL enum values from `resolvers-types.ts`.

- `src/Backend/graphql/services/agent-event.service.ts`
  - Emits `AgentEvent` transport payloads using `mapDomainEventTypeToGraphQL`.
  - Event `type` is now the GraphQL enum transport value.
  - `stage` is explicitly `number | null` on emitted payloads.
  - Error stream payload now emits a typed GraphQL `ERROR` event.

- `src/Backend/graphql/resolvers.ts`
  - Removed the previous enum resolver built from shared lowercase `EVENT_TYPES`.
  - Resolver object is typed as `Resolvers<GraphQLContext>`.
  - Resolver parameters were tightened to avoid local `any` annotations in touched code.
  - Subscription `resolve` payload is typed as `{ agentEvents: AgentEvent }`.

- `src/Backend/graphql/mappers/message.mapper.ts`
  - Exported `RawGraphMessage` so session service can avoid `any` for graph message mapping.

- `src/Backend/graphql/services/session.resolver.service.ts`
  - Replaced `message: any` with `RawGraphMessage` narrowing.
  - Defensively handles missing/non-array graph state messages and logs an empty-history debug message.

- `src/features/jarvishAgent/utils/eventMapper.ts`
  - New file.
  - Runtime-validates raw GraphQL SSE payload shape with Zod.
  - Maps GraphQL transport event types (`STATUS`, `MESSAGE`, etc.) to shared domain event values (`status`, `message`, etc.).
  - Exports `parseAgentEventPayload(payload)`.

- `src/features/jarvishAgent/types.ts`
  - Removed duplicate local GraphQL response Zod schemas:
    - `SessionHistoryItemSchema`
    - `GetSessionHistoryResponseSchema`
    - `AgentEventDataSchema`
    - `AgentEventsSubscriptionResponseSchema`
    - `GetSessionSummaryResponseSchema`
    - `GetStructuredFactsResponseSchema`
  - UI/domain block and chat state types remain.

- `src/features/jarvishAgent/utils/messageNormalizer.ts`
  - Now consumes `GetSessionHistoryQuery["getSessionHistory"][number]` from generated GraphQL types.
  - Adds defensive role normalization from history strings into shared `MessageRole`.
  - Unknown roles default to `ROLES.AGENT` with a console warning.

- `src/features/jarvishAgent/hooks/UseJarvishChat/useJarvishChat.ts`
  - `loadSessionHistory` now uses generated `GetSessionHistoryQuery` and handles HTTP errors, GraphQL errors, missing data, and empty history.
  - SSE processing now uses `parseAgentEventPayload`.
  - Handles `STATUS`, `REASONING`, `MESSAGE`, `ERROR`, and `RETRY` explicitly.
  - Malformed stream events produce a granular `Failed to parse SSE event` error and console warning.
  - Catch block for send request changed from `any` to `unknown`.

- `src/features/jarvishAgent/hooks/useJarvishSessions.ts`
  - Removed duplicate Zod summary response schema usage.
  - Uses generated `GetSessionSummaryQuery`.
  - Handles HTTP and GraphQL errors before updating local state.

- `src/features/jarvishAgent/hooks/useJarvishMemory.ts`
  - Removed duplicate Zod structured facts schema usage.
  - Uses generated `GetStructuredFactsQuery`.
  - Handles HTTP and GraphQL errors and sets empty facts when data is absent.

Generated files:

- No codegen files were intentionally changed in this session.
- `npm run codegen` was not required because the GraphQL schema and operations were not changed.

Unrelated working tree change observed before handoff:

- `conductor/prompts/Stage 1: The Brief & Alignment.html` is modified in the working tree.
- This was not part of the Jarvish implementation and should not be reverted without user approval.

Dependency/environment assumptions:

- Project stack: React 19, TypeScript, Vite, Node.js backend, GraphQL Yoga, GraphQL Codegen, Zod.
- Package scripts available:
  - `npm run build`
  - `npm run lint`
  - `npm run codegen`
  - `npm run server`
  - `npm run dev`
  - `npm start`

## 4. Current Technical Constraints

Repo conventions:

- Prefer `rg` for search.
- Use `apply_patch` for file edits.
- Do not revert unrelated dirty worktree changes.
- Keep changes scoped and avoid broad refactors.
- Avoid magic strings by using shared constants or generated types.
- Avoid unnecessary abstractions.

Frontend constraints:

- React 19 with TypeScript.
- State should stay local unless lifecycle requirements justify otherwise.
- Styling uses SCSS Modules and `classnames`.
- No inline styles.
- Components should stay modular and single-purpose.

Backend constraints:

- Clean Architecture preference: routing/entry points, validation, services/use-cases, and mappers should remain separate.
- GraphQL schema/codegen owns API transport types.
- Shared constants own cross-boundary semantic values.
- Backend agent contracts are internal unless they are explicitly public DTOs.

API contract constraints:

- GraphQL `EventType` enum is uppercase on the transport layer:
  - `STATUS`
  - `MESSAGE`
  - `REASONING`
  - `ERROR`
  - `RETRY`
- Shared `EVENT_TYPES` values are lowercase domain values:
  - `status`
  - `message`
  - `reasoning`
  - `error`
  - `retry`
- Explicit mapper functions bridge the casing and source-of-truth boundary.

Testing and verification limitations:

- `npm run build` passes.
- `npm run lint` is blocked by an existing unrelated lint error in `vite.config.js`:
  - `__dirname is not defined no-undef`
- `npx tsc --noEmit` is blocked by existing unrelated TypeScript errors in other playground features:
  - `src/features/createMyStore/appStore.ts`
  - `src/features/FileSystemTree/FileSystemTreeDemo.tsx`
  - `src/features/FormBuilder/FormBuilder.tsx`
  - `src/features/ImageCarousel/ImageCarousel.tsx`
  - `src/features/InfiniteScroll/InfiniteVirtualizedScroll/InfiniteVirtualizedScrollDemo.tsx`
  - `src/features/SearchAutocomplete/SearchAutocomplete.tsx`
  - `src/features/TheSilentInterval/TheSilentInterval.tsx`
  - `src/features/TW/send-troops-modal.tsx`
  - `src/features/Virtualization/DynamicVirtualList.tsx`
- After the implementation fix, `npx tsc --noEmit` no longer reported errors from the touched Jarvish/backend GraphQL files.
- Focused `npx eslint <touched-files>` was not meaningful because the current ESLint config ignored those TypeScript paths and emitted "File ignored because no matching configuration was supplied" warnings.

## 5. Active or Unresolved Risks

Open assumptions:

- Assumption: GraphQL event values should stay uppercase externally, while shared domain event constants stay lowercase internally.
- Assumption: persisted session history may include arbitrary role strings, so `Message.role` and `MessageInput.role` were not changed to GraphQL enums.
- Assumption: keeping manual `fetch` is acceptable for now; no GraphQL client/helper abstraction was introduced.

Reviewer concerns:

- The frontend still has repeated manual GraphQL response envelope handling across hooks.
- A reviewer may prefer a tiny shared `GraphQLResponse<T>` helper, but that was not added to avoid broadening scope.
- Existing generated fragment masking forces casts in session/fact hooks; this remains from prior code.

Runtime risks:

- `useJarvishChat` still has existing stale async risks around long-running streams and reducer state captured in callback dependencies.
- SSE parsing now validates event shape, but it still expects GraphQL Yoga stream lines in `data: { data: { agentEvents: ... } }` shape.
- Unknown event types now surface as errors instead of silently falling through.
- Unknown history roles default to `agent`, which is safe for rendering but may hide upstream data drift.

Performance risks:

- Build reports large chunk warnings, including large Shiki/Recharts-related chunks.
- No performance optimization was attempted because it is outside this contract cleanup.

## 6. Exact Next Recommended Step

Run a real manual Jarvish chat streaming verification through the app and backend to confirm GraphQL Yoga emits uppercase `EventType` values and the frontend maps them back to lowercase domain events without UI regressions.

## 7. Success Evidence

Already collected:

- `npm run build`
  - Result: passed.
  - Notes: Vite build completed successfully. Large chunk warnings remain.

- Event mapper smoke command:
  - Command:
    ```bash
    npx tsx -e "import { EVENT_TYPES } from './src/shared/jarvish.constants.ts'; import { mapDomainEventTypeToGraphQL } from './src/Backend/graphql/mappers/event.mapper.ts'; import { parseAgentEventPayload } from './src/features/jarvishAgent/utils/eventMapper.ts'; const gqlType = mapDomainEventTypeToGraphQL(EVENT_TYPES.STATUS); const parsed = parseAgentEventPayload({ agentEvents: { type: gqlType, content: 'ok', stage: 1 } }); if (gqlType !== 'STATUS' || parsed.type !== EVENT_TYPES.STATUS || parsed.content !== 'ok' || parsed.stage !== 1) { throw new Error('event mapper smoke failed'); } console.log('event mapper smoke passed');"
    ```
  - Result: `event mapper smoke passed`.

Known blocked checks:

- `npm run lint`
  - Current result: fails on unrelated `vite.config.js` `__dirname` lint issue.

- `npx tsc --noEmit`
  - Current result: fails on unrelated existing playground feature errors.
  - Expected for this task: no errors from touched Jarvish/backend GraphQL files.

Recommended manual verification flow:

1. Start the backend and frontend using the project’s normal workflow:
   ```bash
   npm start
   ```
2. Open the Vite app.
3. Use the Jarvish Agent chat.
4. Send a message that triggers streaming.
5. Confirm:
   - Status events display as status updates.
   - Message events render assistant messages.
   - Reasoning events render reasoning blocks.
   - No `Unsupported agent event type` error appears.
   - No `Failed to parse SSE event` error appears for valid events.
   - Browser network stream shows GraphQL event types as uppercase enum values.
6. Load an existing session history.
7. Confirm:
   - Empty history displays safely.
   - User messages render as user messages.
   - Assistant/model/agent messages render as agent messages.
   - Reasoning messages render as reasoning messages.

