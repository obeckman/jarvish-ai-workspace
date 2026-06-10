import { describe, expect, it } from 'vitest';

import {
  mapGraphQLEventTypeToDomain,
  parseAgentEventPayload,
} from '@/frontend/features/jarvishAgent/utils/eventMapper';
import { EVENT_TYPES } from '@/shared/jarvish.constants';

describe('Jarvish frontend event mapper', () => {
  it('maps GraphQL enum names into shared domain event values', () => {
    expect(mapGraphQLEventTypeToDomain('MESSAGE')).toBe(EVENT_TYPES.MESSAGE);
    expect(mapGraphQLEventTypeToDomain('reasoning')).toBe(EVENT_TYPES.REASONING);
    expect(mapGraphQLEventTypeToDomain('UNKNOWN')).toBeNull();
  });

  it('normalizes streamed payloads and defaults nullable content', () => {
    expect(parseAgentEventPayload({
      agentEvents: {
        type: 'STATUS',
        content: null,
        stage: 2,
        metadata: {
          confidence: 72,
          validationReason: 'tool result validated',
        },
      },
    })).toEqual({
      type: EVENT_TYPES.STATUS,
      content: '',
      stage: 2,
      metadata: {
        confidence: 72,
        validationReason: 'tool result validated',
      },
    });
  });

  it('rejects malformed or unsupported event payloads', () => {
    expect(() => parseAgentEventPayload({ agentEvents: { type: 'NOPE', content: '', stage: null } }))
      .toThrow('Unsupported agent event type');

    expect(() => parseAgentEventPayload({ agentEvents: { type: 'MESSAGE', stage: null } }))
      .toThrow();
  });
});
