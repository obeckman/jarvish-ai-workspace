import { useState, useCallback, useEffect } from 'react';
import { StructuredFact, GetStructuredFactsResponseSchema } from '@/features/jarvishAgent/types';
import { GQL_QUERIES, GQL_MUTATIONS } from '@/features/jarvishAgent/constants';
import {API_ENDPOINTS} from '@/shared/jarvish.constants';
import { DeleteStructuredFactMutationVariables } from '../gql/graphql';

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
      
      const validatedResponse = GetStructuredFactsResponseSchema.parse(result.data);
      if (validatedResponse.getStructuredFacts) {
        setFacts(validatedResponse.getStructuredFacts as StructuredFact[]);
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
