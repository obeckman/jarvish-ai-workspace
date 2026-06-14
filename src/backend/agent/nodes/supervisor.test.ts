import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';

import { supervisorNode } from '@/backend/agent/nodes/supervisor';
import type { AgentStateType } from '@/backend/agent/state';
import { NODE_NAMES, STAGES } from '@/shared/jarvish.constants';

function state(message: string): AgentStateType {
  return {
    messages: [new HumanMessage(message)],
    memories: [],
    researchNotes: [],
    metadata: { stage: STAGES.PREPARE, status: 'idle' },
    attachments: [],
    processedAttachments: [],
    googleToken: null,
    lastWorker: null,
    toolConfidence: null,
    sessionId: 'test-session',
    userId: 'test-user',
  };
}

describe('supervisor node deterministic routing', () => {
  it('routes historical chart requests to the research worker', async () => {
    const result = await supervisorNode(state('show me the graph of the s&p 500 on all the known years'));
    const message = result.messages?.[0] as AIMessage;

    expect(message.tool_calls?.[0]).toMatchObject({
      name: 'delegate_to_research_worker',
      args: {
        reason: expect.stringContaining('renderable chart/table'),
      },
    });
    expect(result.metadata).toMatchObject({
      stage: STAGES.SYNTHESIZE,
      confidence: 100,
    });
  });

  it('does not re-route completed worker responses', async () => {
    const result = await supervisorNode({
      ...state('show me a graph'),
      messages: [
        new HumanMessage('show me a graph'),
        new AIMessage({ content: 'done', name: NODE_NAMES.RESEARCH_WORKER }),
      ],
    });

    expect(result).toEqual({});
  });
});
