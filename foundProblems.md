# Found Problems

Senior architect / senior frontend / full-stack review for making this repository safe to link from a CV.

## Review Snapshot

- Review date: 2026-06-10
- Repository: `jarvish-ai-workspace`
- Verified gates:
  - `npm run lint` passed
  - `npm run typecheck` passed
  - `npm run test` passed: 38 files, 113 tests
  - `npm run smoke:jarvish` passed
  - `npm run build` passed
- Overall read: the core Jarvish architecture is promising and reviewable, but the public surface still exposes local-demo assumptions, security gaps, noisy debug artifacts, and mixed-quality frontend lab code. Before putting this on a CV, prioritize deployment posture, auth/data isolation, production logging, and curation of the reviewer path.

## Highest Priority Before Sharing


### P0-04: Google OAuth access tokens are stored in `localStorage`

- File: `src/frontend/features/jarvishAgent/hooks/useGoogleAuth.ts`
- Evidence:
  - `google_access_token` and expiry are read from and written to `localStorage`.
  - The token is sent to the backend in a custom `x-google-token` header.
- Risk:
  - Access tokens in `localStorage` are exposed to any XSS and browser-extension leakage.
  - A project that asks reviewers to connect Gmail/Docs/Calendar needs a visibly mature auth stance.
- Recommendation:
  - For the public CV link, either disable Google account connection or move to a backend-owned OAuth flow with short-lived server-side sessions.
  - Store tokens server-side or in hardened HTTP-only secure cookies where applicable.
  - Add clear Google scope copy and a privacy note in docs.

### P0-05: There is no hosted-demo safety model

- Files:
  - `README.md`
  - `.env.example`
  - `src/backend/WebServer/index.ts`
  - `src/backend/agent/tools/tool-executor.ts`
- Evidence:
  - README documents local setup but not deployment/security boundaries.
  - The same tool set appears available regardless of environment.
- Risk:
  - The project is currently credible as a local engineering artifact, not as a public internet service.
- Recommendation:
  - Add `APP_MODE=local|demo|production`.
  - In `demo`, disable Google, local filesystem writes, arbitrary URL fetches if not proxied/sandboxed, and persistent personal memory.
  - Provide seeded sample data and a no-key offline flow for reviewers.

## Architecture And Backend Problems

### BE-02: GraphQL input schemas are too permissive

- File: `src/backend/graphql/schemas/resolver.schema.ts`
- Evidence:
  - `role`, `content`, `name`, `data`, `mimeType`, `sessionId`, and search strings have minimal or no max-length validation.
  - Attachments validate base64 as a plain string and mime type as a plain string.
- Risk:
  - The API can accept oversized payloads, malformed roles, unexpected mime types, and excessive prompt/context data.
- Recommendation:
  - Add enums for roles.
  - Add max lengths for query/history/session/search/title.
  - Add attachment count, mime allowlist, base64 validation, and total request-size policy.

### BE-03: Express JSON body limit is broad and unauthenticated

- File: `src/backend/WebServer/index.ts`
- Evidence:
  - `express.json({ limit: '20mb' })` is global.
- Risk:
  - Any public client can send large unauthenticated requests to GraphQL/config/health paths.
- Recommendation:
  - Apply stricter limits by route.
  - Add rate limiting and timeout policy for public deployment.

### BE-04: SQLite schema management is split between migrations and runtime mutation

- Files:
  - `src/backend/db/index.ts`
  - `drizzle/0001_add_structured_fact_vector_id.sql`
- Evidence:
  - Runtime code calls `ALTER TABLE structured_facts ADD COLUMN vector_memory_id`.
  - The same concern is represented as a migration.
- Risk:
  - Reviewers may read this as a migration discipline gap.
  - Runtime schema mutation can hide migration failures.
- Recommendation:
  - Remove runtime schema patching once migrations are reliable.
  - Add a documented migration command and startup assertion.

### BE-05: SQLite vector search scans all rows in memory

- File: `src/backend/services/memory/sqlite-vector.store.ts`
- Evidence:
  - `SELECT id, text, embedding, metadata FROM vector_memories` reads every vector, then computes cosine similarity in TypeScript.
- Risk:
  - Fine for a local demo, but it does not scale and can block the Node process.
- Recommendation:
  - Document this explicitly as a local adapter limitation.
  - Add a production adapter interface example, such as pgvector or Qdrant.
  - Consider limiting rows by metadata/time before vector scoring.

### BE-06: Memory retrieval logs raw memory contents

- File: `src/backend/services/memory/memory.service.ts`
- Evidence:
  - Raw search results are logged with full memory text and metadata.
