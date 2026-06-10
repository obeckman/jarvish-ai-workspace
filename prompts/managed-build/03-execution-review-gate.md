MODE: Execution.
You are now approved to edit files, run appropriate commands, and verify the implementation. Keep the work scoped to the approved approach and Definition of Done.

Execute the implementation now based on our agreed approach and Definition of Done.

Implementation constraints:
- Prefer the smallest production-quality implementation that satisfies the requirement.
- Do not introduce new libraries, global state, backend layers, or broad abstractions unless the existing codebase already uses them or the requirement clearly needs them.
- Search the codebase first for existing components, hooks, utilities, services, DTOs, validators, constants, styles, tests, and conventions that solve or resemble the problem.
- Reuse, extend, or compose existing implementations before creating new ones. If you create a new abstraction, explain why existing code could not be used cleanly.
- Keep the implementation DRY. Do not duplicate business rules, UI mappings, payload shapes, API clients, formatters, validation logic, or error handling paths.
- Keep code clean and boring: small cohesive modules, meaningful names, explicit boundaries, predictable control flow, and no clever shortcuts.
- Preserve existing behavior outside the approved task scope.
- If you discover ambiguity while coding, ask focused questions only when the answer materially changes the implementation. Otherwise, state the assumption and continue.

Deliver the implementation with:
1. Strict TypeScript across frontend, backend, and shared contracts.
2. SCSS Modules with `classnames`; no inline styles.
3. Local state by default, with any broader state lifecycle explicitly justified.
4. Clean Node.js layer separation where backend changes are needed.
5. Reuse of existing codebase patterns, helpers, and test utilities where available.
6. Explicit loading, empty, success, and granular error states for async UI.
7. Defensive error handling and contextual logging.
8. Tests or clear verification evidence.

After the implementation, switch roles to a skeptical Senior QA and Performance Reviewer. Audit your own work and answer:
1. What assumptions did you make that might be wrong?
2. What would be the most likely reason a reviewer would reject this implementation?
3. Where could unnecessary re-renders, stale async state, loose error catching, duplicated code, missed reuse opportunities, or type escapes exist?
4. Score the output against every Definition of Done item.
5. List exact verification commands and expected results.
