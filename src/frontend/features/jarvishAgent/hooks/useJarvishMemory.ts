import { useState, useCallback, useEffect } from 'react';
import { StructuredFact } from '@/frontend/features/jarvishAgent/types';
import { GQL_QUERIES, GQL_MUTATIONS } from '@/frontend/features/jarvishAgent/constants';
import {API_ENDPOINTS} from '@/shared/jarvish.constants';
import {
  DeleteStructuredFactMutationVariables,
  GetStructuredFactsQuery,
} from '@/frontend/features/jarvishAgent/graphql/__generated__/graphql';

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
      if (!res.ok) {
        throw new Error(`Structured facts request failed with status ${res.status}`);
      }

      const result: { data?: GetStructuredFactsQuery; errors?: Array<{ message?: string }> } = await res.json();
      
      if (result.errors?.length) {
        throw new Error(result.errors.map(error => error.message || 'GraphQL facts error').join('; '));
      }

      if (result.data?.getStructuredFacts) {
        setFacts(result.data.getStructuredFacts as StructuredFact[]);
      } else {
        setFacts([]);
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
          variables: { id } as DeleteStructuredFactMutationVariables
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
