import { describe, expect, it } from 'vitest';

import { INITIAL_CHAT_STATE, STATE_ACTIONS } from '@/frontend/features/jarvishAgent/constants';
import { chatReducer } from '@/frontend/features/jarvishAgent/hooks/UseJarvishChat/state';
import { AGENT_STATUS, BLOCK_TYPES, ROLES } from '@/shared/jarvish.constants';

describe('Jarvish chat reducer', () => {
  it('adds messages without mutating the previous state', () => {
    const message = {
      id: 'user-1',
      role: ROLES.USER,
      type: BLOCK_TYPES.TEXT,
      content: 'hello',
      timestamp: 1,
    };

    const nextState = chatReducer(INITIAL_CHAT_STATE, {
      type: STATE_ACTIONS.ADD_MESSAGE,
      payload: message,
    });

    expect(INITIAL_CHAT_STATE.messages).toEqual([]);
    expect(nextState.messages).toEqual([message]);
  });

  it('tracks latest confidence while retaining the lowest observation', () => {
    const first = chatReducer(INITIAL_CHAT_STATE, {
      type: STATE_ACTIONS.RECORD_CONFIDENCE_OBSERVATION,
      payload: { confidence: 88, reason: 'high signal' },
    });
    const second = chatReducer(first, {
      type: STATE_ACTIONS.RECORD_CONFIDENCE_OBSERVATION,
      payload: { confidence: 63, reason: 'tool mismatch' },
    });
    const third = chatReducer(second, {
      type: STATE_ACTIONS.RECORD_CONFIDENCE_OBSERVATION,
      payload: { confidence: 91, reason: 'resolved' },
    });

    expect(third.confidenceSummary).toEqual({
      latest: 91,
      lowest: 63,
      reason: 'tool mismatch',
    });
  });

  it('resets back to the Jarvish initial chat state', () => {
    const dirtyState = {
      ...INITIAL_CHAT_STATE,
      input: 'custom prompt',
      status: AGENT_STATUS.ERROR,
      statusLogs: ['failed'],
    };

    expect(chatReducer(dirtyState, { type: STATE_ACTIONS.RESET_CHAT })).toEqual(INITIAL_CHAT_STATE);
  });
});
