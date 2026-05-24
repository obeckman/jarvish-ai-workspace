# Review History Message IDs - Handoff

## 1. Original Goal & Context

The task was to address a review note in the Jarvish chat feature:

- Source: current diff / current code state.
- Issue: `useJarvishChat.ts` used `Math.random()` when creating reasoning/history-adjacent message IDs.
- Goal: replace random IDs with stable deterministic IDs where rendering or replay needs consistency.

Important context discovered before implementation:

- Loaded session history is normalized in `src/features/jarvishAgent/utils/messageNormalizer.ts`.
- History IDs already used `createHistoryMessageId(messageIndex, blockIndex)` from `src/features/jarvishAgent/utils/messageIds.ts`.
- Live reasoning messages in `src/features/jarvishAgent/hooks/UseJarvishChat/useJarvishChat.ts` used:
  - `` `reason-content-${Date.now()}-${Math.random()}` ``
- Live user and assistant message IDs used raw timestamp strings:
  - `Date.now().toString()`
  - `(Date.now() + 1).toString()`

The approved scope was frontend-only and limited to the Jarvish message ID path.

## 2. Approved Architecture

Approved approach: **Approach A - frontend-derived deterministic IDs using existing utilities**.

Frontend patterns:

- Keep message ID generation frontend-local.
- Centralize ID creation through `src/features/jarvishAgent/utils/messageIds.ts`.
- Keep chat state local in `useJarvishChat`.
- Use a local `useRef` counter for streamed reasoning event sequence IDs.
- Do not add new components, hooks, services, global stores, URL state, persistence, server cache, or frontend API wrappers.

State placement:

- `reasoningMessageSequenceRef` is stored locally in `useJarvishChat`.
- The sequence counter resets when a new `sendUserMessage` request starts.
- No reducer state was added because the sequence is an internal render-key detail and does not need to trigger renders.

Styling structure:

- No styling changes were required.
- Existing SCSS Modules and `classnames` conventions remain unchanged.
- No inline styles were introduced.

Backend layer separation:

- No backend files were changed.
- GraphQL schema, resolvers, mappers, services, data layer, and generated types remain unchanged.
- Existing Clean Architecture boundaries remain intact.

Shared contracts:

- No shared transport contract changes were made.
- GraphQL `Message` still exposes `type`, `role`, and `content`; it does not expose a backend-owned message `id`.
- `messageIds.ts` remains the frontend utility surface for UI message IDs.

Rejected alternatives:

- Rejected backend-owned history IDs because this task did not require durable business identity or GraphQL schema/codegen changes.
- Rejected content hashing/fingerprints because existing index-based history IDs were already deterministic for stable history order and hashing would add unnecessary complexity.
- Rejected global state or persistence because IDs are local UI/render concerns.

## 3. Current Code State

Files changed by this task:

- `src/features/jarvishAgent/hooks/UseJarvishChat/useJarvishChat.ts`
  - Imports existing ID helpers:
    - `createAssistantMessageId`
    - `createReasoningMessageId`
    - `createUserMessageId`
  - Adds local ref:
    - `reasoningMessageSequenceRef = useRef(0)`
  - Replaces random reasoning IDs with deterministic parent-message-plus-sequence IDs:
    - `createReasoningMessageId(assistantMsgId, sequence)`
  - Resets the reasoning sequence at the start of each send request:
    - `reasoningMessageSequenceRef.current = 0`
  - Replaces raw user timestamp ID generation with:
    - `createUserMessageId(userMessageTimestamp)`
  - Replaces raw assistant timestamp ID generation with:
    - `createAssistantMessageId(Date.now())`
  - Preserves existing message timestamps and all existing async/network behavior.

- `src/features/jarvishAgent/utils/messageIds.ts`
  - Keeps existing helpers:
    - `createHistoryMessageId(messageIndex, blockIndex)`
    - `createAssistantMessageId(timestamp)`
    - `createUserMessageId(timestamp)`
  - Updates `createReasoningMessageId` signature from `(timestamp: number, sequence: number)` to `(parentMessageId: string, sequence: number)`.
  - New reasoning ID format:
    - `reasoning-${parentMessageId}-${sequence}`

Important existing functions/components/endpoints:

