# Implementation Plan: Jarvish UX Improvements & TS Fixes

## Objective
1.  Implement an auto-scroll mechanism in `JarvishChatArea.tsx` for better UX.
2.  Resolve TypeScript errors and architectural inconsistencies in `parser.ts`.
3.  Fix related type mismatches in the `useJarvishChat` hook.

## Key Files & Context
- `src/features/jarvishAgent/components/JarvishChatArea.tsx`
- `src/features/jarvishAgent/utils/parser.ts`
- `src/features/jarvishAgent/hooks/UseJarvishChat/useJarvishChat.ts`

## Implementation Steps

### Phase 1: Auto-scroll Implementation
1.  **Import Hooks:** In `JarvishChatArea.tsx`, import `useRef` and `useEffect` from `'react'`.
2.  **Add Ref:** Create a `messagesEndRef = useRef<HTMLDivElement>(null)` inside `JarvishChatArea`.
3.  **Add Effect:** Add a `useEffect` that calls `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })` whenever `messages` or `status` changes.
4.  **Place Ref Element:** Render `<div ref={messagesEndRef} />` at the bottom of the chat message list.

### Phase 2: Parser & Hook TS Fixes
1.  **Fix Parser (`parser.ts`):**
    -   Handle potential `undefined` from `JSON.stringify(parsed)` using `?? ''`.
    -   Remove unused `partial-json-parser` import or implement it for robustness as intended.
    -   Clean up redundant `typeof block.content === 'string'` checks (already guaranteed by Zod).
    -   Ensure consistent fallback behavior between array and single object parsing.
2.  **Fix Consumer (`useJarvishChat.ts`):**
    -   Correct the assignment where `EventType` was being used as `BlockType`. Ensure `Message.type` is assigned correctly from the message block or a valid constant.

## Verification & Testing
1.  **UI Test:** Start a chat, verify smooth auto-scroll as new messages/reasoning steps arrive.
2.  **Type Check:** Run `npx tsc src/features/jarvishAgent/utils/parser.ts --noEmit` and verify no errors.
3.  **Functional Test:** Verify that complex agent messages (nested JSON, markdown code blocks) still parse correctly with the refined logic.
