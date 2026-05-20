# Jarvish Shared Block Contract And Validation - Handoff

## 1. Original Goal & Context

The original issue was that Jarvish frontend block schemas and backend block schemas could drift. The approved direction was **Approach A: Shared in-repo Zod contract module**.

The scope expanded with an additional mission:

- Each agent node and tool should validate its own response.
- Each node/tool should score confidence.
- Invalid node output should be repaired once.
- If still invalid, the system should prefer asking the user for clarification.
- Confidence metadata should be visible to the user in chat.

User-approved decisions:

- `draft.metadata` is part of the shared public block contract.
- `document` remains part of the shared block contract.
- Confidence metadata should be visible in chat.
- For invalid node output after one repair attempt, ask the user for clarification instead of silently wrapping raw content.

## 2. Approved Architecture

Frontend patterns:

- React 19 and TypeScript remain unchanged.
- Jarvish chat state stays local in `useJarvishChat`.
- No global store, URL state, server cache, or persistence changes were introduced.
- Confidence metadata is rendered as reasoning messages in the existing chat flow.
- Existing GraphQL manual `fetch` flow remains; no GraphQL client abstraction was introduced.

State placement:

- Local reducer state remains in `src/features/jarvishAgent/hooks/UseJarvishChat/state.ts`.
- `useJarvishChat` now maintains a `stateRef` for long-running async stream operations to avoid stale closures.
- Request-specific `AbortController` and stream reader cleanup only clears the currently-owned request resources.

Styling structure:

- Styling remains SCSS Modules via `src/features/jarvishAgent/jarvish-agent.module.scss`.
- Remaining inline styles in `JarvishChatArea.tsx` were removed and moved to SCSS module classes.
- `classnames` is used for composed classes.

Backend layer separation:

- GraphQL schema remains the transport contract.
- Agent validation is in `src/Backend/agent/validation/`.
- Tool argument schemas remain in `src/Backend/agent/tools/tool.schemas.ts`.
- Tool execution remains in `src/Backend/agent/tools/tool-executor.ts`.
- Node orchestration remains in existing node files under `src/Backend/agent/nodes/`.

Shared contracts:

- `src/shared/jarvish.blocks.ts` is now the shared Zod source of truth for Jarvish UI block schemas and inferred block types.
- `src/shared/jarvish.constants.ts` remains the shared source for semantic constants such as `BLOCK_TYPES`, `DISPLAY_TYPE`, `TOOL_NAMES`, and `TOOL_CONFIDENCE_THRESHOLD`.

Rejected alternatives:

- Do not make GraphQL SDL the only source of truth for blocks in this scope.
- Do not introduce a real workspace package for contracts.
- Do not add a new frontend global state store.
- Do not add new libraries.
- Do not migrate GraphQL `Message.content` or `AgentEvent.content` from string transport to rich typed block objects in this scope.

## 3. Current Code State

Shared contract:

- `src/shared/jarvish.blocks.ts`
  - New file.
  - Exports `TextBlockSchema`, `CodeBlockSchema`, `ReasoningBlockSchema`, `ActionBlockSchema`, `DataBlockSchema`, `DocumentBlockSchema`, `DraftBlockSchema`, `AgentMessageBlockSchema`, `AgentMessageBlocksSchema`.
  - Exports `AgentMessageBlock` and `AgentMessageBlocks`.
  - Includes `document`.
  - Includes optional `draft.metadata`.

Frontend changes:

- `src/features/jarvishAgent/types.ts`
  - Removed local duplicated block schema definitions.
  - Imports and re-exports `AgentMessageBlockSchema` and `AgentMessageBlock` from `src/shared/jarvish.blocks.ts`.
  - Keeps feature-local app/chat state types.

- `src/features/jarvishAgent/components/Blocks/blockProps.ts`
  - Uses shared `ActionBlockSchema`, `DataBlockSchema`, and `DraftBlockSchema`.
  - `DraftBlockComponentProps` now supports optional `metadata`.

- `src/features/jarvishAgent/constants.ts`
  - GraphQL `AgentChat` subscription now requests `metadata`.
  - Added `UI_STRINGS.CONFIDENCE_NOTE(confidence, reason?)`.