- `normalizeHistoryMessages(historyMessages)` in `src/features/jarvishAgent/utils/messageNormalizer.ts`
  - Still owns frontend conversion from `GetSessionHistoryQuery["getSessionHistory"]` into UI `Message[]`.
  - Still uses `createHistoryMessageId(messageIndex, blockIndex)`.

- `processStreamLines(assistantMsgId, lines)` in `useJarvishChat.ts`
  - Still parses SSE `data:` lines.
  - Still narrows events through `parseAgentEventPayload`.
  - Now uses `assistantMsgId` as the stable parent for reasoning event IDs during one request.

- GraphQL endpoint:
  - `API_ENDPOINTS.GRAPHQL`
  - Unchanged.

Known dependency/environment assumptions:

- React 19, TypeScript, Vite.
- Node.js backend with GraphQL Yoga.
- Styling is SCSS Modules with `classnames`, though this task did not touch styles.
- No test runner script exists in `package.json`.
- `npm run build` is the strongest currently passing whole-app verification command.

Implementation files changed for this task:

- `src/features/jarvishAgent/hooks/UseJarvishChat/useJarvishChat.ts`
- `src/features/jarvishAgent/utils/messageIds.ts`
- `conductor/tracks/review-history-message-ids/handoff.md`

Current `git status --short` after creating this handoff showed only the new handoff directory as untracked. The implementation files above already contain the approved code state in the workspace.

## 4. Current Technical Constraints

Repo conventions:

- Use `rg` for code search.
- Use `apply_patch` for file edits.
- Do not revert unrelated dirty worktree changes.
- Keep changes scoped and avoid broad refactors.
- Reuse existing utilities before adding new abstractions.
- Avoid `any`; use `unknown` only at untrusted runtime boundaries and narrow immediately.

Frontend constraints:

- React 19 with TypeScript.
- Keep state local unless broader lifecycle requirements justify otherwise.
- Styling uses SCSS Modules and `classnames`.
- No inline styles.
- Extract static labels/configuration into constants when adding UI; no UI was added here.

Backend constraints:

- Clean Architecture preference: routes/entry points, services/use-cases, validation, mappers, and data access stay separate.
- No backend changes are currently needed for the approved approach.

API contract constraints:

- GraphQL `getSessionHistory` returns message objects with:
  - `type`
  - `role`
  - `content`
- It does not return message IDs.
- Frontend history ID stability depends on stable backend history ordering.

Testing limitations:

- `package.json` has no test script.
- Full lint is currently blocked by an unrelated existing error:
  - `vite.config.js:10:25 '__dirname' is not defined no-undef`
- Full TypeScript check is currently blocked by unrelated existing errors in other playground features.
- Focused ESLint on touched TypeScript files is not meaningful because the current ESLint config ignores those paths and reports "File ignored because no matching configuration was supplied".

Build constraints:

- `npm run build` passes after this task.
- Build emits existing large chunk warnings, but exits successfully.

## 5. Reuse & DRY Notes

Reused:

- `src/features/jarvishAgent/utils/messageIds.ts`
  - Existing ID utility surface.

- `src/features/jarvishAgent/utils/messageNormalizer.ts`
  - Existing history normalization and history ID path.

- `src/features/jarvishAgent/hooks/UseJarvishChat/useJarvishChat.ts`
  - Existing local reducer/hook state model.
  - Existing `useRef` pattern for non-rendering mutable request internals:
    - `abortControllerRef`
    - `readerRef`
    - `stateRef`

- `src/features/jarvishAgent/utils/eventMapper.ts`
  - Existing SSE runtime validation/narrowing boundary remains unchanged.

Intentionally not used:

- Backend GraphQL schema/mappers/services were not used for ID ownership because Approach A explicitly keeps IDs frontend-derived.
- No hash/fingerprint utility was added because existing deterministic index IDs and per-request sequence IDs satisfy the approved requirement with less complexity.
- No test harness was added because the repo has no existing test setup and adding one would exceed this task's scope.

DRY decisions:

- Removed ad hoc ID string construction from `useJarvishChat.ts`.
- Kept all Jarvish UI message ID formats in `messageIds.ts`.
- Used one local sequence counter for all reasoning events in a request instead of duplicating timestamp/random logic.

## 6. Active or Unresolved Risks

Assumptions:

