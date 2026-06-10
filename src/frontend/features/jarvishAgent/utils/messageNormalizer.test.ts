import { describe, expect, it, vi } from 'vitest';

import { normalizeHistoryMessages } from '@/frontend/features/jarvishAgent/utils/messageNormalizer';
import type { GetSessionHistoryQuery } from '@/frontend/features/jarvishAgent/graphql/__generated__/graphql';
import { BLOCK_TYPES, ROLES } from '@/shared/jarvish.constants';

type HistoryMessage = GetSessionHistoryQuery['getSessionHistory'][number];

describe('Jarvish frontend history normalizer', () => {
  it('preserves user text history as plain text messages', () => {
    expect(normalizeHistoryMessages([
      {
        __typename: 'Message',
        type: 'message',
        role: ROLES.USER,
        content: 'hello Jarvish',
      } as HistoryMessage,
    ])).toEqual([
      {
        id: 'history-0-0',
        type: BLOCK_TYPES.TEXT,
        content: 'hello Jarvish',
        timestamp: 0,
        role: ROLES.USER,
      },
    ]);
  });

  it('maps reasoning history to reasoning UI messages', () => {
    expect(normalizeHistoryMessages([
      {
        __typename: 'Message',
        type: 'reasoning',
        role: ROLES.REASONING,
        content: 'checked calendar tool',
      } as HistoryMessage,
    ])[0]).toMatchObject({
      type: BLOCK_TYPES.REASONING,
      content: 'checked calendar tool',
      role: ROLES.REASONING,
    });
  });

  it('parses structured agent block payloads from persisted history', () => {
    const [message] = normalizeHistoryMessages([
      {
        __typename: 'Message',
        type: 'message',
        role: ROLES.AGENT,
        content: JSON.stringify([
          { type: BLOCK_TYPES.TEXT, content: 'Meeting summary' },
          { type: BLOCK_TYPES.REASONING, content: 'Calendar tool returned one event' },
        ]),
      } as HistoryMessage,
    ]);

    expect(message.role).toBe(ROLES.AGENT);
    expect(message.content).toEqual([
      { type: BLOCK_TYPES.TEXT, content: 'Meeting summary' },
      { type: BLOCK_TYPES.REASONING, content: 'Calendar tool returned one event' },
    ]);
  });

  it('warns and defaults unknown persisted roles to agent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(normalizeHistoryMessages([
      {
        __typename: 'Message',
        type: 'message',
        role: 'legacy-bot',
        content: 'legacy answer',
      } as HistoryMessage,
    ])[0].role).toBe(ROLES.AGENT);

    expect(warn).toHaveBeenCalledWith('Unknown history role "legacy-bot", defaulting to agent.');
    warn.mockRestore();
  });
});
