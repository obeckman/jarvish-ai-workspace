import { getGraphQLHeaders } from '@/frontend/features/jarvishAgent/utils/authHeaders';
import { API_ENDPOINTS } from '@/shared/jarvish.constants';

type GraphQLResponse<TData> = {
  data?: TData;
  errors?: Array<{ message?: string }>;
};

export type GraphQLRequestOptions<TVariables> = {
  query: string;
  variables?: TVariables;
  idToken: string | null;
  signal?: AbortSignal;
};

/**
 * Typed GraphQL fetcher for use as a React Query `queryFn` / `mutationFn`.
 * Throws on HTTP errors and GraphQL `errors` so React Query sees them as failures.
 */
export async function graphqlRequest<TData, TVariables = Record<string, unknown>>({
  query,
  variables,
  idToken,
  signal,
}: GraphQLRequestOptions<TVariables>): Promise<TData> {
  const rawFetchResponse = await fetch(API_ENDPOINTS.GRAPHQL, {
    method: 'POST',
    headers: getGraphQLHeaders(idToken),
    body: JSON.stringify({ query, variables }),
    signal,
  });

  if (!rawFetchResponse.ok) {
    throw new Error(`GraphQL request failed with status ${rawFetchResponse.status}`);
  }

  const parsedGraphQLResponse = (await rawFetchResponse.json()) as GraphQLResponse<TData>;

  if (parsedGraphQLResponse.errors?.length) {
    throw new Error(parsedGraphQLResponse.errors.map(error => error.message || 'GraphQL request failed').join('; '));
  }

  if (!parsedGraphQLResponse.data) {
    throw new Error('GraphQL response contained no data');
  }

  return parsedGraphQLResponse.data;
}
