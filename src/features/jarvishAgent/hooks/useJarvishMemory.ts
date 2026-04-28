import { useState, useCallback, useEffect } from 'react';
import { StructuredFact } from '@/features/jarvishAgent/types';
import { API_ENDPOINTS, GQL_QUERIES, GQL_MUTATIONS } from '@/features/jarvishAgent/constants';

export const useJarvishMemory = () => {
  const [facts, setFacts] = useState<StructuredFact[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  const fetchFacts = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: GQL_QUERIES.GET_STRUCTURED_FACTS })
      });
      const result = await res.json();
      if (result.data?.getStructuredFacts) {
        setFacts(result.data.getStructuredFacts);
      }
    } catch (e) {
      console.error('Failed to fetch structured facts:', e);
    } finally {
      setIsFetching(false);
    }
  }, []);

  const deleteFact = useCallback(async (id: string) => {
    try {
      await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_MUTATIONS.DELETE_STRUCTURED_FACT,
          variables: { id }
        })
      });
      setFacts(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      console.error('Failed to delete structured fact:', e);
    }
  }, []);

  useEffect(() => {
    fetchFacts();
  }, [fetchFacts]);

  return {
    facts,
    isFetching,
    fetchFacts,
    deleteFact
  };
};
