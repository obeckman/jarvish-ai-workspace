MODE: Handoff.
Do not add new implementation work unless explicitly asked. Your job is to preserve project state clearly enough for a fresh session to continue without guessing.

We are at a handoff point. Act as a technical project manager summarizing this session so a completely fresh, context-free AI session can continue the work flawlessly.

Generate a clean Markdown Handoff Document with these sections on the project path: "conductor/tracks/<assignment name>"
1. Original Goal & Context.
2. Approved Architecture: frontend patterns, state placement, styling structure, backend layer separation, shared contracts, and any rejected alternatives.
3. Current Code State: exact files changed, important functions/components/endpoints, and known dependency or environment assumptions.
4. Current Technical Constraints: repo conventions, testing limitations, lint/build constraints, API contracts, and style rules.
5. Reuse & DRY Notes: existing components, hooks, utilities, services, DTOs, validators, styles, tests, or patterns that were reused, extended, or intentionally not used.
6. Active or Unresolved Risks: performance bottlenecks, missing edge cases, unhandled states, duplicated logic risk, missed reuse opportunities, open type definitions, uncertain requirements, or reviewer concerns.
7. Exact Next Recommended Step: the single next action an incoming session should take.
8. Success Evidence: commands, screenshots, tests, logs, or manual flows needed to prove the next step succeeds.

Update `interview.html` and `state.html` if needed.
Rules:
- Remove conversational fluff and debugging history.
- Preserve concrete decisions, file paths, commands, and verification results.
- If anything is uncertain, label it clearly as an assumption or open question.
- Give pure, actionable project state.
