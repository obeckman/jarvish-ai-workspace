import { describe, expect, it } from 'vitest';

import {
  createAssistantMessageId,
  createHistoryMessageId,
  createReasoningMessageId,
  createUserMessageId,
} from '@/frontend/features/jarvishAgent/utils/messageIds';

describe('Jarvish message id helpers', () => {
  it('creates stable ids by message source', () => {
    expect(createHistoryMessageId(2, 3)).toBe('history-2-3');
    expect(createReasoningMessageId('assistant-10', 4)).toBe('reasoning-assistant-10-4');
    expect(createAssistantMessageId(1781091716314)).toBe('assistant-1781091716314');
    expect(createUserMessageId(1781091716314)).toBe('user-1781091716314');
  });
});
