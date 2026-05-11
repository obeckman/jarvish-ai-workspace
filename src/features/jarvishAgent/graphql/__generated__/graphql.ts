/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type AttachmentInput = {
  data: string;
  mimeType: string;
  name: string;
};

export type EventType =
  | 'ERROR'
  | 'MESSAGE'
  | 'REASONING'
  | 'RETRY'
  | 'STATUS';

export type MessageInput = {
  content: string;
  role: string;
};

export type SessionFieldsFragment = { id: string, title: string, createdAt: string, updatedAt: string, summary: { summaryTitle: string, userMessage: string, aiAnswer: string, createdAt: string, sessionId: string } | null } & { ' $fragmentName'?: 'SessionFieldsFragment' };

export type FactFieldsFragment = { id: string, fact: string, category: string, confidence: number, createdAt: string } & { ' $fragmentName'?: 'FactFieldsFragment' };

export type GetSessionsQueryVariables = Exact<{
  limit?: number | null | undefined;
  offset?: number | null | undefined;
  search?: string | null | undefined;
}>;


export type GetSessionsQuery = { getSessions: Array<{ ' $fragmentRefs'?: { 'SessionFieldsFragment': SessionFieldsFragment } }> };

export type GetSessionHistoryQueryVariables = Exact<{
  sessionId: string;
}>;


export type GetSessionHistoryQuery = { getSessionHistory: Array<{ type: string, role: string, content: string }> };

export type GetSessionSummaryQueryVariables = Exact<{
  sessionId: string;
}>;


export type GetSessionSummaryQuery = { getSessionSummary: { summaryTitle: string, userMessage: string, aiAnswer: string, createdAt: string, sessionId: string } | null };

export type GetStructuredFactsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetStructuredFactsQuery = { getStructuredFacts: Array<{ ' $fragmentRefs'?: { 'FactFieldsFragment': FactFieldsFragment } }> };

export type CreateSessionMutationVariables = Exact<{
  id: string;
  title: string;
  initialQuery?: string | null | undefined;
}>;


export type CreateSessionMutation = { createSession: { id: string, title: string } };

export type DeleteSessionMutationVariables = Exact<{
  id: string;
}>;


export type DeleteSessionMutation = { deleteSession: boolean };

export type DeleteStructuredFactMutationVariables = Exact<{
  id: string;
}>;


export type DeleteStructuredFactMutation = { deleteStructuredFact: boolean };

export type AgentChatSubscriptionVariables = Exact<{
  query: string;
  history: Array<MessageInput> | MessageInput;
  attachments?: Array<AttachmentInput> | AttachmentInput | null | undefined;
  sessionId?: string | null | undefined;
}>;


export type AgentChatSubscription = { agentEvents: { type: EventType, content: string | null, stage: number | null } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const SessionFieldsFragmentDoc = new TypedDocumentString(`
    fragment SessionFields on Session {
  id
  title
  createdAt
  updatedAt
  summary {
    summaryTitle
    userMessage
    aiAnswer
    createdAt
    sessionId
  }
}
    `, {"fragmentName":"SessionFields"}) as unknown as TypedDocumentString<SessionFieldsFragment, unknown>;
export const FactFieldsFragmentDoc = new TypedDocumentString(`
    fragment FactFields on StructuredFact {
  id
  fact
  category
  confidence
  createdAt
}
    `, {"fragmentName":"FactFields"}) as unknown as TypedDocumentString<FactFieldsFragment, unknown>;
export const GetSessionsDocument = new TypedDocumentString(`
    query GetSessions($limit: Int, $offset: Int, $search: String) {
  getSessions(limit: $limit, offset: $offset, search: $search) {
    ...SessionFields
  }
}
    fragment SessionFields on Session {
  id
  title
  createdAt
  updatedAt
  summary {
    summaryTitle
    userMessage
    aiAnswer
    createdAt
    sessionId
  }
}`) as unknown as TypedDocumentString<GetSessionsQuery, GetSessionsQueryVariables>;
export const GetSessionHistoryDocument = new TypedDocumentString(`
    query GetSessionHistory($sessionId: String!) {
  getSessionHistory(sessionId: $sessionId) {
    type
    role
    content
  }
}
    `) as unknown as TypedDocumentString<GetSessionHistoryQuery, GetSessionHistoryQueryVariables>;
export const GetSessionSummaryDocument = new TypedDocumentString(`
    query GetSessionSummary($sessionId: String!) {
  getSessionSummary(sessionId: $sessionId) {
    summaryTitle
    userMessage
    aiAnswer
    createdAt
    sessionId
  }
}
    `) as unknown as TypedDocumentString<GetSessionSummaryQuery, GetSessionSummaryQueryVariables>;
export const GetStructuredFactsDocument = new TypedDocumentString(`
    query GetStructuredFacts {
  getStructuredFacts {
    ...FactFields
  }
}
    fragment FactFields on StructuredFact {
  id
  fact
  category
  confidence
  createdAt
}`) as unknown as TypedDocumentString<GetStructuredFactsQuery, GetStructuredFactsQueryVariables>;
export const CreateSessionDocument = new TypedDocumentString(`
    mutation CreateSession($id: String!, $title: String!, $initialQuery: String) {
  createSession(id: $id, title: $title, initialQuery: $initialQuery) {
    id
    title
  }
}
    `) as unknown as TypedDocumentString<CreateSessionMutation, CreateSessionMutationVariables>;
export const DeleteSessionDocument = new TypedDocumentString(`
    mutation DeleteSession($id: String!) {
  deleteSession(id: $id)
}
    `) as unknown as TypedDocumentString<DeleteSessionMutation, DeleteSessionMutationVariables>;
export const DeleteStructuredFactDocument = new TypedDocumentString(`
    mutation DeleteStructuredFact($id: String!) {
  deleteStructuredFact(id: $id)
}
    `) as unknown as TypedDocumentString<DeleteStructuredFactMutation, DeleteStructuredFactMutationVariables>;
export const AgentChatDocument = new TypedDocumentString(`
    subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {
  agentEvents(
    query: $query
    history: $history
    attachments: $attachments
    sessionId: $sessionId
  ) {
    type
    content
    stage
  }
}
    `) as unknown as TypedDocumentString<AgentChatSubscription, AgentChatSubscriptionVariables>;