import { useState, useCallback, useEffect, useRef } from 'react';
import { StructuredFact } from '@/frontend/features/jarvishAgent/types';
import { GQL_QUERIES, GQL_MUTATIONS } from '@/frontend/features/jarvishAgent/constants';
import {API_ENDPOINTS} from '@/shared/jarvish.constants';
import {
  DeleteStructuredFactMutationVariables,
  GetStructuredFactsQuery,
} from '@/frontend/features/jarvishAgent/graphql/__generated__/graphql';
import { getGraphQLHeaders } from '@/frontend/features/jarvishAgent/utils/authHeaders';
import { clientLogger } from '@/frontend/utils/clientLogger';

export const useJarvishMemory = (
  idToken: string | null,
  checkAndRefreshIdToken?: () => Promise<string | null>,
) => {
  const [facts, setFacts] = useState<StructuredFact[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchFacts = useCallback(async () => {
    const activeIdToken = await getActiveIdToken(idToken, checkAndRefreshIdToken);
    if (!activeIdToken) {
      setFacts([]);
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetching(true);
    try {
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: getGraphQLHeaders(activeIdToken),
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
      clientLogger.error('Failed to fetch structured facts:', e);
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
    }
  }, [checkAndRefreshIdToken, idToken]);

  const deleteFact = useCallback(async (id: string) => {
    const activeIdToken = await getActiveIdToken(idToken, checkAndRefreshIdToken);
    if (!activeIdToken) return;

    try {
      await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: getGraphQLHeaders(activeIdToken),
        body: JSON.stringify({
          query: GQL_MUTATIONS.DELETE_STRUCTURED_FACT,
          variables: { id } as DeleteStructuredFactMutationVariables
        })
      });
      setFacts(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      clientLogger.error('Failed to delete structured fact:', e);
    }
  }, [checkAndRefreshIdToken, idToken]);

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

async function getActiveIdToken(
  idToken: string | null,
  checkAndRefreshIdToken?: () => Promise<string | null>,
): Promise<string | null> {
  if (checkAndRefreshIdToken) {
    return checkAndRefreshIdToken();
  }

  return idToken;
}
