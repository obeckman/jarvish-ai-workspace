import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { graphqlRequest } from '@/frontend/lib/graphqlRequest';

describe('graphqlRequest', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns data and sends auth header, query, and variables', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ data: { hello: 'world' } }) });

    const data = await graphqlRequest<{ hello: string }, { id: string }>({
      query: 'query Hello($id: ID!) { hello }',
      variables: { id: '1' },
      idToken: 'token',
    });

    expect(data).toEqual({ hello: 'world' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/graphql');
    expect(init.headers.Authorization).toBe('Bearer token');
    expect(JSON.parse(init.body)).toEqual({ query: 'query Hello($id: ID!) { hello }', variables: { id: '1' } });
  });

  it('throws on HTTP error', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    await expect(graphqlRequest({ query: '{ x }', idToken: null })).rejects.toThrow('status 500');
  });

  it('throws on GraphQL errors', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ errors: [{ message: 'Boom' }, { message: 'Bang' }] }) });
    await expect(graphqlRequest({ query: '{ x }', idToken: null })).rejects.toThrow('Boom; Bang');
  });
});
