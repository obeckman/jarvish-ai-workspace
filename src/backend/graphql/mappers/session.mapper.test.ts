import { describe, expect, it } from 'vitest';

import {
  mapSessionRow,
  mapSessionSummaryRow,
  mapStructuredFactRow,
} from '@/backend/graphql/mappers/session.mapper';

describe('Jarvish session row mappers', () => {
  it('formats Date instances for session rows', () => {
    expect(mapSessionRow({
      id: 'session-1',
      title: 'Calendar check',
      createdAt: new Date('2026-06-10T10:00:00.000Z'),
      updatedAt: new Date('2026-06-10T10:05:00.000Z'),
    })).toEqual({
      id: 'session-1',
      title: 'Calendar check',
      createdAt: '2026-06-10T10:00:00.000Z',
      updatedAt: '2026-06-10T10:05:00.000Z',
    });
  });

  it('passes through string-like dates for summaries', () => {
    expect(mapSessionSummaryRow({
      sessionId: 'session-1',
      summaryTitle: 'Meetings',
      userMessage: 'meetings today?',
      aiAnswer: 'one meeting',
      createdAt: '2026-06-10',
    } as never)).toEqual({
      sessionId: 'session-1',
      summaryTitle: 'Meetings',
      userMessage: 'meetings today?',
      aiAnswer: 'one meeting',
      createdAt: '2026-06-10',
    });
  });

  it('normalizes persisted stringified block content in summaries', () => {
    expect(mapSessionSummaryRow({
      sessionId: 'session-1',
      summaryTitle: 'Conversation Summary',
      userMessage: 'whats the date',
      aiAnswer: JSON.stringify([{ type: 'text', content: 'Today is Sunday, June 14, 2026.' }]),
      createdAt: '2026-06-14',
    } as never)).toEqual({
      sessionId: 'session-1',
      summaryTitle: 'Conversation Summary',
      userMessage: 'whats the date',
      aiAnswer: 'Today is Sunday, June 14, 2026.',
      createdAt: '2026-06-14',
    });
  });

  it('normalizes legacy summaries truncated inside stringified block content', () => {
    expect(mapSessionSummaryRow({
      sessionId: 'session-1',
      summaryTitle: 'Conversation Summary',
      userMessage: 'whats the date',
      aiAnswer: '[{"type":"text","content":"You have the following meetings scheduled this week:\\n\\n* אורן חנן:',
      createdAt: '2026-06-14',
    } as never)).toEqual({
      sessionId: 'session-1',
      summaryTitle: 'Conversation Summary',
      userMessage: 'whats the date',
      aiAnswer: 'You have the following meetings scheduled this week:\n\n* אורן חנן:',
      createdAt: '2026-06-14',
    });
  });

  it('applies defaults for optional structured fact fields', () => {
    expect(mapStructuredFactRow({
      id: 'fact-1',
      sessionId: null,
      fact: 'User prefers short answers',
      category: null,
      confidence: null,
      createdAt: 1781091716314,
    } as never)).toEqual({
      id: 'fact-1',
      sessionId: null,
      fact: 'User prefers short answers',
      category: 'general',
      confidence: 100,
      createdAt: '1781091716314',
    });
  });
});
