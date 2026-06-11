import { useState, useCallback, useEffect, useRef } from 'react';
import { Session } from '@/frontend/features/jarvishAgent/types';
import { STORAGE_KEYS, API_ENDPOINTS } from "@/shared/jarvish.constants";
import {GQL_QUERIES, GQL_MUTATIONS, UI_STRINGS} from '@/frontend/features/jarvishAgent/constants'
import {
  GetSessionSummaryQuery,
  GetSessionsQuery,
  GetSessionsQueryVariables,
} from '@/frontend/features/jarvishAgent/graphql/__generated__/graphql'
import { getGraphQLHeaders } from '@/frontend/features/jarvishAgent/utils/authHeaders';


export const useJarvishSessions = (
  searchTerm: string,
  idToken: string | null,
  checkAndRefreshIdToken?: () => Promise<string | null>,
) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(localStorage.getItem(STORAGE_KEYS.SESSION_ID));
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const isFetchingRef = useRef(false);
  const offsetRef = useRef(0);
  const currentSessionIdRef = useRef(currentSessionId);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const fetchSessions = useCallback(async (reset = false) => {
    const activeIdToken = await getActiveIdToken(idToken, checkAndRefreshIdToken);
    if (!activeIdToken) {
      setSessions([]);
      setHasMore(false);
      setCurrentSessionId(null);
      localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetchingSessions(true);

    const newOffset = reset ? 0 : offsetRef.current;
    const limit = 10;

    try {
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: getGraphQLHeaders(activeIdToken),
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
        const fetched = result.data.getSessions as Session[];
        setSessions(prev => reset ? fetched : [...prev, ...fetched]);

        const selectedSessionId = currentSessionIdRef.current;
        if (reset && !searchTerm && selectedSessionId && !fetched.some((session) => session.id === selectedSessionId)) {
          setCurrentSessionId(null);
          currentSessionIdRef.current = null;
          localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
        }
        
        const nextOffset = newOffset + fetched.length;
        offsetRef.current = nextOffset;
        
        setHasMore(fetched.length === limit);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      isFetchingRef.current = false;
      setIsFetchingSessions(false);
    }
  }, [checkAndRefreshIdToken, idToken, searchTerm]);

  const fetchSummary = useCallback(async (sessionId: string) => {
    const activeIdToken = await getActiveIdToken(idToken, checkAndRefreshIdToken);
    if (!activeIdToken) return null;

    try {
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: getGraphQLHeaders(activeIdToken),
        body: JSON.stringify({
          query: GQL_QUERIES.GET_SESSION_SUMMARY,
          variables: { sessionId }
        })
      });
      if (!res.ok) {
        throw new Error(`Summary request failed with status ${res.status}`);
      }

      const result: { data?: GetSessionSummaryQuery; errors?: Array<{ message?: string }> } = await res.json();

      if (result.errors?.length) {
        throw new Error(result.errors.map(error => error.message || 'GraphQL summary error').join('; '));
      }

      if (result.data?.getSessionSummary) {
        const summary = result.data.getSessionSummary;
        setSessions(prev => prev.map(s =>
          s.id === sessionId ? { ...s, summary: summary } : s
        ));
        return summary;
      } else {
        return null;
      }
    } catch (e) {
      console.error("Fetching summary failed", e);
    }
    return null;
  }, [checkAndRefreshIdToken, idToken]);

  const triggerSummary = useCallback(async (sessionId: string, _e?: React.MouseEvent) => {
    const activeIdToken = await getActiveIdToken(idToken, checkAndRefreshIdToken);
    if (!activeIdToken) return;

    setIsPolling(true);
    const maxRetries = 5;
    let retries = 0;
    let delay = 1000;

    while (retries < maxRetries) {
      try {
        await fetch(API_ENDPOINTS.GRAPHQL, {
          method: 'POST',
          headers: getGraphQLHeaders(activeIdToken),
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
  }, [checkAndRefreshIdToken, fetchSummary, idToken]);

  const createNewSession = useCallback(async (initialQuery?: string) => {
    const activeIdToken = await getActiveIdToken(idToken, checkAndRefreshIdToken);
    if (!activeIdToken) return null;

    const title = initialQuery
      ? (initialQuery.substring(0, 30) + (initialQuery.length > 30 ? '...' : ''))
      : 'New Research';

    try {
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: getGraphQLHeaders(activeIdToken),
        body: JSON.stringify({
          query: GQL_MUTATIONS.CREATE_SESSION,
          variables: { title, initialQuery }
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
  }, [checkAndRefreshIdToken, idToken]);

  const deleteSession = useCallback(async (id: string, _e?: React.MouseEvent) => {
    const activeIdToken = await getActiveIdToken(idToken, checkAndRefreshIdToken);
    if (!activeIdToken) return;

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
        headers: getGraphQLHeaders(activeIdToken),
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
  }, [checkAndRefreshIdToken, currentSessionId, idToken, sessions]);

  const updateCurrentSession = useCallback((id: string | null) => {
    setCurrentSessionId(id);
    currentSessionIdRef.current = id;
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

async function getActiveIdToken(
  idToken: string | null,
  checkAndRefreshIdToken?: () => Promise<string | null>,
): Promise<string | null> {
  if (checkAndRefreshIdToken) {
    return checkAndRefreshIdToken();
  }

  return idToken;
}
