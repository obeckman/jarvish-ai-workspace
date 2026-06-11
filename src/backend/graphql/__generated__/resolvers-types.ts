import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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
  type: Scalars['String']['output'];
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

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AgentEvent: ResolverTypeWrapper<AgentEvent>;
  AttachmentInput: AttachmentInput;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  EventType: EventType;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Message: ResolverTypeWrapper<Message>;
  MessageInput: MessageInput;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Session: ResolverTypeWrapper<Session>;
  SessionSummary: ResolverTypeWrapper<SessionSummary>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  StructuredFact: ResolverTypeWrapper<StructuredFact>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AgentEvent: AgentEvent;
  AttachmentInput: AttachmentInput;
  Boolean: Scalars['Boolean']['output'];
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  Message: Message;
  MessageInput: MessageInput;
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  Session: Session;
  SessionSummary: SessionSummary;
  String: Scalars['String']['output'];
  StructuredFact: StructuredFact;
  Subscription: Record<PropertyKey, never>;
}>;

export type AgentEventResolvers<ContextType = any, ParentType extends ResolversParentTypes['AgentEvent'] = ResolversParentTypes['AgentEvent']> = ResolversObject<{
  content?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  metadata?: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  stage?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['EventType'], ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MessageResolvers<ContextType = any, ParentType extends ResolversParentTypes['Message'] = ResolversParentTypes['Message']> = ResolversObject<{
  content?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  createSession?: Resolver<ResolversTypes['Session'], ParentType, ContextType, RequireFields<MutationCreateSessionArgs, 'title'>>;
  deleteSession?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteSessionArgs, 'id'>>;
  deleteStructuredFact?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteStructuredFactArgs, 'id'>>;
  startResearch?: Resolver<ResolversTypes['String'], ParentType, ContextType, RequireFields<MutationStartResearchArgs, 'history' | 'query'>>;
}>;

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  getSessionHistory?: Resolver<Array<ResolversTypes['Message']>, ParentType, ContextType, RequireFields<QueryGetSessionHistoryArgs, 'sessionId'>>;
  getSessionSummary?: Resolver<Maybe<ResolversTypes['SessionSummary']>, ParentType, ContextType, RequireFields<QueryGetSessionSummaryArgs, 'sessionId'>>;
  getSessions?: Resolver<Array<ResolversTypes['Session']>, ParentType, ContextType, Partial<QueryGetSessionsArgs>>;
  getStructuredFacts?: Resolver<Array<ResolversTypes['StructuredFact']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type SessionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Session'] = ResolversParentTypes['Session']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  summary?: Resolver<Maybe<ResolversTypes['SessionSummary']>, ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type SessionSummaryResolvers<ContextType = any, ParentType extends ResolversParentTypes['SessionSummary'] = ResolversParentTypes['SessionSummary']> = ResolversObject<{
  aiAnswer?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sessionId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  summaryTitle?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userMessage?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type StructuredFactResolvers<ContextType = any, ParentType extends ResolversParentTypes['StructuredFact'] = ResolversParentTypes['StructuredFact']> = ResolversObject<{
  category?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  confidence?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  fact?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  sessionId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type SubscriptionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  agentEvents?: SubscriptionResolver<ResolversTypes['AgentEvent'], "agentEvents", ParentType, ContextType, RequireFields<SubscriptionAgentEventsArgs, 'query'>>;
}>;

export type Resolvers<ContextType = any> = ResolversObject<{
  AgentEvent?: AgentEventResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Message?: MessageResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Session?: SessionResolvers<ContextType>;
  SessionSummary?: SessionSummaryResolvers<ContextType>;
  StructuredFact?: StructuredFactResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
}>;

