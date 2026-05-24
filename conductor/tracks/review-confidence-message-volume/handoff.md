# Review Confidence Message Volume - Handoff

## 1. Original Goal & Context

The task was to review and reduce chat noise caused by streamed confidence metadata in Jarvish.

Prior implementation state:

- Backend status events can carry `metadata.confidence` and `metadata.validationReason`.
- Frontend `useJarvishChat` rendered each confidence metadata payload as a separate reasoning message via `addConfidenceMessageIfPresent`.
- Long multi-node streams could therefore add many confidence-only reasoning entries to `messages`, increasing visible noise and render work.

Approved goal:

- Keep confidence visible to the user.
- Prevent the chat/reasoning message list from becoming noisy during long multi-node streams.
- Preserve existing backend stream contract and normal message/status behavior.

## 2. Approved Architecture

Approved approach: **Approach A - Frontend Confidence Aggregation**.

Frontend patterns:

- Keep the fix frontend-only unless blocked.
- Keep state local in the existing Jarvish chat reducer/hook.
- Continue using manual GraphQL/SSE stream parsing through the existing `parseAgentEventPayload` trust boundary.
- Replace confidence-only reasoning message creation with a compact local confidence summary.

State placement:

- `confidenceSummary` is stored in local `ChatState`.
- Confidence observations are recorded through the existing reducer in `src/features/jarvishAgent/hooks/UseJarvishChat/state.ts`.
- No global store, URL state, persistence, server cache, or backend persistence was introduced.

Styling structure:

- Styling uses existing `src/features/jarvishAgent/jarvish-agent.module.scss`.
- Conditional styling uses `classnames`.
- No inline styles were added.
- New display labels were added to `UI_STRINGS` in `src/features/jarvishAgent/constants.ts`.

Backend layer separation:

- No backend code was changed.
- Existing GraphQL `agentEvents` contract remains unchanged.
- Existing backend confidence metadata emission remains the source of streamed confidence values.

Shared contracts:

- Existing shared constants are reused:
  - `EVENT_TYPES`
  - `AGENT_STATUS`
  - `BLOCK_TYPES`
  - `TOOL_CONFIDENCE_THRESHOLD`
- Existing frontend runtime boundary remains:
  - `src/features/jarvishAgent/utils/eventMapper.ts`
  - `parseAgentEventPayload(payload: unknown)`

Rejected alternatives:

- Backend stream filtering was rejected for this iteration because the visible noise could be fixed with a smaller frontend-only change.
- A new display-policy metadata contract was rejected as too broad for the immediate requirement.
- Global state, new libraries, a GraphQL client abstraction, and backend schema changes were rejected.

## 3. Current Code State

Files changed by this task:

- `src/features/jarvishAgent/types.ts`
  - Added `ConfidenceSummary`.
  - Added `ConfidenceObservation`.
  - Added `confidenceSummary: ConfidenceSummary | null` to `ChatState`.
  - Added reducer actions for setting and recording confidence.

- `src/features/jarvishAgent/constants.ts`
  - Added `UI_STRINGS.CONFIDENCE_SUMMARY_TITLE`.
  - Added `UI_STRINGS.CONFIDENCE_LATEST_LABEL`.
  - Added `UI_STRINGS.CONFIDENCE_LOWEST_LABEL`.
  - Added `UI_STRINGS.CONFIDENCE_REASON_LABEL`.
  - Added `STATE_ACTIONS.SET_CONFIDENCE_SUMMARY`.
  - Added `STATE_ACTIONS.RECORD_CONFIDENCE_OBSERVATION`.
  - Initialized `INITIAL_CHAT_STATE.confidenceSummary` to `null`.

- `src/features/jarvishAgent/hooks/UseJarvishChat/state.ts`
  - Handles `SET_CONFIDENCE_SUMMARY`.
  - Handles `RECORD_CONFIDENCE_OBSERVATION`.
  - Tracks:
    - `latest`: newest valid confidence value.
    - `lowest`: lowest valid confidence value observed in the current request.
    - `reason`: validation reason associated with the lowest observed confidence.

