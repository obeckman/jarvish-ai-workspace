import { HumanMessage } from '@langchain/core/messages';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AgentStateType } from '@/backend/agent/state';

const originalEnv = { ...process.env };

describe('processing node shadow tooling file policy', () => {
  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('does not offer READ_FILE in the production shadow prompt', async () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    const { buildShadowToolPrompt } = await import('@/backend/agent/nodes/processing');

    expect(buildShadowToolPrompt('please inspect src/backend/index.ts')).not.toContain('READ_FILE');
  });

  it('blocks arbitrary production shadow file reads even if predicted', async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      SHADOW_TOOLING_ENABLED: 'true',
    };

    vi.doMock('@google/generative-ai', () => ({
      GoogleGenerativeAI: vi.fn(function GoogleGenerativeAI() {
        return {
          getGenerativeModel: vi.fn(() => ({
            generateContent: vi.fn(async () => ({
              response: {
                text: () => 'READ_FILE | src/backend/index.ts',
              },
            })),
          })),
        };
      }),
    }));

    const { processingNode } = await import('@/backend/agent/nodes/processing');

    const result = await processingNode({
      messages: [new HumanMessage('please inspect src/backend/index.ts for me')],
      memories: [],
      researchNotes: [],
      metadata: {},
      attachments: [],
      processedAttachments: [],
      googleToken: null,
      lastWorker: null,
      toolConfidence: null,
      sessionId: 'test-session',
      userId: 'test-user',
    } satisfies AgentStateType);

    expect(result.researchNotes).toEqual([]);
    expect(result.metadata.validationReason).toContain('Shadow file read was blocked by local file policy.');
  });
});
