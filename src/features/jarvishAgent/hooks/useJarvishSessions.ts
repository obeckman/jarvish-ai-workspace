import { useState, useCallback, useEffect, useRef } from 'react';
import { Session } from '@/features/jarvishAgent/types';
import { STORAGE_KEYS, API_ENDPOINTS, GQL_QUERIES, GQL_MUTATIONS, UI_STRINGS } from '@/features/jarvishAgent/constants';

export const useJarvishSessions = (searchTerm: string) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(localStorage.getItem(STORAGE_KEYS.SESSION_ID));
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);
  
  const pollingIntervalRef = useRef<any>(null);

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
          variables: { limit, offset: newOffset, search: searchTerm || null }
        })
      });
      const result = await res.json();
      if (result.data?.getSessions) {
        const fetched = result.data.getSessions;
        setSessions(prev => reset ? fetched : [...prev, ...fetched]);
        setOffset(newOffset + fetched.length);
        setHasMore(fetched.length === limit);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      setIsFetchingSessions(false);
    }
  }, [offset, searchTerm, isFetchingSessions]);

  const startPollingSummary = useCallback((sessionId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    
    pollingIntervalRef.current = setInterval(async () => {
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
        if (result.data?.getSessionSummary) {
          setSessions(prev => prev.map(s => 
            s.id === sessionId ? { ...s, summary: result.data.getSessionSummary } : s
          ));
          clearInterval(pollingIntervalRef.current);
        }
      } catch (e) {
        console.error("Polling summary failed", e);
      }
    }, 3000);
  }, []);

  const triggerSummary = useCallback(async (sessionId: string) => {
    try {
      await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_QUERIES.GET_SESSION_SUMMARY,
          variables: { sessionId }
        })
      });
      startPollingSummary(sessionId);
    } catch (e) {
      console.error("Failed to trigger summary:", e);
    }
  }, [startPollingSummary]);

  const createNewSession = useCallback(async (initialQuery?: string) => {
    const id = `session-${Date.now()}`;
    try {
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_MUTATIONS.CREATE_SESSION,
          variables: { id, initialQuery }
        })
      });
      const result = await res.json();
      if (result.data?.createSession) {
        const newSession = result.data.createSession;
        setSessions(prev => [newSession, ...prev]);
        return newSession.id;
      }
    } catch (e) {
      console.error('Failed to create session:', e);
    }
    return null;
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    if (!confirm(UI_STRINGS.DELETE_CONFIRMATION)) return;
    try {
      await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_MUTATIONS.DELETE_SESSION,
          variables: { id }
        })
      });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
        localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  }, [currentSessionId]);

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
  }, [searchTerm]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

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
    isPolling: !!pollingIntervalRef.current
  };
};