- `src/features/jarvishAgent/utils/eventMapper.ts`
  - Parses optional nullable GraphQL `metadata`.
  - `DomainAgentEvent` now includes `metadata`.

- `src/features/jarvishAgent/hooks/UseJarvishChat/useJarvishChat.ts`
  - Adds `stateRef` to avoid stale async closure reads in long streams.
  - `cancelRequest` reads latest state from `stateRef`.
  - `sendUserMessage` snapshots latest input/messages/attachments from `stateRef` at send time.
  - Request cleanup only clears matching `AbortController` and matching reader.
  - Adds `addConfidenceMessageIfPresent(metadata)` to render confidence metadata as reasoning messages.

- `src/features/jarvishAgent/components/JarvishChatArea.tsx`
  - Removed all inline styles and icon `color="var(...)"` props.
  - Uses module classes for summary heading row, summary icon, placeholder icon circle, CTA sizing, and message list layout.

- `src/features/jarvishAgent/jarvish-agent.module.scss`
  - Added classes:
    - `.summarySectionSpaced`
    - `.summaryHeadingRow`
    - `.summaryIconSmall`
    - `.summaryHeading`
    - `.summaryActionButton`
    - `.placeholderIconCircle`
    - `.messageList`

- Generated files changed by `npm run codegen`:
  - `src/features/jarvishAgent/graphql/__generated__/gql.ts`
  - `src/features/jarvishAgent/graphql/__generated__/graphql.ts`

Backend changes:

- `src/Backend/agent/schema.ts`
  - Re-exports shared block schemas/types from `src/shared/jarvish.blocks.ts`.
  - No longer owns duplicate block schema definitions.

- `src/Backend/agent/validation/node-response.validator.ts`
  - New file.
  - Exports:
    - `validateNodeResponseContent(content)`
    - `validateOrRepairNodeResponse(content, repairContent)`
    - `buildNodeResponseRepairPrompt(originalContent, reason)`
    - `createClarificationBlockContent(reason)`
    - `formatConfidenceStatus(status, confidence, reason)`
  - Uses `AgentMessageBlocksSchema` from shared contract.
  - Repairs invalid node output once.
  - If repair fails, returns a valid clarification text block and confidence `0`.

- `src/Backend/agent/validation/tool-output.validator.ts`
  - New file.
  - Exports `validateToolOutput(toolName, output)`.
  - Scores empty, failed, no-result, structured, primitive, and web-search-without-url outputs.

- `src/Backend/agent/nodes/supervisor.ts`
  - Uses `validateOrRepairNodeResponse`.
  - Adds confidence and validation reason into metadata.
  - Empty/non-delegating output becomes clarification block.

- Worker nodes now validate/repair final user-facing output and publish confidence metadata:
  - `src/Backend/agent/nodes/workers/research.ts`
  - `src/Backend/agent/nodes/workers/google.ts`
  - `src/Backend/agent/nodes/workers/coder.ts`

- `src/Backend/agent/nodes/clarification.ts`
  - Validates/repairs its own clarification response.
  - Publishes confidence metadata.

- Operational nodes now publish confidence metadata:
  - `src/Backend/agent/nodes/context.ts`
  - `src/Backend/agent/nodes/processing.ts`
  - `src/Backend/agent/nodes/archive.ts`

- `src/Backend/agent/nodes/tools.ts`
  - Uses `executeAgentTool` result `{ output, confidence, valid, reason }`.
  - Tracks minimum confidence.
  - Adds reason summary to metadata.
  - If below `TOOL_CONFIDENCE_THRESHOLD`, existing router sends to clarification.

- `src/Backend/agent/tools/tool.schemas.ts`
  - Added `InventoryToolArgsSchema`.

- `src/Backend/agent/tools/tool-executor.ts`
  - Uses existing tool arg schemas.
  - Uses new `validateToolOutput`.
  - Returns `valid` and `reason`.
  - Uses `unknown` in catch block instead of `any`.
  - Wires existing declared `TOOL_NAMES.CHECK_INVENTORY` to `checkInventory`.

- `src/Backend/graphql/services/agent-event.service.ts`
  - Emits `metadata` on `AgentEvent`.
  - Status events carry confidence metadata.
  - Error events carry confidence `0` and validation reason.
  - Message events intentionally set `metadata: null` to avoid duplicate confidence messages.