- Risk:
  - Conversation facts and personal memories can leak into logs.
- Recommendation:
  - Log counts, ids, scores, and categories only.
  - Add a redaction helper for user content.

### BE-07: Model-provider API keys are assumed with non-null assertions

- Files:
  - `src/backend/agent/nodes/supervisor.ts`
  - `src/backend/agent/nodes/processing.ts`
  - `src/backend/agent/nodes/workers/research.ts`
  - `src/backend/agent/nodes/workers/google.ts`
  - `src/backend/agent/nodes/workers/coder.ts`
  - `src/backend/agent/tools/attachment-query.ts`
  - `src/backend/services/titling.service.ts`
  - `src/backend/services/factExtraction.service.ts`
  - `src/backend/services/summarization.service.ts`
- Evidence:
  - Multiple calls use `process.env.GEMINI_API_KEY!`.
- Risk:
  - Missing configuration produces runtime failures in normal reviewer flows.
- Recommendation:
  - Centralize model provider config validation at startup.
  - Provide graceful offline/demo behavior when no key is configured.

### BE-08: Web/PDF fetch tools lack timeout, size, and SSRF controls

- Files:
  - `src/backend/services/tools/web.service.ts`
  - `src/backend/services/tools/pdf.service.ts`
- Evidence:
  - `fetch(args.url)` is called directly.
  - Full HTML/PDF response is read before truncating extracted text.
- Risk:
  - Public deployment can be used to hit internal network URLs or download large files.
- Recommendation:
  - Add URL allow/deny policy, private-network blocking, timeout, response-size limits, and content-type validation.

### BE-09: Google Docs update tool scope and UI scope disagree

- Files:
  - `src/frontend/features/jarvishAgent/hooks/useGoogleAuth.ts`
  - `src/backend/services/tools/google.service.ts`
  - `src/backend/agent/tools/tool-executor.ts`
- Evidence:
  - Frontend requests `documents.readonly`.
  - Backend exposes `updateGoogleDoc`.
- Risk:
  - Tool will fail at runtime or the scope request will need to expand to write permissions, which is a much higher trust bar.
- Recommendation:
  - Remove document write tool from the public demo, or explicitly request/write-scope behind a separate consent flow.

### BE-10: `startResearch` mutation is a stub

- File: `src/backend/graphql/services/mutation.resolver.service.ts`
- Evidence:
  - It validates input and returns `"Research task acknowledged"` without starting work.
- Risk:
  - Dead API surface suggests unfinished backend design.
- Recommendation:
  - Remove it from schema or wire it to the real agent flow.

## Frontend Problems




### FE-04: `CodeBlock` uses `dangerouslySetInnerHTML`

- File: `src/frontend/features/jarvishAgent/components/Blocks/CodeBlock.tsx`
- Evidence:
  - Shiki HTML is injected directly.
- Risk:
  - Shiki output is usually trusted for code highlighting, but the component makes the XSS review burden explicit.
  - The project already handles model-generated content, so reviewers will expect a clear sanitization story.
- Recommendation:
  - Sanitize generated HTML or render highlighted tokens without raw HTML.
  - Add tests that malicious code content is rendered inert.

### FE-08: Jarvish stylesheet is very large

- File: `src/frontend/features/jarvishAgent/jarvish-agent.module.scss`
- Evidence:
  - 1,576 lines in one module stylesheet.
- Risk:
  - Hard to maintain and signals UI polish debt.
- Recommendation:
  - Split by component or design tokens/layout/components.
  - Add visual regression or screenshot checks for the main workspace.

### FE-09: Secondary capability demos are untested

- Files:
  - `src/frontend/features/*` outside `jarvishAgent`
- Evidence:
  - `jarvishAgent` has 21 test files.
  - Every other feature folder currently has 0 test files.
- Risk:
  - The sidebar invites reviewers into demos that do not match the quality bar of the core agent.
- Recommendation:
  - Either remove/hide most demos from the CV link, or add focused tests and polish to the selected few.

### FE-10: Capability launcher may dilute the AI engineering story

- File: `src/frontend/capabilities.ts`
- Evidence:
  - The first screen includes many generic frontend demos alongside the AI workspace.
- Risk:
  - Reviewers may click into older/lower-quality examples and judge those as the project.
- Recommendation:
  - For the CV link, make Jarvish the product and move demos to a separate "labs" route or separate repo.
  - Keep only demos that reinforce AI engineering or strong frontend architecture.

### FE-11: Global CSS applies broad element styles

- Files:
  - `src/index.css`
  - `src/frontend/styles/theme.css`
- Evidence:
  - Global `button`, `a`, `h1`, and root color-scheme styles apply across all features.
