import { describe, expect, it } from 'vitest';

import {
  CreateSessionArgsSchema,
  GetSessionsArgsSchema,
  SessionIdArgsSchema,
  StreamAgentEventsInputSchema,
} from '@/backend/graphql/schemas/resolver.schema';

describe('Jarvish GraphQL resolver boundary schemas', () => {
  it('normalizes nullable stream arrays to empty arrays', () => {
    expect(StreamAgentEventsInputSchema.parse({
      query: 'check my meetings',
      history: null,
      attachments: null,
      sessionId: null,
      googleToken: null,
    })).toEqual({
      query: 'check my meetings',
      history: [],
      attachments: [],
      sessionId: null,
      googleToken: null,
    });
  });

  it('accepts valid pagination and rejects unsafe bounds', () => {
    expect(GetSessionsArgsSchema.parse({
      limit: 10,
      offset: 0,
      search: 'calendar',
    })).toEqual({
      limit: 10,
      offset: 0,
      search: 'calendar',
    });

    expect(() => GetSessionsArgsSchema.parse({ limit: 0 })).toThrow();
    expect(() => GetSessionsArgsSchema.parse({ offset: -1 })).toThrow();
  });

  it('requires non-empty identifiers and queries', () => {
    expect(() => SessionIdArgsSchema.parse({ sessionId: '' })).toThrow();
    expect(() => StreamAgentEventsInputSchema.parse({ query: '' })).toThrow();
    expect(() => CreateSessionArgsSchema.parse({ id: '', title: 'Draft' })).toThrow();
  });
});