Dependency/environment assumptions:

- React 19, TypeScript, Vite.
- Node backend with GraphQL Yoga and LangGraph.
- Zod already exists in dependencies.
- `partial-json-parser` already exists and is reused.
- `npm run codegen`, `npm run build`, `npm run lint`, and `npx tsc --noEmit` are available.

## 4. Current Technical Constraints

Repo conventions:

- Prefer `rg` for search.
- Use `apply_patch` for manual edits.
- Do not revert unrelated dirty worktree changes.
- Keep changes scoped to Jarvish contract/validation/chat cleanup.

Testing limitations:

- No dedicated unit test harness was added.
- Verification currently relies on codegen, build, TypeScript output review, lint output review, and `tsx` smoke command.

Known lint/build constraints:

- `npm run build` passes.
- `npm run lint -- --no-warn-ignored` fails on existing unrelated issue:
  - `vite.config.js:10:25 '__dirname' is not defined no-undef`
- `npx tsc --noEmit --pretty false` fails on existing unrelated playground feature errors:
  - `src/features/createMyStore/appStore.ts`
  - `src/features/FileSystemTree/FileSystemTreeDemo.tsx`
  - `src/features/FormBuilder/FormBuilder.tsx`
  - `src/features/ImageCarousel/ImageCarousel.tsx`
  - `src/features/InfiniteScroll/InfiniteVirtualizedScroll/InfiniteVirtualizedScrollDemo.tsx`
  - `src/features/SearchAutocomplete/SearchAutocomplete.tsx`
  - `src/features/TheSilentInterval/*`
  - `src/features/TW/send-troops-modal.tsx`
  - `src/features/Virtualization/DynamicVirtualList.tsx`
- After the latest changes, `npx tsc --noEmit --pretty false` did not report errors from touched Jarvish/backend files.

API contracts:

- GraphQL `AgentEvent` already has `metadata: JSON`; no schema field was added.
- Frontend `AgentChat` subscription now selects `metadata`.
- GraphQL event type values remain uppercase on the transport layer.
- Shared domain event values remain lowercase.

Style rules:

- No new inline styles in `JarvishChatArea.tsx`.
- SCSS Modules are used for Jarvish styling.
- `classnames` is used where classes are composed.

## 5. Reuse & DRY Notes

Reused:

- `src/shared/jarvish.constants.ts`
  - `BLOCK_TYPES`
  - `DISPLAY_TYPE`
  - `TOOL_NAMES`
  - `TOOL_CONFIDENCE_THRESHOLD`

- Existing frontend parser:
  - `src/features/jarvishAgent/utils/parser.ts`
  - Continues validating parsed blocks through `AgentMessageBlockSchema`, now shared.

- Existing GraphQL transport/codegen:
  - `src/Backend/graphql/schema.ts`
  - `codegen.ts`
  - Generated frontend/backend GraphQL types.

- Existing backend graph routing:
  - `toolsRouter` still sends low confidence to `clarificationNode`.
  - No graph topology change was needed.

- Existing services/tools:
  - `searchWeb`
  - `fetchWebPage`
  - `readPdf`
  - `readFile`
  - `writeFile`
  - Google service functions
  - memory service functions
  - `checkInventory`

- Existing `JarvishChatArea` structure and SCSS module file.

Intentionally not used/added:

- No new frontend state library.
- No GraphQL client abstraction.
- No new package/workspace boundary.
- No new validation library.
- No GraphQL block-object migration.
- No broad cleanup of unrelated inline styles outside `JarvishChatArea.tsx`.

## 6. Active or Unresolved Risks

Reviewer concerns:

- Confidence visibility is implemented as reasoning messages. This satisfies the requirement but may feel noisy during streaming.
- Deterministic confidence scoring is intentionally simple and heuristic. It may over-score or under-score edge cases.
- Invalid node output repair adds one additional model call when output is malformed, which may increase latency/cost.

Performance risks:

- Vite build still reports large chunk warnings, especially Shiki/Recharts-related chunks. This predates this work.
- Confidence messages add extra chat messages and may slightly increase render work during long streams.

Edge cases:

- `useJarvishChat` stale async risks were reduced with `stateRef` and request-owned cleanup, but the hook still uses manual SSE parsing and reducer dispatches during long streams.
- If many status events include confidence metadata, users may see many confidence reasoning entries.
- Tool output validation is generic; per-tool richer schema validation could be improved later if needed.

