/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useJarvishSessions } from '@/frontend/features/jarvishAgent/hooks/useJarvishSessions';
import { STORAGE_KEYS } from '@/shared/jarvish.constants';

const session = {
  __typename: 'Session' as const,
  id: 'session-1',
  title: 'Calendar check',
  createdAt: '2026-06-10T10:00:00.000Z',
  updatedAt: '2026-06-10T10:05:00.000Z',
  summary: null,
};

describe('useJarvishSessions', () => {
  const fetchMock = vi.fn();
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    consoleError.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('fetches sessions with the current search term', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ data: { getSessions: [session] } }),
    });

    const { result } = renderHook(() => useJarvishSessions('calendar', 'id-token'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.sessions).toEqual([session]));

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.variables).toMatchObject({
      limit: 10,
      offset: 0,
      search: 'calendar',
    });
    expect(result.current.hasMore).toBe(false);
  });

  it('persists the current session id in localStorage', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ data: { getSessions: [] } }),
    });

    const { result } = renderHook(() => useJarvishSessions('', 'id-token'));
    await waitFor(() => expect(result.current.isFetchingSessions).toBe(false));

    act(() => {
      result.current.setCurrentSessionId('session-123');
    });

    expect(result.current.currentSessionId).toBe('session-123');
    expect(localStorage.getItem(STORAGE_KEYS.SESSION_ID)).toBe('session-123');

    act(() => {
      result.current.setCurrentSessionId(null);
    });

    expect(localStorage.getItem(STORAGE_KEYS.SESSION_ID)).toBeNull();
  });

  it('creates new sessions and prepends them to state', async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ data: { getSessions: [] } }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ data: { createSession: session } }),
      });
    vi.spyOn(Date, 'now').mockReturnValue(1781091716314);

    const { result } = renderHook(() => useJarvishSessions('', 'id-token'));
    await waitFor(() => expect(result.current.isFetchingSessions).toBe(false));

    await act(async () => {
      expect(await result.current.createNewSession('please check my calendar today')).toBe('session-1');
    });

    expect(result.current.sessions).toEqual([session]);
    const createBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(createBody.variables).toMatchObject({
      id: 'session-1781091716314',
      title: 'please check my calendar today',
      initialQuery: 'please check my calendar today',
    });
  });

  it('clears a persisted session id that is not visible to the authenticated user', async () => {
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, 'legacy-session');
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ data: { getSessions: [session] } }),
    });

    const { result } = renderHook(() => useJarvishSessions('', 'id-token'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.currentSessionId).toBeNull());
    expect(localStorage.getItem(STORAGE_KEYS.SESSION_ID)).toBeNull();
  });

  it('optimistically deletes sessions and clears current selection', async () => {
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ data: { getSessions: [session] } }),
      })
      .mockResolvedValueOnce({
        json: async () => ({ data: { deleteSession: true } }),
      });
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, 'session-1');

    const { result } = renderHook(() => useJarvishSessions('', 'id-token'));
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));

    await act(async () => {
      await result.current.deleteSession('session-1');
    });

    expect(result.current.sessions).toEqual([]);
    expect(result.current.currentSessionId).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SESSION_ID)).toBeNull();
  });
});
