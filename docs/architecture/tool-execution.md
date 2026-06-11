# Tool Execution

Tool execution is centralized in `src/backend/agent/tools/tool-executor.ts`. Model tool calls do not directly reach service code; they pass through a registry, argument schemas, execution handlers, and output validation.

## Execution Path

```txt
worker emits tool call
  -> tools graph node
  -> executeAgentTool(call, state)
  -> zod argument schema validation
  -> service handler
  -> output validation and confidence score
  -> formatted tool note returned to graph
```

## Registered Tool Families

- web search and page fetch
- PDF and file reads
- memory add/forget
- processed attachment queries
- inventory checks
- Google Calendar, Gmail, and Docs actions when an auth token is present

## High-Risk Tool Gating

`NODE_ENV=production` is treated as hosted/public mode for local filesystem tools. In that mode, `write_file` is not exposed to the model and is rejected by the central executor if requested anyway. `read_file` remains available only for a small public allowlist: `README.md`, `docs/**`, and selected agent/tool overview source files.

All local file paths are resolved from the project root with `path.relative` boundary checks. Hidden files and environment files such as `.env` are denied in every environment.

## Reliability Notes

Each tool call returns a structured execution result with:

- `output`
- `confidence`
- `valid`
- `reason`

That lets the graph reason about low-confidence tool results instead of blindly injecting external data into the next model step.