- `src/features/jarvishAgent/hooks/UseJarvishChat/useJarvishChat.ts`
  - Replaced `addConfidenceMessageIfPresent` with `recordConfidenceIfPresent`.
  - Valid confidence metadata now dispatches `RECORD_CONFIDENCE_OBSERVATION`.
  - Confidence no longer appends a separate reasoning message.
  - Invalid confidence values are ignored defensively:
    - `null` or `undefined`: ignored silently.
    - non-number or non-finite: ignored with `console.warn`.
    - outside `0..100`: ignored with `console.warn`.
  - Confidence summary resets when a new message starts.
  - Confidence summary resets on request cancellation.
  - Existing status logs, status messages, reasoning events, message events, retry events, and error handling remain in place.

- `src/features/jarvishAgent/JarvishAgent.tsx`
  - Pulls `confidenceSummary` from `useJarvishChat`.
  - Passes it into `JarvishChatArea`.

- `src/features/jarvishAgent/components/JarvishChatArea.tsx`
  - Added local `ConfidenceSummaryStrip`.
  - Renders one compact confidence strip below the stage tracker.
  - Shows latest confidence and lowest confidence.
  - Shows the reason associated with the lowest confidence when available.
  - Applies low-confidence styling when `lowest < TOOL_CONFIDENCE_THRESHOLD`.

- `src/features/jarvishAgent/jarvish-agent.module.scss`
  - Added styles:
    - `.confidenceSummary`
    - `.confidenceHeader`
    - `.confidenceValues`
    - `.confidenceReason`
    - `.lowConfidence`

Important unchanged functions/contracts:

- `src/features/jarvishAgent/utils/eventMapper.ts`
  - Still owns runtime narrowing of streamed GraphQL payloads.

- `src/Backend/graphql/services/agent-event.service.ts`
  - Still emits `metadata.confidence` and `metadata.validationReason`.
  - No backend changes were made.

Known dependency/environment assumptions:

- React 19, TypeScript, Vite.
- Styling is SCSS Modules with `classnames`.
- GraphQL Yoga stream response is still read manually via `fetch`.
- No test runner is configured in `package.json`.
- `graphify-out/graph.json` was already modified in the worktree before handoff and was not touched intentionally by this task.

## 4. Current Technical Constraints

Repo conventions:

- Use `rg` for code search.
- Prefer existing feature-local hooks, reducer actions, constants, and SCSS module styles.
- Keep Jarvish chat state local unless lifecycle requirements justify broader state.
- Avoid new abstractions unless they remove real complexity.
- Avoid `any`; use `unknown` only at trust boundaries and narrow immediately.

Testing limitations:

- There are no obvious existing test files or test runner scripts.
- Verification currently relies on:
  - production build,
  - scoped TypeScript checks,
  - manual Jarvish streaming flow.

Lint/build constraints:

- `npm run build` passes.
- `npm run lint` currently fails on an unrelated existing issue:
  - `vite.config.js:10:25 '__dirname' is not defined no-undef`
- Full `npx tsc --noEmit` currently fails on unrelated existing playground type errors outside Jarvish.
- A scoped strict type check for Jarvish/shared files has no output after this task:
  - `npx tsc --noEmit --pretty false 2>&1 | rg "jarvishAgent|shared/jarvish" || true`

API contracts:

- GraphQL `AgentEvent.metadata` remains JSON.
- Frontend must continue treating streamed payloads as untrusted.
- Valid confidence is defined as a finite number in the inclusive range `0..100`.

Style rules:

- No inline styles.
- Use SCSS Modules and `classnames`.
- User-facing labels must live in explicit constants.

## 5. Reuse & DRY Notes

Reused:

- Existing local reducer and chat hook:
  - `useJarvishChat`
  - `chatReducer`
  - `INITIAL_CHAT_STATE`
  - `STATE_ACTIONS`