Open type definitions:

- Existing unrelated `any` usages remain elsewhere in the repo. Touched files were kept tighter where scoped.
- `GraphQL JSON` metadata is typed as `unknown` on the frontend. Runtime guards are used before reading confidence.

Uncertain requirements:

- No explicit UX design was provided for confidence display. Current implementation uses the existing reasoning-message pattern.
- No explicit confidence scoring rubric was provided. Current implementation uses deterministic operational checks.

## 7. Exact Next Recommended Step

Run a real manual Jarvish chat streaming test in the app with the backend running and verify confidence metadata appears in the chat, invalid/low-confidence paths route to clarification, and normal valid block responses still render correctly.

## 8. Success Evidence

Commands already run successfully:

```bash
npm run codegen
```

Result: passed.

```bash
npm run build
```

Result: passed. Large chunk warnings remain.

```bash
npx tsx -e "import { BLOCK_TYPES } from './src/shared/jarvish.constants.ts'; import { AgentMessageBlocksSchema } from './src/shared/jarvish.blocks.ts'; import { validateNodeResponseContent, validateOrRepairNodeResponse } from './src/Backend/agent/validation/node-response.validator.ts'; import { validateToolOutput } from './src/Backend/agent/validation/tool-output.validator.ts'; import { parseAgentEventPayload } from './src/features/jarvishAgent/utils/eventMapper.ts'; void (async () => { const valid = AgentMessageBlocksSchema.parse([{ type: BLOCK_TYPES.DOCUMENT, title: 'Doc', content: 'ok' }, { type: BLOCK_TYPES.DRAFT, content: 'draft', metadata: { source: 'test' } }]); if (valid.length !== 2) throw new Error('shared block schema failed'); const nodeValid = validateNodeResponseContent(JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: 'ok' }])); if (!nodeValid.valid || nodeValid.confidence !== 100) throw new Error('node validation failed'); const repaired = await validateOrRepairNodeResponse('not json', async () => JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: 'fixed' }])); if (!repaired.valid || !repaired.repaired) throw new Error('repair validation failed'); const toolInvalid = validateToolOutput('web_search', 'No results found'); if (toolInvalid.valid || toolInvalid.confidence >= 70) throw new Error('tool low confidence failed'); const parsed = parseAgentEventPayload({ agentEvents: { type: 'STATUS', content: 'ok', stage: 1, metadata: { confidence: 88, validationReason: 'checked' } } }); if ((parsed.metadata as { confidence?: number } | null | undefined)?.confidence !== 88) throw new Error('metadata parse failed'); console.log('shared contract and confidence smoke passed'); })();"
```

Result: `shared contract and confidence smoke passed`.

```bash
rg -n "style=\{|color=\"var\(" src/features/jarvishAgent/components/JarvishChatArea.tsx
```

Result: no matches.

Known blocked checks:

```bash
npx tsc --noEmit --pretty false
```

Result: fails on existing unrelated playground feature errors; no touched Jarvish/backend files reported.

```bash
npm run lint -- --no-warn-ignored
```

Result: fails on existing unrelated `vite.config.js` `__dirname` lint issue.

Recommended manual verification flow:

1. Start the app using the project’s normal workflow:

```bash
npm start
```

2. Open the Vite app.
3. Create or select a Jarvish session.
4. Send a normal request that produces a valid answer.
5. Confirm:
   - Status updates still render.
   - Assistant messages still render block content.
   - Confidence appears in the chat as reasoning information.
   - No duplicate confidence messages appear for the same assistant message payload.
6. Send or simulate a request that causes low-confidence/no-result tool output.
7. Confirm:
   - Tool confidence below threshold routes to clarification.
   - Clarification is rendered as valid UI block content.
8. Cancel a long-running request.
9. Confirm:
   - Recovery note uses the latest status logs/current stage.
   - A canceled request does not clear a newer request’s reader/controller.

Screenshots/logs not yet captured:

- No Playwright/browser screenshot was captured in this session.
- No live backend streaming manual test was run in this session.

`interview.html` and `state.html`:

- No update was needed. They are static/context pages and did not contain mission-specific state that needed synchronization.