- Loaded history order from `getSessionHistory` is stable for a given session checkpoint.
- History IDs only need to be deterministic relative to stable history ordering.
- Live streamed reasoning IDs only need to be deterministic and unique within the active request lifecycle.
- Timestamp-based live user/assistant IDs are acceptable when wrapped by the existing helper functions.

Reviewer concerns:

- Live assistant `MESSAGE` blocks still share the same `assistantMsgId` within a streamed response when multiple assistant blocks are parsed from one agent message. This was existing behavior and was not expanded in this task, but it remains the most likely React key concern beyond the original `Math.random()` issue.
- `createAssistantMessageId(Date.now())` and `createUserMessageId(Date.now())` are not replay-stable across identical live sends. They are centralized but still time-based.
- `createHistoryMessageId(messageIndex, blockIndex)` changes if backend history ordering changes.

Potential missed edge cases:

- If a single request somehow processes duplicate reasoning sequences after a manual retry without resetting, duplicate IDs could occur. Current implementation resets at the start of each `sendUserMessage`.
- If two sends could run concurrently, the shared local sequence ref could interleave. Current hook prevents sends while `status !== AGENT_STATUS.IDLE`, so concurrent sends should not occur.
- If a request fails while fetching headers before the SSE stream starts, `reasoningMessageSequenceRef` has still been reset. This is acceptable because it is scoped to the next request attempt.

Known unrelated repo issues:

- `npm run lint` fails on `vite.config.js` due to `__dirname` in ESM lint context.
- `npx tsc --noEmit` fails on unrelated playground feature files.
- `rg "Math\\.random" src -n` still finds unrelated examples in:
  - `src/features/RetryMechanism/RetryMechanism.tsx`
  - `src/features/TimeSeriesWidget/TimeSeriesWidget.tsx`
  - `src/features/ReliableSubmit/submitFunctions.ts`
  - `src/features/ApiRaceCondition/ApiRaceCondition.tsx`

## 7. Exact Next Recommended Step

Have a reviewer decide whether the remaining live assistant message ID reuse should be fixed now.

Single action:

- Inspect `processStreamLines` in `src/features/jarvishAgent/hooks/UseJarvishChat/useJarvishChat.ts` and decide whether assistant `MESSAGE` blocks should receive deterministic per-block IDs such as `assistant-${requestTimestamp}-${messageSequence}` instead of sharing one `assistantMsgId` for all parsed blocks in a response.

Do not change backend contracts unless the reviewer explicitly decides message identity must become durable server data.

## 8. Success Evidence

Verification already run:

- Command:
  - `rg "Math\\.random|Date\\.now\\(\\)\\.toString\\(\\)|Date\\.now\\(\\) \\+ 1|reason-content" src/features/jarvishAgent -n`
  - Expected result: no old random/raw Jarvish chat ID construction.
  - Actual result: pass.

- Command:
  - `npm run build`
  - Expected result: production build succeeds.
  - Actual result: pass.

- Command:
  - `git diff --check`
  - Expected result: no whitespace errors.
  - Actual result: pass.

Verification attempted with known blockers:

- Command:
  - `npm run lint`
  - Expected result: ideally pass.
  - Actual result: fails on unrelated existing issue:
    - `vite.config.js:10:25 '__dirname' is not defined no-undef`

- Command:
  - `npx tsc --noEmit`
  - Expected result: ideally pass.
  - Actual result: fails on unrelated existing TypeScript errors in other playground features; no errors were reported from the touched Jarvish files in the captured output.

- Command:
  - `npx eslint src/features/jarvishAgent/hooks/UseJarvishChat/useJarvishChat.ts src/features/jarvishAgent/utils/messageIds.ts`
  - Expected result: ideally pass.
  - Actual result: no errors, but ESLint ignored both files due to current config:
    - `File ignored because no matching configuration was supplied`

Recommended manual flow if the next session continues:

1. Start the existing app only if explicitly approved:
   - `npm start`
2. Open Jarvish chat.
3. Load an existing session history and confirm messages render without React duplicate-key warnings.
4. Send a prompt that produces multiple reasoning events.
5. Confirm reasoning steps render with deterministic IDs and no console warnings about duplicate keys.
6. Cancel and resend a prompt; confirm reasoning sequence resets and no duplicate keys appear within the new request.

`interview.html` and `state.html` were not updated because this handoff only documents project state and no application/runtime state artifact needed to change.
