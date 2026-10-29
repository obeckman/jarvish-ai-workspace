import { HumanMessage } from '@langchain/core/messages';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentStateType } from '@/backend/agent/state';
import { googleWorkerNode } from '@/backend/agent/nodes/workers/google';
import { BLOCK_TYPES, STAGES } from '@/shared/jarvish.constants';

const sendMessage = vi.fn();

vi.mock('@/backend/agent/nodes/model-adapters', () => ({
  createGeminiModel: vi.fn(() => ({
    startChat: vi.fn(() => ({
      sendMessage,
    })),
  })),
}));

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

describe('google worker node', () => {
  beforeEach(() => {
    sendMessage.mockReset();
  });

  it('wraps plain text worker answers in Jarvish UI blocks without repair', async () => {
    sendMessage.mockResolvedValueOnce({
      response: {
        text: () => 'I cannot tell you how your friends are doing as I do not have access to that information.',
        functionCalls: () => undefined,
      },
    });

    const result = await googleWorkerNode(state('how are my friends'));
    const message = result.messages?.[0];

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(message?.content))).toEqual([
      {
        type: BLOCK_TYPES.TEXT,
        content: 'I cannot tell you how your friends are doing as I do not have access to that information.',
      },
    ]);
    expect(result.metadata).toMatchObject({
      confidence: 100,
      validationReason: 'Response matched the shared UI block contract.',
    });
  });
});
