import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchSessionHistory,
  streamAgentChat,
} from '@/frontend/features/jarvishAgent/hooks/UseJarvishChat/transportClient';
import { BLOCK_TYPES, ROLES } from '@/shared/jarvish.constants';

describe('Jarvish GraphQL transport client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches session history with auth headers', async () => {
    const history = [
      { type: 'message', role: ROLES.AGENT, content: JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: 'hi' }]) },
    ];
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { getSessionHistory: history } }),
    });

    await expect(fetchSessionHistory('session-1', 'id-token')).resolves.toBe(history);
    expect(fetchMock).toHaveBeenCalledWith('/graphql', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer id-token',
      }),
    }));
  });

  it('returns an empty history when GraphQL data is missing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await expect(fetchSessionHistory('session-1', 'id-token')).resolves.toEqual([]);
  });

  it('throws for failed session history responses', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    await expect(fetchSessionHistory('session-1', 'id-token')).rejects.toThrow('Failed to load session history: 503');
  });

  it('joins GraphQL error messages for session history responses', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errors: [{ message: 'first' }, {}, { message: 'third' }] }),
    });

    await expect(fetchSessionHistory('session-1', 'id-token')).rejects.toThrow('first; GraphQL request failed; third');
  });

  it('throws for failed streaming responses', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(streamAgentChat(createStreamOptions())).rejects.toThrow('Server responded with 500');
  });

  it('throws when streaming response has no body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      body: null,
    });

    await expect(streamAgentChat(createStreamOptions())).rejects.toThrow('No response body received from server');
  });

  it('streams SSE messages and forwards reader references', async () => {
    const onReader = vi.fn();
    const onMessages = vi.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      body: createTextStream([
        'data: {"one":1}\n\n',
        'data: {"two":2}\n\n',
      ]),
    });

    await streamAgentChat(createStreamOptions({ onReader, onMessages, googleToken: 'google-token' }));

    expect(onReader).toHaveBeenCalledOnce();
    expect(onMessages).toHaveBeenCalledWith(['{"one":1}']);
    expect(onMessages).toHaveBeenCalledWith(['{"two":2}']);
    expect(onMessages).toHaveBeenLastCalledWith([]);
    expect(fetchMock).toHaveBeenCalledWith('/graphql', expect.objectContaining({
      headers: expect.objectContaining({
        Authorization: 'Bearer id-token',
        Accept: 'text/event-stream',
        'x-google-token': 'google-token',
      }),
    }));
  });
});

function createStreamOptions(overrides: Partial<Parameters<typeof streamAgentChat>[0]> = {}): Parameters<typeof streamAgentChat>[0] {
  return {
    idToken: 'id-token',
    googleToken: null,
    variables: {
      query: 'hello',
      history: [],
      attachments: [],
      sessionId: 'session-1',
    },
    signal: new AbortController().signal,
    onMessages: vi.fn(),
    ...overrides,
  };
}

function createTextStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
