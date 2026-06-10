import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';

import {
  supervisorRouter,
  toolsRouter,
  workerRouter,
} from '@/backend/agent/graph/routers';
import type { AgentStateType } from '@/backend/agent/state';
import { NODE_NAMES } from '@/shared/jarvish.constants';

function state(overrides: Partial<AgentStateType>): AgentStateType {
  return {
    messages: [],
    memories: [],
    researchNotes: [],
    metadata: { stage: 1, status: 'idle' },
    attachments: [],
    processedAttachments: [],
    googleToken: null,
    lastWorker: null,
    toolConfidence: null,
    sessionId: null,
    userId: 'developer',
    ...overrides,
  };
}

describe('Jarvish graph routers', () => {
  it('routes supervisor tool calls to the selected worker', () => {
    expect(supervisorRouter(state({
      messages: [new AIMessage({
        content: '',
        tool_calls: [{ name: 'delegate_to_google_worker', args: {}, id: 'call-1', type: 'tool_call' }],
      })],
    }))).toBe(NODE_NAMES.GOOGLE_WORKER);
  });

  it('archives when the supervisor has no worker delegation', () => {
    expect(supervisorRouter(state({
      messages: [new HumanMessage('done')],
    }))).toBe(NODE_NAMES.ARCHIVE);
  });

  it('routes workers with tool calls through the tool node', () => {
    expect(workerRouter(state({
      messages: [new AIMessage({
        content: '',
        tool_calls: [{ name: 'list_calendar_events', args: {}, id: 'call-1', type: 'tool_call' }],
      })],
    }))).toBe(NODE_NAMES.TOOLS);

    expect(workerRouter(state({ messages: [new AIMessage('answer')] }))).toBe(NODE_NAMES.SUPERVISOR);
  });

  it('routes low-confidence tool output to clarification, otherwise back to the last worker', () => {
    expect(toolsRouter(state({
      toolConfidence: 20,
      lastWorker: NODE_NAMES.GOOGLE_WORKER,
    }))).toBe(NODE_NAMES.CLARIFICATION);

    expect(toolsRouter(state({
      toolConfidence: 95,
      lastWorker: NODE_NAMES.GOOGLE_WORKER,
    }))).toBe(NODE_NAMES.GOOGLE_WORKER);

    expect(toolsRouter(state({ toolConfidence: 95 }))).toBe(NODE_NAMES.SUPERVISOR);
  });
});
