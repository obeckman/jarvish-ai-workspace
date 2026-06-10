/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useJarvishMemory } from '@/frontend/features/jarvishAgent/hooks/useJarvishMemory';

const fact = {
  __typename: 'StructuredFact' as const,
  id: 'fact-1',
  sessionId: null,
  fact: 'User prefers concise summaries',
  category: 'preference',
  confidence: 95,
  createdAt: '2026-06-10T10:00:00.000Z',
};

describe('useJarvishMemory', () => {
  const fetchMock = vi.fn();
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    fetchMock.mockReset();
    consoleError.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches structured facts on mount', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { getStructuredFacts: [fact] } }),
    });

    const { result } = renderHook(() => useJarvishMemory());

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.facts).toEqual([fact]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).query).toBeDefined();
  });

  it('logs GraphQL errors and leaves facts empty', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errors: [{ message: 'facts unavailable' }] }),
    });

    const { result } = renderHook(() => useJarvishMemory());

    await waitFor(() => expect(result.current.isFetching).toBe(false));

    expect(result.current.facts).toEqual([]);
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to fetch structured facts:',
      expect.any(Error),
    );
  });

  it('optimistically removes deleted facts from local state', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { getStructuredFacts: [fact] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { deleteStructuredFact: true } }),
      });

    const { result } = renderHook(() => useJarvishMemory());
    await waitFor(() => expect(result.current.facts).toHaveLength(1));

    await act(async () => {
      await result.current.deleteFact('fact-1');
    });

    expect(result.current.facts).toEqual([]);
  });
});