- Risk:
  - Component-level styling can behave unexpectedly, especially in demos and Jarvish blocks.
- Recommendation:
  - Move broad reset styles into a reset layer.
  - Prefer scoped component styles for interactive controls.

### FE-12: One Tap and OAuth flows need clearer failure states

- File: `src/frontend/features/jarvishAgent/hooks/useGoogleAuth.ts`
- Evidence:
  - One Tap initializes after a timeout.
  - Silent refresh errors go to console.
- Risk:
  - Reviewers without proper Google config may see confusing auth behavior.
- Recommendation:
  - Hide Google integration when client id is absent.
  - Add explicit disconnected/config-missing states in the UI.

## Tooling, Quality, And Repository Hygiene Problems

### TQ-01: ESLint is intentionally weakened

- File: `eslint.config.js`
- Evidence:
  - `@typescript-eslint/no-explicit-any` is off.
  - Multiple React hooks compiler/recommended rules are disabled.
  - Unused variables are warnings, not failures.
- Risk:
  - Passing lint is less meaningful than the README implies.
- Recommendation:
  - Tighten rules for `src/backend` and `src/frontend/features/jarvishAgent`.
  - Use narrower overrides for legacy/lab folders.

### TQ-02: `skipLibCheck` and `allowJs` weaken type confidence

- File: `tsconfig.json`
- Evidence:
  - `skipLibCheck: true`
  - `allowJs: true`
- Risk:
  - Typecheck passing is less persuasive to technical reviewers.
- Recommendation:
  - Remove `allowJs` after converting `main.jsx`.
  - Keep or document `skipLibCheck`; if kept, mention why.

### TQ-03: Generated files are committed without a clear regeneration check in CI

- Files:
  - `src/backend/graphql/__generated__/resolvers-types.ts`
  - `src/frontend/features/jarvishAgent/graphql/__generated__/*`
  - `codegen.ts`
- Evidence:
  - Generated GraphQL files are in source and `npm run verify` regenerates them.
- Risk:
  - If generated files drift from schema, reviewers can see noisy diffs.
- Recommendation:
  - Add CI step that runs codegen and fails on dirty git diff.

### TQ-04: No CI workflow is present

- File area: repository root / `.github`
- Evidence:
  - No workflow files were found in the reviewed tree.
- Risk:
  - A CV-facing repo should show automated gates, not just local scripts.
- Recommendation:
  - Add GitHub Actions for install, codegen, lint, typecheck, test, smoke, build.

### TQ-05: README verification omits typecheck and full verify in the short command list

- File: `README.md`
- Evidence:
  - The "Verification" section lists lint, smoke, build, then separately mentions full verify.
- Risk:
  - Reviewers may run the shorter list and miss typecheck/test.
- Recommendation:
  - Make `npm run verify` the primary command.
  - Keep individual commands as optional debugging helpers.

### TQ-06: Local SQLite database exists in the workspace

- Files:
  - `sqlite.db`
  - `.gitignore`
- Evidence:
  - `sqlite.db` exists locally but is ignored by git.
- Risk:
  - Not a tracked leak, but easy to accidentally share outside git or include in a deploy artifact.
- Recommendation:
  - Add startup docs explaining that local data lives in `sqlite.db`.
  - Ensure deploy/build artifacts never include it.

### TQ-07: Several old/demo feature folders are unused or not exposed

- Files/folders:
  - `src/frontend/features/AgentChat`
  - `src/frontend/features/FormBuilder`
  - `src/frontend/features/ImageCarousel`
  - `src/frontend/features/ProxyState`
  - `src/frontend/features/CreateLocalStore`
  - `src/frontend/features/createMyStore`
  - `src/frontend/hooks/useAgent.ts`
- Evidence:
  - These are not in the public capability registry, or duplicate similar concepts.
- Risk:
  - Reviewers browsing file-by-file may see uncurated historical code.
- Recommendation:
  - Delete, archive, or move them under an explicitly named `labs/legacy` area.

### TQ-08: Dependencies include runtime packages that look dev-only or unused

- File: `package.json`
- Evidence:
  - `@parcel/watcher` appears in dependencies.
  - `@types/classnames` is installed even though `classnames` ships types.
- Risk:
  - Minor, but dependency hygiene matters in public review.
- Recommendation:
  - Run a dependency audit/prune pass.
  - Move dev-only packages to devDependencies.

## Documentation Problems

### DOC-01: README lacks screenshots or a hosted-demo path

- File: `README.md`
- Evidence:
  - Architecture and setup are clear, but there are no screenshots or demo walkthroughs.
- Risk:
  - Hiring managers may skim visually before reading architecture docs.
