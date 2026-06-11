import {
  GQL_QUERIES,
  GQL_SUBSCRIPTIONS,
} from '@/frontend/features/jarvishAgent/constants';
import type {
  AgentChatSubscriptionVariables,
  GetSessionHistoryQuery,
  GetSessionHistoryQueryVariables,
} from '@/frontend/features/jarvishAgent/graphql/__generated__/graphql';
import { getGraphQLHeaders } from '@/frontend/features/jarvishAgent/utils/authHeaders';
import { API_ENDPOINTS } from '@/shared/jarvish.constants.ts';
import { SseParser } from './sseParser';

export type GraphQLResponse<TData> = {
  data?: TData;
  errors?: Array<{ message?: string }>;
};

export type AgentChatStreamOptions = {
  idToken: string;
  googleToken: string | null;
  variables: AgentChatSubscriptionVariables;
  signal: AbortSignal;
  onReader?: (reader: ReadableStreamDefaultReader<Uint8Array>) => void;
  onMessages: (messages: string[]) => void;
};

export async function fetchSessionHistory(
  sessionId: string,
  idToken: string,
): Promise<GetSessionHistoryQuery['getSessionHistory']> {
  const res = await fetch(API_ENDPOINTS.GRAPHQL, {
    method: 'POST',
    headers: getGraphQLHeaders(idToken),
    body: JSON.stringify({
      query: GQL_QUERIES.GET_SESSION_HISTORY,
      variables: { sessionId } as GetSessionHistoryQueryVariables,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to load session history: ${res.status}`);
  }

  const result = await res.json() as GraphQLResponse<GetSessionHistoryQuery>;
  if (result.errors?.length) {
    throw new Error(getGraphQLErrorMessage(result.errors));
  }

  return result.data?.getSessionHistory ?? [];
}

export async function streamAgentChat(options: AgentChatStreamOptions): Promise<void> {
  const response = await fetch(API_ENDPOINTS.GRAPHQL, {
    method: 'POST',
    headers: getAgentChatHeaders(options.idToken, options.googleToken),
    signal: options.signal,
    body: JSON.stringify({
      query: GQL_SUBSCRIPTIONS.AGENT_CHAT,
      variables: options.variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Server responded with ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body received from server');
  }

  const reader = response.body.getReader();
  options.onReader?.(reader);

  const decoder = new TextDecoder();
  const sseParser = new SseParser();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    options.onMessages(sseParser.push(decoder.decode(value, { stream: true })));
  }

  const finalChunk = decoder.decode();
  options.onMessages(
    finalChunk ? [...sseParser.push(finalChunk), ...sseParser.flush()] : sseParser.flush(),
  );
}

function getAgentChatHeaders(idToken: string, googleToken: string | null): HeadersInit {
  const headers = getGraphQLHeaders(idToken, {
    Accept: 'text/event-stream',
  }) as Record<string, string>;

  if (googleToken) {
    headers['x-google-token'] = googleToken;
  }

  return headers;
}

function getGraphQLErrorMessage(errors: GraphQLResponse<unknown>['errors']): string {
  if (!errors?.length) {
    return 'Unknown GraphQL error';
  }

  return errors.map(error => error.message || 'GraphQL request failed').join('; ');
}
