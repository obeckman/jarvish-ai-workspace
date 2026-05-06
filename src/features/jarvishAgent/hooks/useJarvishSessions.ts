import { useState, useCallback, useEffect } from 'react';
import { GetSessionSummaryResponseSchema, Session } from '@/features/jarvishAgent/types';
import { STORAGE_KEYS, API_ENDPOINTS, GQL_QUERIES, GQL_MUTATIONS, UI_STRINGS } from '@/features/jarvishAgent/constants';
import { GetSessionsQuery, GetSessionsQueryVariables } from '../gql'


export const useJarvishSessions = (searchTerm: string) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(localStorage.getItem(STORAGE_KEYS.SESSION_ID));
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const fetchSessions = useCallback(async (reset = false) => {
    if (isFetchingSessions) return;
    setIsFetchingSessions(true);

    const newOffset = reset ? 0 : offset;
    const limit = 10;

    try {
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_QUERIES.GET_SESSIONS,
          variables: {
            limit,
            offset: newOffset,
            search: searchTerm || null
          } as GetSessionsQueryVariables
        })
      });
      const result: { data: GetSessionsQuery } = await res.json();
      if (result.data.getSessions) {
        const fetched = result.data.getSessions;
        setSessions(prev => reset ? (fetched as Session[]) : [...prev, ...(fetched as Session[])]);
        setOffset(newOffset + fetched.length);
        setHasMore(fetched.length === limit);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      setIsFetchingSessions(false);
    }
  }, [offset, searchTerm, isFetchingSessions]);

  const fetchSummary = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_QUERIES.GET_SESSION_SUMMARY,
          variables: { sessionId }
        })
      });
      const result = await res.json();
      const validatedResponse = GetSessionSummaryResponseSchema.parse(result.data);

      if (validatedResponse.getSessionSummary) {
        const summary = validatedResponse.getSessionSummary;
        setSessions(prev => prev.map(s =>
          s.id === sessionId ? { ...s, summary: summary } : s
        ));
        return summary;
      }
    } catch (e) {
      console.error("Fetching summary failed", e);
    }
    return null;
  }, []);

  const triggerSummary = useCallback(async (sessionId: string, _e?: React.MouseEvent) => {
    setIsPolling(true);
    const maxRetries = 5;
    let retries = 0;
    let delay = 1000;

    while (retries < maxRetries) {
      try {
        await fetch(API_ENDPOINTS.GRAPHQL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: GQL_QUERIES.GET_SESSION_SUMMARY,
            variables: { sessionId }
          })
        });

        const summary = await fetchSummary(sessionId);
        if (summary) {
          setIsPolling(false);
          return;
        }
      } catch (e) {
        console.error(`Failed to trigger or fetch summary (retry ${retries + 1}/${maxRetries}):`, e);
      }

      retries++;
      delay *= 2;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    setIsPolling(false);
    console.error(`Failed to get session summary for ${sessionId} after ${maxRetries} retries.`);
  }, [fetchSummary]);

  const createNewSession = useCallback(async (initialQuery?: string) => {
    const id = `session-${Date.now()}`;
    const title = initialQuery
      ? (initialQuery.substring(0, 30) + (initialQuery.length > 30 ? '...' : ''))
      : 'New Research';

    try {
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_MUTATIONS.CREATE_SESSION,
          variables: { id, title, initialQuery }
        })
      });
      const result = await res.json();
      if (result.data?.createSession) {
        const newSession = result.data.createSession as Session;
        setSessions(prev => [newSession, ...prev]);
        return newSession.id;
      }
    } catch (e) {
      console.error('Failed to create session:', e);
    }
    return null;
  }, []);

  const deleteSession = useCallback(async (id: string, _e?: React.MouseEvent) => {
    if (!confirm(UI_STRINGS.DELETE_CONFIRMATION)) return;
    const previousSessions = sessions;
    const previousCurrentSessionId = currentSessionId;

    setSessions(prev => prev.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(null);
      localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    }

    try {
      await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_MUTATIONS.DELETE_SESSION,
          variables: { id }
        })
      });
    } catch (e) {
      console.error('Failed to delete session:', e);
      setSessions(previousSessions);
      setCurrentSessionId(previousCurrentSessionId);
      if (previousCurrentSessionId) {
        localStorage.setItem(STORAGE_KEYS.SESSION_ID, previousCurrentSessionId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      }
      alert(`Failed to delete session: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [currentSessionId, sessions]);

  const updateCurrentSession = useCallback((id: string | null) => {
    setCurrentSessionId(id);
    if (id) {
      localStorage.setItem(STORAGE_KEYS.SESSION_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
    }
  }, []);

  useEffect(() => {
    fetchSessions(true);
  }, [searchTerm, fetchSessions]);

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId: updateCurrentSession,
    isFetchingSessions,
    hasMore,
    fetchSessions,
    createNewSession,
    deleteSession,
    triggerSummary,
    isPolling
  };
};