- Recommendation:
  - Add a concise screenshot strip: workspace, memory panel, structured blocks, graph flow.
  - Add "what to click first" for the hosted CV link.

### DOC-02: Architecture docs describe intended boundaries but not current security limits

- Files:
  - `docs/architecture/*.md`
- Evidence:
  - Docs explain graph, memory, tools, and GraphQL boundaries.
  - They do not call out local-only assumptions, disabled auth, or public deployment restrictions.
- Risk:
  - The docs can overstate production readiness.
- Recommendation:
  - Add a "Current Deployment Posture" section.
  - Be explicit: local-first demo, auth pending, filesystem tools disabled for hosted demo.

### DOC-03: Tool execution docs do not mention high-risk tools

- File: `docs/architecture/tool-execution.md`
- Evidence:
  - Lists file reads and Google actions without safety caveats.
- Risk:
  - A reviewer may ask why arbitrary file write / Google Doc update exists.
- Recommendation:
  - Document tool capability tiers and environment gating.

### DOC-04: Memory docs imply user scoping is handled, but auth is not wired

- File: `docs/architecture/memory-layer.md`
- Evidence:
  - Mentions user scoping in metadata.
  - Runtime uses default user identity unless real auth is added.
- Risk:
  - Architecture documentation and actual security model are misaligned.
- Recommendation:
  - Clarify that user scoping is structurally supported but not production-authenticated yet.

## AI/Agent Product Problems

### AI-01: Offline reviewer experience is incomplete

- Files:
  - `README.md`
  - `src/backend/agent/nodes/*`
  - `.env.example`
- Evidence:
  - Some flows require `GEMINI_API_KEY`.
  - Memory embedding has local fallback, but reasoning nodes do not.
- Risk:
  - A reviewer without keys can only inspect code or run limited gates.
- Recommendation:
  - Add a deterministic demo provider with seeded responses.
  - Make the hosted CV version usable without requiring reviewers to connect accounts or provide keys.

### AI-02: Prompt and orchestration code are mixed in large node files

- Files:
  - `src/backend/agent/nodes/supervisor.ts`
  - `src/backend/agent/nodes/workers/research.ts`
  - `src/backend/agent/nodes/workers/google.ts`
  - `src/backend/agent/nodes/workers/coder.ts`
- Evidence:
  - Prompt strings, model setup, state mapping, tool declarations, validation, and error handling live together.
- Risk:
  - Harder to test prompt policies and worker behavior separately.
- Recommendation:
  - Extract prompt builders and model adapters.
  - Add unit tests for prompt construction and route/tool behavior.

### AI-03: Confidence scoring can appear more authoritative than it is

- Files:
  - `src/backend/agent/validation/tool-output.validator.ts`
  - `src/backend/agent/validation/node-response.validator.ts`
  - `src/frontend/features/jarvishAgent/components/*`
- Evidence:
  - Confidence values are shown and routed on, but docs say scoring is rule-based.
- Risk:
  - Reviewers may challenge whether "confidence" means calibrated reliability.
- Recommendation:
  - Rename to "validation score" or document calibration limits in UI/docs.
  - Add eval cases if confidence remains a prominent product concept.

### AI-04: Reasoning/internal events are user-visible

- Files:
  - `src/backend/graphql/services/agent-event.service.ts`
  - `src/frontend/features/jarvishAgent/components/JarvishChatArea.tsx`
- Evidence:
  - Non-message node outputs can stream as `REASONING` and render under "Thought Process".
- Risk:
  - Depending on provider behavior, this can expose implementation details or confuse users.
- Recommendation:
  - Rename to "Activity" or "Work log".
  - Ensure no hidden chain-of-thought or sensitive tool payloads are streamed.

## Positive Signals To Preserve

- The README has a strong reviewer path and clear architecture overview.
- Graph topology is explicit and easy to inspect.
- GraphQL generated types and Zod boundary validation are good instincts.
- The Jarvish feature has meaningful tests compared to the rest of the frontend.
- `npm run verify` is a solid local gate.
- The vector-store interface is a good extensibility point.

## Suggested Iteration Order

1. Add hosted-demo mode and disable high-risk tools/auth surfaces for public sharing.
2. Add backend auth/user scoping or clearly mark the app as local-only.
3. Remove production debug logs and localStorage Google token persistence from the public path.
4. Re-enable React StrictMode and convert `main.jsx` to `main.tsx`.
5. Curate the capability sidebar so reviewers see only polished, relevant surfaces.
6. Add CI and make `npm run verify` the official gate.
7. Add screenshots and a public-demo walkthrough to README.
8. Tighten lint/type rules for the core product while isolating legacy labs.
