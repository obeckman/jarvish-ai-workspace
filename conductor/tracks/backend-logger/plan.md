# Backend Logger Implementation Plan

## Background & Motivation
Currently, the backend system relies exclusively on standard `console.info`, `console.debug`, and `console.error` for logging. This approach lacks structured logging, timestamping, and is difficult to parse or trace effectively in production environments. We need to introduce a robust, structured logger and ensure critical paths—particularly within the agent processing nodes—are thoroughly instrumented with debug and error logs to identify problems during execution. The `GEMINI.md` project guidelines must also be updated to mandate the use of the new logger.

## Scope & Impact
- **Impacted Areas**: Entire `src/Backend` directory.
- **Specific Focus**: `src/Backend/agent/` nodes and workers, ensuring every important step has `logger.debug` and all catch blocks have `logger.error`.
- **Documentation**: Root `GEMINI.md` will be updated to enforce the new logging standard.

## Proposed Solution
We will integrate **Pino**, an industry-standard, high-performance Node.js logging library, along with `pino-pretty` for readable development output. 
A centralized logger utility will be created at `src/Backend/utils/logger.ts`, and all existing `console.*` calls within the backend will be migrated to use this new logger instance.

## Alternatives Considered
- **Custom Utility**: Writing a custom wrapper around `console.*`. This was rejected in favor of an industry-standard library (Pino) to ensure better performance, structured JSON output (vital for production), and easier extensibility.
- **Winston**: Another standard library. Pino was chosen for its minimal overhead and performance benefits, though Winston would have been equally viable.

## Implementation Plan
1. **Install Dependencies**:
   - `npm install pino`
   - `npm install pino-pretty --save-dev`
2. **Create Logger Utility**:
   - Create `src/Backend/utils/logger.ts` which configures and exports a `pino` instance. It will use `pino-pretty` if `NODE_ENV` is not `production`.
3. **Migrate Existing Logs**:
   - Search and replace all instances of `console.log`, `console.info`, `console.debug`, `console.warn`, and `console.error` across `src/Backend/` with the corresponding `logger.*` calls.
4. **Enhance Agent Tracing**:
   - Audit `src/Backend/agent/nodes/*.ts` and `src/Backend/agent/nodes/workers/*.ts`.
   - Add detailed `logger.debug` statements at the beginning of each node/worker to trace inputs and state.
   - Ensure all `catch` blocks use `logger.error` to properly bubble up exceptions with context.
5. **Update Guidelines**:
   - Modify the root `GEMINI.md` to add a new section explicitly forbidding `console.*` in favor of importing from `@/Backend/utils/logger`.

## Verification
- Run the backend server (`npm run server` or `npm start`) and verify that startup logs and GraphQL requests output properly formatted Pino logs.
- Trigger an agent flow and verify that `logger.debug` and `logger.info` statements trace the execution path clearly in the console.
- Run `npm run lint` or TypeScript checks to ensure no type errors were introduced by the logger switch.

## Migration & Rollback
- **Migration**: Straightforward replacement of `console.*` imports/usages. 
- **Rollback**: We will utilize a separate Git commit for this track. If issues arise, we can cleanly revert the commit or temporarily alias the `logger.ts` export back to the global `console` object until the issue is resolved.