- Existing stream trust boundary:
  - `parseAgentEventPayload`
  - `AgentEventMetadata`

- Existing shared constants:
  - `TOOL_CONFIDENCE_THRESHOLD`
  - `AGENT_STATUS`
  - `EVENT_TYPES`
  - `BLOCK_TYPES`

- Existing UI shell:
  - `JarvishAgent`
  - `JarvishChatArea`
  - `jarvish-agent.module.scss`

Intentionally not used:

- Existing reasoning message rendering was not reused for confidence display because that was the source of chat noise.
- Backend status filtering was not used because it would mix transport concerns with this immediate UI concern.
- A global notification/toast pattern was not introduced because no existing pattern was found and lifecycle is local to one chat request.

DRY behavior:

- Confidence formatting is centralized in `ConfidenceSummaryStrip`.
- New static labels are centralized in `UI_STRINGS`.
- Confidence validity checks happen once in `recordConfidenceIfPresent`.

## 6. Active or Unresolved Risks

Open product/UX questions:

- Assumption: users need a compact latest/lowest confidence summary, not a full visible confidence audit trail.
- Assumption: the displayed reason should correspond to the lowest confidence value, not the latest value.
- Open question: should confidence summary remain visible after successful completion, or clear immediately when status returns to idle? Current implementation keeps it visible until the next request, cancellation, or chat reset.

Reviewer concerns:

- A reviewer may prefer confidence inside the existing status/log viewer instead of below the stage tracker.
- The confidence reason can be long. CSS truncates it with ellipsis to avoid layout overflow.
- Transport event volume is unchanged. Only visible chat message volume and message-list render growth are reduced.

Performance risks:

- Each valid confidence event still causes one reducer dispatch.
- This is intentionally accepted because it avoids the heavier previous behavior of appending a new `messages` entry per confidence event.
- Existing Vite build large chunk warnings remain and are unrelated to this task.

Technical risks:

- The stream parser is still manual and line-oriented.
- `GraphQL JSON` metadata remains weakly typed at the schema level, so frontend runtime checks remain important.
- Existing debug `console.log` calls in Jarvish stream/render paths remain; this is tracked separately in `state.html` as "Remove Jarvish debug logs before commit".

Unrelated dirty worktree:

- `graphify-out/graph.json` is modified and was not part of this task.

## 7. Exact Next Recommended Step

Run one manual Jarvish streaming chat that triggers multiple backend nodes and verify that confidence metadata updates one compact confidence strip without adding confidence-only reasoning messages to the chat.

## 8. Success Evidence

Commands already run:

```bash
npm run build
```

Expected result:

- Vite production build succeeds.
- Existing large chunk warnings may appear.

Observed result:

- Build succeeded.
- Large chunk warnings appeared.

```bash
npx tsc --noEmit --pretty false 2>&1 | rg "jarvishAgent|shared/jarvish" || true
```

Expected result:

- No output.

Observed result:

- No output after final fixes.

```bash
npm run lint
```

Expected result:

- This would ideally pass.

Observed result:

- Failed on unrelated existing `vite.config.js` issue:
  - `__dirname is not defined no-undef`

```bash
npx tsc --noEmit
```

Expected result:

- This would ideally pass repo-wide.

Observed result:

- Failed on unrelated existing playground type errors outside Jarvish.
- Scoped Jarvish/shared type scan is clean.

```bash
git diff --check
```

Expected result:

- No whitespace errors.

Observed result:

- No whitespace errors.

Manual verification flow still needed:

1. Start the normal app/backend workflow in a separate execution session when allowed.
2. Open Jarvish chat.
3. Send a query that exercises context, processing, supervisor, worker, tools, and archive nodes.
4. Confirm the stage tracker still updates.
5. Confirm status logs still update.
6. Confirm only one confidence strip appears.
7. Confirm confidence-only reasoning messages are not appended for every status event.
8. Confirm low confidence applies warning styling when below `TOOL_CONFIDENCE_THRESHOLD`.
9. Confirm cancellation clears the confidence summary.
