MODE: Definition of Done / Approval Gate.
Do not edit files, write implementation code, run destructive commands, install dependencies, or start a dev server. Your job is to turn the approved plan into a strict execution contract and wait for my execution signal.

I approve {{APPROVED_APPROACH_OR_FIX_STRATEGY}}.

Before you build, establish the strict Definition of Done for this mission. Treat this as the execution contract.

[FRONTEND ARCHITECTURE]
1. Core Tech & State: Use pure TypeScript and clean React 19 patterns. Keep state local unless Stage 1 explicitly justified lifting, persistence, URL state, server cache, or a global store.
2. Styling Architecture: Use SCSS with CSS Modules. Import styles locally and use `classnames` for conditional classes. No inline styles. Extract static labels, keys, option lists, and configurations into explicit constants.
3. Component Design & UX: Components must be modular and single-purpose. Async workflows must show polished loading, empty, success, and granular error states.
4. Codebase Reuse First: Before creating a component, hook, utility, service, style, type, or API wrapper, search for an existing implementation or established local pattern. Reuse, extend, or compose existing code whenever it keeps behavior clear.
5. No Code Repeats: Keep code DRY without creating abstractions that are broader than the task needs. Do not duplicate logic, mappings, constants, DTOs, validation rules, formatting helpers, or API calls.
6. Clean Code: Prefer small named functions, explicit data shapes, readable branching, stable boundaries, and meaningful file/module names. Avoid cleverness, hidden side effects, and large mixed-responsibility components.

[BACKEND ARCHITECTURE]
7. Clean Node.js: Separate routing/entry points, business logic/services/use-cases, validation, and data access. Avoid bloated controllers and mixed concerns.
8. Backend Reuse First: Reuse existing route conventions, middleware, validators, error utilities, logging patterns, repositories, mappers, and service boundaries before adding new ones.
9. Unified Type Safety: Frontend and backend must share exact DTO and API payload types when the repo structure allows it. Avoid `any` and unsafe type escapes.

[LOGIC, ROBUSTNESS & ERROR HANDLING]
10. Total Conditional Handling: Every meaningful `if` must have an explicit `else` or a clearly justified early return. No silent dropped paths.
11. Defensive Programming: Catch operational errors with contextual logging. Defensively handle null values, empty payloads, malformed data, permission failures, network timeouts, retries, and stale async results.
12. Test Evidence: Add or update tests proportionate to risk. Reuse existing test utilities, mocks, fixtures, and setup patterns. If tests are impossible in the current setup, explain the blocker and provide manual verification steps.

Output format:
1. Restate the Definition of Done in your own words.
2. List any remaining questions that could change the implementation.
3. State the assumptions you will proceed with if I give the execution signal.

Stop after restating the Definition of Done, remaining questions, and assumptions. Do not start coding until I explicitly say to execute.
