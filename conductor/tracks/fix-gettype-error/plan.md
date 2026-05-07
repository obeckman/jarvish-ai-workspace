# Plan: Fix LangGraph `m._getType is not a function` Error

## Background & Motivation
The backend subscription `AgentChat` is crashing with `m._getType is not a function`. This happens because LangChain expects all objects in the `messages` array of the graph state to be instances of `BaseMessage` (such as `AIMessage`, `HumanMessage`, or `ToolMessage`). 

Currently, our agent nodes (like `supervisor.ts`, `tools.ts`, `research.ts`, etc.) are appending raw JavaScript objects (e.g., `{ role: 'model', content: '...' }`) to the state. When LangChain processes these raw objects, it attempts to call the `_getType()` method (which only exists on instantiated `BaseMessage` classes), causing the crash.

## Scope & Impact
We need to update all agent nodes to return proper LangChain message instances instead of raw objects.

## Proposed Solution
1. **Update `toolsNode` (`src/Backend/agent/nodes/tools.ts`):** 
   - Import `ToolMessage`.
   - Instead of pushing a raw object, push `new ToolMessage({ name: call.name, content: output, tool_call_id: call.id })`.
2. **Update AI Nodes (`supervisor.ts`, `research.ts`, `google.ts`, `coder.ts`, `clarification.ts`, `processing.ts`):**
   - Import `AIMessage`.
   - Return `new AIMessage({ content: ..., name: "...", tool_calls: ... })` instead of a raw object with `role: ROLES.MODEL`. For `processingNode`, use `new AIMessage({ content: ..., name: ROLES.REASONING })`.

## Verification
- Run `npm run server` and verify the `AgentChat` subscription functions correctly without throwing the `_getType` error.
- Run `npm run lint` and `npx tsc` to ensure there are no TypeScript errors.
