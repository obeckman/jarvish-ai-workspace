# Agent Graph

Jarvish uses LangGraph to make the agent workflow explicit and reviewable. The graph is assembled in `src/backend/agent/graph.ts`, with node registration in `src/backend/agent/graph/nodes.ts` and topology in `src/backend/agent/graph/topology.ts`.

## Flow

```txt
START
  -> context
  -> processing
  -> supervisor
  -> research_worker | google_worker | coder_worker | archive
  -> tools | supervisor
  -> research_worker | google_worker | coder_worker | supervisor | clarification
  -> archive
  -> END
```

## Responsibilities

- `context` retrieves relevant long-term memory before the model plans the response.
- `processing` prepares the user request, attachments, and history for model consumption.
- `supervisor` decides which worker should handle the next step.
- worker nodes produce domain-specific reasoning and tool calls.
- `tools` executes model-requested tools and validates tool output before returning control.
- `clarification` handles cases where the graph cannot proceed with enough confidence.
- `archive` stores durable session summaries and extracted facts.

## Design Intent

The graph keeps orchestration separate from worker behavior. Routing is centralized in `src/backend/agent/graph/routers.ts`, which makes it easier to reason about loops, termination, and tool handoffs without digging through prompt code.
