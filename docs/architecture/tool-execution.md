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

## Reliability Notes

Each tool call returns a structured execution result with:

- `output`
- `confidence`
- `valid`
- `reason`

That lets the graph reason about low-confidence tool results instead of blindly injecting external data into the next model step.
