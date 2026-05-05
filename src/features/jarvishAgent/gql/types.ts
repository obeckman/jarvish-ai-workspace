/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  JSON: { input: unknown; output: unknown; }
};

export type AgentEvent = {
  __typename?: 'AgentEvent';
  content?: Maybe<Scalars['String']['output']>;
  metadata?: Maybe<Scalars['JSON']['output']>;
  stage?: Maybe<Scalars['Int']['output']>;
  type: EventType;
};

export type AttachmentInput = {
  data: Scalars['String']['input'];
  mimeType: Scalars['String']['input'];
  name: Scalars['String']['input'];
};

export enum EventType {
  Error = 'ERROR',
  Message = 'MESSAGE',
  Reasoning = 'REASONING',
  Retry = 'RETRY',
  Status = 'STATUS'
}

export type Message = {
  __typename?: 'Message';
  content: Scalars['String']['output'];
  role: Scalars['String']['output'];
};

export type MessageInput = {
  content: Scalars['String']['input'];
  role: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Creates a new session record. */
  createSession: Session;
  /** Deletes a session and its associated state. */
  deleteSession: Scalars['Boolean']['output'];
  /** Deletes an extracted static fact by ID. */
  deleteStructuredFact: Scalars['Boolean']['output'];
  /** Starts a new research task. */
  startResearch: Scalars['String']['output'];
};


export type MutationCreateSessionArgs = {
  id: Scalars['String']['input'];
  initialQuery?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};


export type MutationDeleteSessionArgs = {
  id: Scalars['String']['input'];
};


export type MutationDeleteStructuredFactArgs = {
  id: Scalars['String']['input'];
};


export type MutationStartResearchArgs = {
  history: Array<MessageInput>;
  query: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  /** Retrieves the message history for a specific session. */
  getSessionHistory: Array<Message>;
  /** Retrieves or generates a summary for a specific session. */
  getSessionSummary?: Maybe<SessionSummary>;
  /** Retrieves all persistent research sessions with pagination and optional search. */
  getSessions: Array<Session>;
  /** Retrieves extracted static facts about the user. */
  getStructuredFacts: Array<StructuredFact>;
  status: Scalars['String']['output'];
};


export type QueryGetSessionHistoryArgs = {
  sessionId: Scalars['String']['input'];
};


export type QueryGetSessionSummaryArgs = {
  sessionId: Scalars['String']['input'];
};


export type QueryGetSessionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type Session = {
  __typename?: 'Session';
  createdAt: Scalars['String']['output'];
  id: Scalars['String']['output'];
  summary?: Maybe<SessionSummary>;
  title: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type SessionSummary = {
  __typename?: 'SessionSummary';
  aiAnswer: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  sessionId: Scalars['String']['output'];
  summaryTitle: Scalars['String']['output'];
  userMessage: Scalars['String']['output'];
};

export type StructuredFact = {
  __typename?: 'StructuredFact';
  category: Scalars['String']['output'];
  confidence: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  fact: Scalars['String']['output'];
  id: Scalars['String']['output'];
  sessionId?: Maybe<Scalars['String']['output']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Streams events from the Jarvish Agent (logs, tokens, stage updates). */
  agentEvents: AgentEvent;
};


export type SubscriptionAgentEventsArgs = {
  attachments?: InputMaybe<Array<AttachmentInput>>;
  history?: InputMaybe<Array<MessageInput>>;
  query: Scalars['String']['input'];
  sessionId?: InputMaybe<Scalars['String']['input']>;
};

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

export type GetSessionsQueryVariables = Exact<{
  limit?: number | null | undefined;
  offset?: number | null | undefined;
  search?: string | null | undefined;
}>;


export type GetSessionsQuery = { getSessions: Array<{ id: string, title: string, createdAt: string, updatedAt: string, summary: { summaryTitle: string, userMessage: string, aiAnswer: string } | null }> };

export type GetSessionHistoryQueryVariables = Exact<{
  sessionId: string;
}>;


export type GetSessionHistoryQuery = { getSessionHistory: Array<{ role: string, content: string }> };

export type GetSessionSummaryQueryVariables = Exact<{
  sessionId: string;
}>;


export type GetSessionSummaryQuery = { getSessionSummary: { summaryTitle: string, userMessage: string, aiAnswer: string } | null };

export type GetStructuredFactsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetStructuredFactsQuery = { getStructuredFacts: Array<{ id: string, fact: string, category: string, confidence: number, createdAt: string }> };

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

export const GetSessionsDocument = new TypedDocumentString(`
    query GetSessions($limit: Int, $offset: Int, $search: String) {
  getSessions(limit: $limit, offset: $offset, search: $search) {
    id
    title
    createdAt
    updatedAt
    summary {
      summaryTitle
      userMessage
      aiAnswer
    }
  }
}
    `) as unknown as TypedDocumentString<GetSessionsQuery, GetSessionsQueryVariables>;
export const GetSessionHistoryDocument = new TypedDocumentString(`
    query GetSessionHistory($sessionId: String!) {
  getSessionHistory(sessionId: $sessionId) {
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
  }
}
    `) as unknown as TypedDocumentString<GetSessionSummaryQuery, GetSessionSummaryQueryVariables>;
export const GetStructuredFactsDocument = new TypedDocumentString(`
    query GetStructuredFacts {
  getStructuredFacts {
    id
    fact
    category
    confidence
    createdAt
  }
}
    `) as unknown as TypedDocumentString<GetStructuredFactsQuery, GetStructuredFactsQueryVariables>;
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