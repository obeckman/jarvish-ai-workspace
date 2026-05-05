/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n    query GetSessions($limit: Int, $offset: Int, $search: String) { \n      getSessions(limit: $limit, offset: $offset, search: $search) { \n        id title createdAt updatedAt summary { summaryTitle userMessage aiAnswer } \n      } \n    }\n  ": typeof types.GetSessionsDocument,
    "\n    query GetSessionHistory($sessionId: String!) { \n      getSessionHistory(sessionId: $sessionId) { role content } \n    }\n  ": typeof types.GetSessionHistoryDocument,
    "\n    query GetSessionSummary($sessionId: String!) { \n      getSessionSummary(sessionId: $sessionId) { summaryTitle userMessage aiAnswer } \n    }\n  ": typeof types.GetSessionSummaryDocument,
    "\n    query GetStructuredFacts {\n      getStructuredFacts { id fact category confidence createdAt }\n    }\n  ": typeof types.GetStructuredFactsDocument,
    "\n    mutation CreateSession($id: String!, $title: String!, $initialQuery: String) { \n      createSession(id: $id, title: $title, initialQuery: $initialQuery) { id title } \n    }\n  ": typeof types.CreateSessionDocument,
    "\n    mutation DeleteSession($id: String!) { \n      deleteSession(id: $id) \n    }\n  ": typeof types.DeleteSessionDocument,
    "\n    mutation DeleteStructuredFact($id: String!) {\n      deleteStructuredFact(id: $id)\n    }\n  ": typeof types.DeleteStructuredFactDocument,
    "\n    subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {\n      agentEvents(query: $query, history: $history, attachments: $attachments, sessionId: $sessionId) {\n        type\n        content\n        stage\n      }\n    }\n  ": typeof types.AgentChatDocument,
};
const documents: Documents = {
    "\n    query GetSessions($limit: Int, $offset: Int, $search: String) { \n      getSessions(limit: $limit, offset: $offset, search: $search) { \n        id title createdAt updatedAt summary { summaryTitle userMessage aiAnswer } \n      } \n    }\n  ": types.GetSessionsDocument,
    "\n    query GetSessionHistory($sessionId: String!) { \n      getSessionHistory(sessionId: $sessionId) { role content } \n    }\n  ": types.GetSessionHistoryDocument,
    "\n    query GetSessionSummary($sessionId: String!) { \n      getSessionSummary(sessionId: $sessionId) { summaryTitle userMessage aiAnswer } \n    }\n  ": types.GetSessionSummaryDocument,
    "\n    query GetStructuredFacts {\n      getStructuredFacts { id fact category confidence createdAt }\n    }\n  ": types.GetStructuredFactsDocument,
    "\n    mutation CreateSession($id: String!, $title: String!, $initialQuery: String) { \n      createSession(id: $id, title: $title, initialQuery: $initialQuery) { id title } \n    }\n  ": types.CreateSessionDocument,
    "\n    mutation DeleteSession($id: String!) { \n      deleteSession(id: $id) \n    }\n  ": types.DeleteSessionDocument,
    "\n    mutation DeleteStructuredFact($id: String!) {\n      deleteStructuredFact(id: $id)\n    }\n  ": types.DeleteStructuredFactDocument,
    "\n    subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {\n      agentEvents(query: $query, history: $history, attachments: $attachments, sessionId: $sessionId) {\n        type\n        content\n        stage\n      }\n    }\n  ": types.AgentChatDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query GetSessions($limit: Int, $offset: Int, $search: String) { \n      getSessions(limit: $limit, offset: $offset, search: $search) { \n        id title createdAt updatedAt summary { summaryTitle userMessage aiAnswer } \n      } \n    }\n  "): (typeof documents)["\n    query GetSessions($limit: Int, $offset: Int, $search: String) { \n      getSessions(limit: $limit, offset: $offset, search: $search) { \n        id title createdAt updatedAt summary { summaryTitle userMessage aiAnswer } \n      } \n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query GetSessionHistory($sessionId: String!) { \n      getSessionHistory(sessionId: $sessionId) { role content } \n    }\n  "): (typeof documents)["\n    query GetSessionHistory($sessionId: String!) { \n      getSessionHistory(sessionId: $sessionId) { role content } \n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query GetSessionSummary($sessionId: String!) { \n      getSessionSummary(sessionId: $sessionId) { summaryTitle userMessage aiAnswer } \n    }\n  "): (typeof documents)["\n    query GetSessionSummary($sessionId: String!) { \n      getSessionSummary(sessionId: $sessionId) { summaryTitle userMessage aiAnswer } \n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    query GetStructuredFacts {\n      getStructuredFacts { id fact category confidence createdAt }\n    }\n  "): (typeof documents)["\n    query GetStructuredFacts {\n      getStructuredFacts { id fact category confidence createdAt }\n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateSession($id: String!, $title: String!, $initialQuery: String) { \n      createSession(id: $id, title: $title, initialQuery: $initialQuery) { id title } \n    }\n  "): (typeof documents)["\n    mutation CreateSession($id: String!, $title: String!, $initialQuery: String) { \n      createSession(id: $id, title: $title, initialQuery: $initialQuery) { id title } \n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteSession($id: String!) { \n      deleteSession(id: $id) \n    }\n  "): (typeof documents)["\n    mutation DeleteSession($id: String!) { \n      deleteSession(id: $id) \n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteStructuredFact($id: String!) {\n      deleteStructuredFact(id: $id)\n    }\n  "): (typeof documents)["\n    mutation DeleteStructuredFact($id: String!) {\n      deleteStructuredFact(id: $id)\n    }\n  "];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {\n      agentEvents(query: $query, history: $history, attachments: $attachments, sessionId: $sessionId) {\n        type\n        content\n        stage\n      }\n    }\n  "): (typeof documents)["\n    subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {\n      agentEvents(query: $query, history: $history, attachments: $attachments, sessionId: $sessionId) {\n        type\n        content\n        stage\n      }\n    }\n  "];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;