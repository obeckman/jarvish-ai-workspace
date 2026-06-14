# Found Problems

Senior architect / senior frontend / full-stack readiness review .

## Review Snapshot

- Review date: 2026-06-14
- Goal: make the repository safe and impressive when hiring managers or technical interviewers click through.
- Scope: repository structure, README/docs, Vite frontend, Jarvish agent UI, GraphQL/backend boundary, LangGraph/tooling, memory/vector storage, auth, tests, and deployment hygiene.
- Not reviewed line-by-line: generated GraphQL files under `__generated__`, lockfile internals, binary/build artifacts, and ignored local files such as `.env`.

## Verification Run

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm run test`: passed, 59 files and 239 tests
- `npm run smoke:jarvish`: passed
- `npm run build`: passed

Passing gates are a strong sign. The problems below are therefore mostly production posture, public-demo credibility, security, maintainability, and reviewer first-impression issues.

## P0 - Must Fix Before Public 

### P0-01: Google access tokens and ID tokens are stored in `localStorage`

- Files:
  - `src/frontend/features/jarvishAgent/hooks/useGoogleAuth.ts`
  - `src/shared/jarvish.constants.ts`
  - `src/frontend/features/AgentChat/AgentChat.tsx`
- Evidence:
  - `useGoogleAuth.ts` reads/writes `google_access_token`, `google_id_token`, and expiry values in `localStorage`.
  - `AgentChat.tsx` is a legacy path that also stores `google_access_token` in `localStorage`.
- Why it matters:
  - Browser storage exposes Google credentials to XSS and malicious browser extensions.
  - A  AI assistant that connects Gmail/Calendar/Docs needs visibly serious auth hygiene.
- Recommendation:
  - Move Google OAuth to a backend-owned authorization-code flow.
  - Store refresh/access credentials server-side, encrypted at rest.
  - Use an app session cookie or server-issued session token for the frontend.
  - Remove all Google access-token persistence and `x-google-token` transport from the browser.

### P0-02: The frontend sends Google access tokens to GraphQL in a custom header

- Files:
  - `src/frontend/features/jarvishAgent/hooks/UseJarvishChat/transportClient.ts`
  - `src/backend/graphql/resolvers.ts`
  - `src/backend/services/tools/google.service.ts`
- Evidence:
  - The frontend sends `x-google-token`.
  - The GraphQL subscription resolver reads `context.request.headers.get('x-google-token')`.
  - Google tool services construct OAuth clients from that temporary browser-supplied token.
- Why it matters:
  - The backend trusts a bearer token supplied by the browser per request rather than resolving credentials from the authenticated user.
  - This weakens auditability, revocation, refresh, scope management, and logging safety.
- Recommendation:
  - Resolve Google credentials server-side by `context.auth.userId`.
  - Make disconnect/revoke a backend operation.
  - Keep Google scopes and credential lifecycle out of the agent event stream boundary.

### P0-03: Web and PDF tools have SSRF, timeout, and size-limit risks

- Files:
  - `src/backend/services/tools/web.service.ts`
  - `src/backend/services/tools/pdf.service.ts`
  - `src/backend/agent/tools/tool.schemas.ts`
- Evidence:
  - `fetch(args.url)` is called directly after only `z.string().url()` validation.
  - The response body is fully read with `response.text()` or `response.arrayBuffer()` before truncating extracted text.
- Why it matters:
  - In a hosted demo, users or the model could fetch private network URLs, metadata endpoints, huge files, or slow responses.
  - This is a classic public-agent tool risk.
- Recommendation:
  - Add URL policy: allow `https`, block localhost/private/link-local/cloud metadata IPs, and resolve DNS safely.
  - Add `AbortController` timeout, max response bytes, content-type checks, redirect limits, and tests.
  - Consider routing external fetches through a sandboxed service.

### P0-04: Raw personal memory content is logged

- File: `src/backend/services/memory/memory.service.ts`
- Evidence:
  - `retrieveMemories` logs `{ results }`, including full memory `text` and metadata.
  - `npm run smoke:jarvish` printed `"local pizza preference memory"` in logs.
- Why it matters:
  - Memory contains user facts, attachments, and conversation-derived personal data.
  - A reviewer will read this as a privacy and observability maturity gap.
- Recommendation:
  - Log only counts, ids, scores, categories, and session/user correlation ids.
  - Add a redaction helper for all model/user/tool content logs.
  - Add a test that raw memory text is not logged.

### P0-05: GraphQL exposes unmasked server errors

- File: `src/backend/graphql/index.ts`
- Evidence:
  - `maskedErrors: false` is configured globally.
- Why it matters:
  - Production clients can receive internal exception messages and implementation details.
  - This is particularly risky with model/provider errors, auth failures, and tool exceptions.
- Recommendation:
  - Use masked errors in production.
  - Preserve structured public codes like `UNAUTHENTICATED`.
  - Log detailed errors server-side with redaction.

### P0-06: There is no explicit hosted-demo safety mode

- Files:
  - `README.md`
  - `.env.example`
  - `src/backend/WebServer/index.ts`
  - `src/backend/agent/tools/tool-executor.ts`
  - `src/backend/services/tools/file.service.ts`
- Evidence:
  - Safety is inferred mostly from `NODE_ENV=production`.
  - There is no clear `APP_MODE=local|demo|production` policy.
  - Google, web fetch, PDF fetch, memory persistence, and file/tool behavior are not described as one cohesive public-demo policy.
- Why it matters:
  - needs a predictable demo that cannot expose personal data, mutate local files, or depend on the reviewer's credentials.
- Recommendation:
  - Add a `demo` mode with seeded data, no personal Google integration, no write tools, constrained web/PDF fetching, and disposable memory.
  - Document what is disabled and why.

## P1 - Strong Reviewer Signals To Fix

### P1-01: No CI workflow is present

- File area: `.github/workflows`
- Evidence:
  - No workflow files exist.
- Why it matters:
  - The repo has good local gates, but reviewers expect public repos to enforce them automatically.
- Recommendation:
  - Add GitHub Actions for install, codegen, lint, typecheck, test, smoke, and build.
  - Add a dirty-diff check after codegen.

### P1-02: Generated GraphQL artifacts can drift

- Files:
  - `codegen.ts`
  - `src/backend/graphql/__generated__/resolvers-types.ts`
  - `src/frontend/features/jarvishAgent/graphql/__generated__/*`
  - `package.json`
- Evidence:
  - Generated files are committed.
  - `npm run verify` regenerates code, but there is no CI dirty-check.
- Why it matters:
  - Reviewers may see generated-file diffs after setup and infer weak schema discipline.
- Recommendation:
  - Keep generated files committed if that is the chosen workflow, but enforce `npm run codegen && git diff --exit-code` in CI.

### P1-03: Runtime schema mutation duplicates migration responsibility

- Files:
  - `src/backend/db/index.ts`
  - `drizzle/0001_add_structured_fact_vector_id.sql`
- Evidence:
  - Startup runs `ALTER TABLE structured_facts ADD COLUMN vector_memory_id`.
  - The same column exists as a Drizzle migration.
- Why it matters:
  - Runtime schema patching hides migration failures and looks improvised.
- Recommendation:
  - Add a documented migration command.
  - Remove runtime mutation after migrations are reliable.
  - Keep only startup assertions for required tables/columns.

### P1-04: GraphQL schema exposes a stub mutation

- Files:
  - `src/backend/graphql/schema.ts`
  - `src/backend/graphql/resolvers.ts`
  - `src/backend/graphql/services/mutation.resolver.service.ts`
- Evidence:
  - `startResearch` returns `"Research task acknowledged"` without starting research.
- Why it matters:
  - Dead API surface suggests unfinished backend design.
- Recommendation:
  - Remove it from the schema or wire it to the same real agent event/session flow used by the UI.

### P1-05: Google Docs write tool conflicts with requested frontend scopes

- Files:
  - `src/frontend/features/jarvishAgent/hooks/useGoogleAuth.ts`
  - `src/backend/services/tools/google.service.ts`
  - `src/backend/agent/tools/tool-executor.ts`
- Evidence:
  - Frontend requests `documents.readonly`.
  - Backend registers `updateGoogleDoc`.
- Why it matters:
  - The write tool will fail at runtime unless scopes expand.
  - Expanding to write scopes raises the consent and trust bar substantially.
- Recommendation:
  - Remove document write from the public demo, or split it behind explicit elevated consent and server-side OAuth.

### P1-06: Model-provider config is scattered and relies on non-null assertions

- Files:
  - `src/backend/services/summarization.service.ts`
  - `src/backend/services/titling.service.ts`
  - `src/backend/services/factExtraction.service.ts`
  - `src/backend/services/memory/memory.service.ts`
  - `src/backend/agent/nodes/processing.ts`
  - `src/backend/agent/tools/attachment-query.ts`
  - `src/backend/agent/nodes/model-adapters.ts`
  - `src/backend/agent/nodes/archive.ts`
  - `src/backend/agent/nodes/clarification.ts`
- Evidence:
  - Multiple places call `process.env.GEMINI_API_KEY!`.
- Why it matters:
  - Missing configuration becomes runtime failure in reviewer flows.
  - Provider setup is harder to audit and test.
- Recommendation:
  - Centralize provider configuration in one module.
  - Validate required env at startup for production.
  - Provide graceful offline/demo behavior when no key exists.

### P1-07: Agent logs include raw prompts, model responses, and tool args

- Files:
  - `src/backend/agent/nodes/supervisor.ts`
  - `src/backend/agent/nodes/processing.ts`
  - `src/backend/agent/tools/tool-executor.ts`
  - `src/backend/services/tools/google.service.ts`
- Evidence:
  - Supervisor logs `lastHistoryMsg`, `sentMessage`, and `rawResponse`.
  - Tool executor logs `toolArgs`.
  - Google service logs raw provider errors.
- Why it matters:
  - User prompts, attachments, Gmail search queries, and model responses may end up in logs.
- Recommendation:
  - Introduce content-safe logging helpers.
  - Log lengths, hashes, tool names, ids, statuses, and redacted error metadata.

### P1-08: Legacy `AgentChat` component is unfinished and risky

- File: `src/frontend/features/AgentChat/AgentChat.tsx`
- Evidence:
  - Contains `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com`.
  - Stores Google access tokens in `localStorage`.
  - Uses `alert`.
  - Shows a lightbulb emoji in UI copy while the rest of the app is more polished.
- Why it matters:
  - Even if not routed, it lives in source and looks like abandoned prototype code.
- Recommendation:
  - Delete it if unused, or migrate it to the Jarvish auth/UI standards.

### P1-09: Public capability launcher dilutes the AI engineering story

- Files:
  - `src/frontend/App.tsx`
  - `src/frontend/capabilities.ts`
  - `README.md`
- Evidence:
  - The sidebar exposes many generic frontend demos alongside Jarvish.
  - Most demos are not directly related to AI engineering.
- Why it matters:
  - Reviewers may click a lower-polish demo first and judge the whole project by it.
- Recommendation:
  - make Jarvish the product.
  - Move non-AI demos to a separate `/labs` route, separate repo, or hidden reviewer-only section.

### P1-10: Secondary frontend demos have no tests

- File area: `src/frontend/features/*` outside `jarvishAgent`
- Evidence:
  - `jarvishAgent` has focused tests.
  - The exposed secondary feature folders report 0 test files at their folder level.
- Why it matters:
  - The visible product has mixed quality bars.
- Recommendation:
  - Hide most demos from the path or add focused component/hook tests for the selected demos.

### P1-11: Production build has large async chunks for code/data blocks

- File: `src/frontend/features/jarvishAgent/components/Blocks/CodeBlock.tsx`
- Evidence:
  - Build output includes multiple Shiki language chunks, Shiki core, and a `DataBlock` chunk around 354 kB before gzip.
- Why it matters:
  - Large chunks can make the first code/data-block interaction feel slow.
  - Performance matters for first impressions.
- Recommendation:
  - Load only the languages actually used in the public demo.
  - Consider lighter token rendering, server-side highlighting, or a simple escaped `<pre>` fallback for uncommon languages.

### P1-12: `CodeBlock` injects highlighted HTML

- File: `src/frontend/features/jarvishAgent/components/Blocks/CodeBlock.tsx`
- Evidence:
  - Uses `dangerouslySetInnerHTML` with Shiki output.
- Why it matters:
  - Shiki output is generally escaped, but model-generated code plus HTML injection raises the XSS review burden.
- Recommendation:
  - Add an explicit sanitizer or token-based renderer.
  - Add tests proving malicious code content renders inert.

### P1-13: README references `.env.example`, but the repo does not give a one-command safe demo path

- Files:
  - `README.md`
  - `.env.example`
- Evidence:
  - Setup requires copying `.env.example` and filling provider keys for meaningful agent flows.
  - README says some flows require `GEMINI_API_KEY`, but there is no seeded demo script for reviewers without keys.
- Why it matters:
  - Many hiring reviewers will not configure API keys.
- Recommendation:
  - Add `npm run demo` or documented `APP_MODE=demo` with mocked model/tool responses and seeded memory/session data.
  - Add screenshots or a short GIF so the project is understandable without credentials.

## P2 - Maintainability, Polish, And Consistency

### P2-01: `.env.example` includes unused or misleading config

- File: `.env.example`
- Evidence:
  - `GRAPHQL_PLAYGROUND_ENABLED=false` exists, but GraphiQL is controlled by `process.env.NODE_ENV !== 'production'`.
- Why it matters:
  - Dead config makes deployment posture harder to trust.
- Recommendation:
  - Remove unused env keys or wire them intentionally.

### P2-02: Global CSS can leak styles into feature components

- Files:
  - `src/index.css`
  - `src/frontend/styles/theme.css`
  - `src/frontend/App.css`
- Evidence:
  - Global `a`, `h1`, and `button` rules apply broad visual defaults.
- Why it matters:
  - Mixed demo components become harder to reason about and can receive unexpected button/headline sizing.
- Recommendation:
  - Keep global CSS to reset, typography variables, and root layout.
  - Move component visual styles into modules or scoped feature styles.

### P2-03: The app shell is desktop-first

- Files:
  - `src/frontend/App.css`
  - `src/frontend/features/jarvishAgent/styles/_layout.scss`
  - `src/frontend/features/jarvishAgent/styles/_shell.scss`
- Evidence:
  - The main shell is a fixed-height sidebar/stage layout with a mobile breakpoint that compresses the nav to `max-height: 42vh`.
- Why it matters:
  - Hiring managers often click links on laptops, but mobile screenshots and quick phone checks happen.
- Recommendation:
  - Run a mobile visual pass.
  - Prefer a collapsible nav/drawer for secondary capabilities.
  - Ensure Jarvish remains the dominant first viewport on small screens.

### P2-04: CORS allows non-browser/no-origin requests by default

- File: `src/backend/WebServer/cors.ts`
- Evidence:
  - Requests without an `Origin` are allowed.
- Why it matters:
  - This is normal for server-to-server/curl traffic, but the public API policy is not documented.
- Recommendation:
  - Document the intended behavior.
  - If the hosted demo should only serve the frontend, enforce stricter API-layer auth/rate limits and keep no-origin allowance intentional.

### P2-05: Rate limiting is in-memory and per-process

- File: `src/backend/WebServer/index.ts`
- Evidence:
  - `createRateLimiter` stores counters in a local `Map`.
- Why it matters:
  - Fine for a local demo, not enough for scaled or multi-instance deployment.
- Recommendation:
  - Document as local protection.
  - Use Redis or platform rate limiting for hosted deployments.

### P2-06: SQLite vector search is documented as local, but still easy to misread as production-ready

- Files:
  - `src/backend/services/memory/sqlite-vector.store.ts`
  - `docs/architecture/memory-layer.md`
  - `README.md`
- Evidence:
  - SQLite scans the newest bounded row window and ranks in Node.
- Why it matters:
  - This is acceptable for a portfolio local adapter, but reviewers may ask about retrieval quality and scale.
- Recommendation:
  - Keep the current documentation.
  - Add an interface-level example or stub adapter for pgvector/Qdrant to show the intended production path.

### P2-07: File tool security is better than the rest of tool security, creating an inconsistent risk story

- Files:
  - `src/backend/services/tools/file.service.ts`
  - `src/backend/services/tools/web.service.ts`
  - `src/backend/services/tools/pdf.service.ts`
- Evidence:
  - File tools have path traversal checks, hidden-file blocking, production write disablement, and allowlists.
  - Web/PDF tools lack equivalent hosted-mode controls.
- Why it matters:
  - The architecture shows awareness in one tool family but leaves another exposed.
- Recommendation:
  - Extract a common `ToolSecurityPolicy` for local file, web, PDF, and Google tools.

### P2-08: Some code comments and names still read like prototype scaffolding

- Files:
  - `src/backend/index.ts`
  - `src/backend/graphql/index.ts`
  - `src/backend/services/tools/google.service.ts`
  - `src/backend/agent/nodes/supervisor.ts`
- Evidence:
  - Comments like `Match old server's port`, numbered middleware comments that no longer match, and "For simplicity" in the Google Doc updater.
  - Typo/comment quality such as `humen`.
- Why it matters:
  - Small language artifacts influence reviewer perception of seniority.
- Recommendation:
  - Clean comments to describe durable intent, not development history.

### P2-09: Frontend feature folders contain unused or unexposed experiments

- File area: `src/frontend/features`
- Evidence:
  - There are many folders not listed in `capabilities.ts`, such as `ApiRaceCondition`, `CardHolder`, `ProxyState`, `TwoWayBinding`, `indexDB`, and others.
- Why it matters:
  - A  repo should feel curated.
- Recommendation:
  - Move old experiments to a separate archive repo, or add a clear `labs/experimental` boundary with lower expectations.

### P2-10: Docs are strong but do not include a threat model

- Files:
  - `docs/architecture/agent-graph.md`
  - `docs/architecture/graphql-boundary.md`
  - `docs/architecture/memory-layer.md`
  - `docs/architecture/tool-execution.md`
  - `docs/architecture/engineering-decisions.md`
- Evidence:
  - Docs explain architecture and tradeoffs, but not adversarial tool use, PII handling, auth/session boundaries, logging redaction, or hosted-demo constraints.
- Why it matters:
  - AI engineering reviewers increasingly look for agent safety and data handling.
- Recommendation:
  - Add `docs/architecture/threat-model.md`.
  - Cover prompt/tool abuse, SSRF, token storage, personal data logs, memory isolation, and public demo limitations.

## File-By-File Notes

### `README.md`

- Good reviewer path and architecture summary.
- Missing screenshots/GIFs.
- Missing hosted-demo safety policy.
- Missing no-key demo path.
- Mentions `.env.example`, but many reviewers will not configure keys.

### `.env.example`

- Good coverage of expected environment variables.
- `GRAPHQL_PLAYGROUND_ENABLED` appears unused.
- `LOG_LEVEL=debug` as the sample default encourages verbose local logs that currently include sensitive content.

### `package.json`

- Good local scripts and `verify` gate.
- Missing CI to enforce those gates publicly.
- `start:prod` runs `npm start`, which includes Vite dev server behavior through the same start chain; for real production, separate backend serving/deployment commands would be clearer.

### `eslint.config.js`

- Sensible strictness for backend and Jarvish core.
- Broad relaxations remain for much of the older frontend demo code, including `no-explicit-any` off outside strict paths.
- This matches the mixed-quality capability concern.

### `tsconfig.json`

- `strict: true` is good.
- `skipLibCheck: true` is justified in a comment, but it is still a tradeoff to mention if reviewers ask about TS 6 dependency friction.

### `src/backend/graphql/index.ts`

- `maskedErrors: false` should not be used for production.
- GraphiQL is controlled only by `NODE_ENV`, not the documented `GRAPHQL_PLAYGROUND_ENABLED`.

### `src/backend/graphql/schema.ts`

- `startResearch` is public schema but not functional.
- `AttachmentInput.data` has no schema-level size guidance; server JSON limit helps, but docs should state attachment limits.

### `src/backend/graphql/resolvers.ts`

- Reads `x-google-token` directly from request headers.
- `startResearch` resolver is unauthenticated by user context even though other mutations use `context.auth.userId`.

### `src/backend/graphql/services/mutation.resolver.service.ts`

- `startResearch` stub should be removed or implemented.
- `createSession` calls model-backed title generation, so session creation can fail or slow down if provider config is missing.

### `src/backend/db/index.ts`

- Runtime schema mutation should be replaced by migrations plus assertions.

### `src/backend/WebServer/index.ts`

- In-memory rate limiter is local-only.
- Request timeout does not cancel downstream model/tool work by itself.
- `start:prod`/server production story is not clearly separated from local dev.

### `src/backend/WebServer/cors.ts`

- Allows requests with no `Origin`; acceptable if intentional, but not documented.
- No credentials policy is explicit.

### `src/backend/services/memory/memory.service.ts`

- Logs raw memories.
- Uses scattered Gemini API key construction.
- User scoping allows memories without a `userId`; that may be fine for legacy/global memory, but should be documented as a policy.

### `src/backend/services/memory/sqlite-vector.store.ts`

- Local adapter scans a bounded newest-row window in Node.
- Good for local persistence, not production semantic retrieval.

### `src/backend/services/tools/web.service.ts`

- Direct fetch without SSRF protections, timeout, max bytes, content-type validation, or redirect policy.
- Uses regex-based HTML stripping; adequate for simple extraction but not robust parsing.

### `src/backend/services/tools/pdf.service.ts`

- Direct fetch without SSRF protections, timeout, max bytes, content-type validation, or redirect policy.
- Reads whole PDF into memory before parsing.

### `src/backend/services/tools/file.service.ts`

- Stronger than the web/PDF tools: path boundary checks, hidden-file blocking, production write disablement, allowlist reads.
- Consider moving this policy style into a shared tool policy.

### `src/backend/services/tools/google.service.ts`

- Uses browser-supplied temporary access tokens.
- Logs raw provider errors.
- Exposes Google Doc write behavior with incomplete replace/append semantics.

### `src/backend/agent/tools/tool-executor.ts`

- Central registry and validation are good.
- Logs tool args.
- Only write-file has environment gating; web/PDF/Google need hosted-demo gating too.

### `src/backend/agent/tools/tool.schemas.ts`

- URL schemas validate shape, not network safety.
- Tool args lack max-length constraints for queries/content.

### `src/backend/agent/nodes/processing.ts`

- Creates Gemini client using non-null API key assertion.
- Shadow tooling can invoke web search and file read; file path has policy, web search/fetch needs equivalent policy.
- Logs operational details that may become sensitive depending on args.

### `src/backend/agent/nodes/supervisor.ts`

- Logs prompt/history/model response details.
- Contains comment typos and some formatting artifacts.
- Good deterministic fast path for date/time, but model/provider fallback story should be centralized.

### `src/backend/VectorDB/index.ts`

- Provider abstraction is clear.
- Only `sqlite` and `memory` are implemented; production vector adapters are documented but not shown in code.

### `src/frontend/App.tsx`

- Jarvish-first default is good.
- Sidebar exposes generic frontend demos that dilute the AI story.
- No error boundary around lazy-loaded capabilities.

### `src/frontend/capabilities.ts`

- Typed lazy registry is good.
- Public capability list should be curated for the CV link.

### `src/frontend/App.css`

- Desktop shell is clean.
- Mobile nav becomes a large horizontal/scrolled area; needs visual validation.

### `src/index.css`

- Broad global element styles can leak into every feature.
- Global Google Fonts import can slow first paint and introduce external dependency in demos.

### `src/frontend/features/jarvishAgent/hooks/useGoogleAuth.ts`

- Stores access and ID tokens in `localStorage`.
- Requests read scopes in the frontend.
- One Tap and silent refresh behavior need clearer public failure states when Google config is absent.

### `src/frontend/features/jarvishAgent/hooks/UseJarvishChat/transportClient.ts`

- Sends `x-google-token`.
- Needs server-owned credential flow.

### `src/frontend/features/jarvishAgent/components/Blocks/CodeBlock.tsx`

- Uses `dangerouslySetInnerHTML`.
- Pulls in many Shiki languages.
- Needs explicit XSS tests around highlighted model-generated code.

### `src/frontend/features/AgentChat/AgentChat.tsx`

- Legacy/unfinished and should not remain in a  repo in its current form.

### `src/frontend/features/*` capability demos

- Many demos are untested and outside the stricter lint profile.
- Either curate heavily or raise them to the Jarvish quality bar.

## Suggested Fix Order

1. Add hosted-demo mode and remove personal Google credential exposure from the public path.
2. Harden web/PDF tools with SSRF, timeout, size, redirect, and content-type controls.
3. Redact logs across memory, model calls, Google tools, and tool execution.
4. Mask GraphQL errors in production.
5. Add CI with verify and codegen dirty-diff checks.
6. Remove or implement unfinished surfaces: `startResearch`, `AgentChat`, unused env config.
7. Curate the frontend launcher so Jarvish is the main product and labs are clearly secondary.
8. Add screenshots/no-key demo data and a threat-model doc.
