import { afterEach, describe, expect, it, vi } from 'vitest';

import { TOOL_NAMES } from '@/shared/jarvish.constants';
import type { AgentStateType } from '@/backend/agent/state';

const originalEnv = { ...process.env };

describe('agent tool executor production gating', () => {
  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('rejects write_file in production before service execution', async () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    const { executeAgentTool } = await import('@/backend/agent/tools/tool-executor');

    const result = await executeAgentTool({
      id: 'tool-call-1',
      name: TOOL_NAMES.WRITE_FILE,
      args: {
        path: 'docs/unsafe.md',
        content: 'unsafe',
      },
    }, {
      sessionId: 'test-session',
    } as AgentStateType);

    expect(result).toEqual({
      output: "Error: Tool 'write_file' is disabled in production.",
      confidence: 0,
      valid: false,
      reason: 'Tool is disabled in production.',
    });
  });
});
