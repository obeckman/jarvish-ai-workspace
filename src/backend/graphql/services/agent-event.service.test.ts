import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EventType as GraphQLEventType } from '@/backend/graphql/__generated__/resolvers-types';
import { streamAgentEvents } from '@/backend/graphql/services/agent-event.service';
import { STAGES } from '@/shared/jarvish.constants';

const mocks = vi.hoisted(() => ({
  stream: vi.fn(),
  touchSession: vi.fn(),
  ensureSessionForUser: vi.fn(),
}));

vi.mock('@/backend/agent/graph', () => ({
  createAgentGraph: () => ({
    stream: mocks.stream,
  }),
}));

vi.mock('@/backend/graphql/services/session.resolver.service', () => ({
  getCheckpointer: () => ({ mocked: true }),
  touchSession: mocks.touchSession,
  ensureSessionForUser: mocks.ensureSessionForUser,
}));

async function collectEvents(generator: AsyncGenerator<unknown>) {
  const events = [];

  for await (const event of generator) {
    events.push(event);
  }

  return events;
}

describe('Jarvish agent event stream service', () => {
  beforeEach(() => {
    mocks.stream.mockReset();
    mocks.touchSession.mockReset();
    mocks.ensureSessionForUser.mockReset();
    mocks.ensureSessionForUser.mockResolvedValue(true);
  });

  it('streams status, user-facing messages, and reasoning updates from graph chunks', async () => {
    mocks.touchSession.mockResolvedValue(undefined);
    mocks.stream.mockResolvedValueOnce((async function* () {
      yield ['updates', {
        supervisor: {
          metadata: {
            status: 'Thinking...',
            stage: STAGES.RESEARCH,
            confidence: 88,
            validationReason: 'routed',
          },
          messages: [{ content: 'final answer' }],
        },
        archive: {
          messages: [{ content: 'archived detail' }],
        },
      }];
      yield ['debug', {
        supervisor: {
          messages: [{ content: 'ignored' }],
        },
      }];
    })());

    const events = await collectEvents(streamAgentEvents({
      query: 'meetings today?',
      history: [{ role: 'user', content: 'hello' }],
      attachments: [],
      sessionId: 'session-1',
      userId: 'user-1',
    }));

    expect(mocks.touchSession).toHaveBeenCalledWith('session-1', 'user-1');
    expect(events).toEqual([
      {
        agentEvents: {
          type: GraphQLEventType.Status,
          content: 'Thinking...',
          stage: STAGES.RESEARCH,
          metadata: {
            confidence: 88,
            validationReason: 'routed',
          },
        },
      },
      {
        agentEvents: {
          type: GraphQLEventType.Message,
          content: 'final answer',
          stage: null,
          metadata: null,
        },
      },
      {
        agentEvents: {
          type: GraphQLEventType.Reasoning,
          content: 'archived detail',
          stage: null,
          metadata: null,
        },
      },
    ]);
  });

  it('skips empty content and pending tool-call messages', async () => {
    mocks.stream.mockResolvedValueOnce((async function* () {
      yield ['updates', {
        supervisor: {
          messages: [
            { content: '' },
            { content: 'tool requested', tool_calls: [{ name: 'list_calendar_events' }] },
          ],
        },
      }];
    })());

    await expect(collectEvents(streamAgentEvents({
      query: 'calendar',
      history: [],
      attachments: [],
      sessionId: null,
      userId: 'user-1',
    }))).resolves.toEqual([]);
  });

  it('emits an error event when graph streaming fails', async () => {
    mocks.stream.mockResolvedValueOnce((async function* () {
      throw new Error('Gemini denied');
    })());

    await expect(collectEvents(streamAgentEvents({
      query: 'calendar',
      history: [],
      attachments: [],
      sessionId: null,
      userId: 'user-1',
    }))).resolves.toEqual([
      {
        agentEvents: {
          type: GraphQLEventType.Error,
          content: 'Gemini denied',
          stage: null,
          metadata: {
            confidence: 0,
            validationReason: 'Gemini denied',
          },
        },
      },
    ]);
  });
});
