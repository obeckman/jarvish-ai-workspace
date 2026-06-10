import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSessions: vi.fn(),
  getSessionHistory: vi.fn(),
  getSessionSummary: vi.fn(),
  getSessionSummaryBySessionId: vi.fn(),
  getStructuredFacts: vi.fn(),
  startResearch: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  deleteStructuredFact: vi.fn(),
  streamAgentEvents: vi.fn(),
}));

vi.mock('@/backend/graphql/services/session.resolver.service', () => ({
  getSessions: mocks.getSessions,
  getSessionHistory: mocks.getSessionHistory,
}));

vi.mock('@/backend/graphql/services/summary.resolver.service', () => ({
  getSessionSummary: mocks.getSessionSummary,
  getSessionSummaryBySessionId: mocks.getSessionSummaryBySessionId,
}));

vi.mock('@/backend/graphql/services/fact.resolver.service', () => ({
  getStructuredFacts: mocks.getStructuredFacts,
  deleteStructuredFact: mocks.deleteStructuredFact,
}));

vi.mock('@/backend/graphql/services/mutation.resolver.service', () => ({
  startResearch: mocks.startResearch,
  createSession: mocks.createSession,
  deleteSession: mocks.deleteSession,
}));

vi.mock('@/backend/graphql/services/agent-event.service', () => ({
  streamAgentEvents: mocks.streamAgentEvents,
}));

describe('GraphQL resolvers', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
  });

  it('delegates query and mutation resolvers to backend services', async () => {
    const { resolvers } = await import('@/backend/graphql/resolvers');
    mocks.getSessions.mockResolvedValue(['session']);
    mocks.createSession.mockResolvedValue({ id: 'session-1' });

    expect(resolvers.Query?.status?.({}, {}, {} as never, {} as never)).toBe('Backend graphQL is healthy');
    await expect(resolvers.Query?.getSessions?.({}, { limit: 10 }, {} as never, {} as never)).resolves.toEqual(['session']);
    await expect(resolvers.Mutation?.createSession?.({}, { id: 'session-1', title: 'Draft' }, {} as never, {} as never))
      .resolves.toEqual({ id: 'session-1' });

    expect(mocks.getSessions).toHaveBeenCalledWith({ limit: 10 });
    expect(mocks.createSession).toHaveBeenCalledWith({ id: 'session-1', title: 'Draft' });
  });

  it('resolves session summaries from parent sessions', async () => {
    const { resolvers } = await import('@/backend/graphql/resolvers');
    mocks.getSessionSummaryBySessionId.mockResolvedValue({ sessionId: 'session-1' });

    await expect(resolvers.Session?.summary?.({ id: 'session-1' } as never, {}, {} as never, {} as never))
      .resolves.toEqual({ sessionId: 'session-1' });

    expect(mocks.getSessionSummaryBySessionId).toHaveBeenCalledWith('session-1');
  });

  it('passes Google token header into subscription stream service', async () => {
    const { resolvers } = await import('@/backend/graphql/resolvers');
    const payload = { agentEvents: { type: 'STATUS', content: 'ok' } };
    mocks.streamAgentEvents.mockImplementation(async function* () {
      yield payload;
    });

    const iterator = resolvers.Subscription?.agentEvents.subscribe(
      {},
      { query: 'hello', history: [], attachments: [], sessionId: 'session-1' },
      {
        request: {
          headers: new Headers({ 'x-google-token': 'token-1' }),
        },
      } as never,
      {} as never,
    ) as AsyncGenerator<unknown>;

    await expect(iterator.next()).resolves.toEqual({ value: payload, done: false });
    expect(mocks.streamAgentEvents).toHaveBeenCalledWith({
      query: 'hello',
      history: [],
      attachments: [],
      sessionId: 'session-1',
      googleToken: 'token-1',
    });

    expect(resolvers.Subscription?.agentEvents.resolve(payload)).toEqual(payload.agentEvents);
  });
});
