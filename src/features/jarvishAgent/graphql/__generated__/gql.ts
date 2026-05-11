/* eslint-disable */
import * as types from './graphql';



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
    "\n    fragment SessionFields on Session {\n      id\n      title\n      createdAt\n      updatedAt\n      summary {\n        summaryTitle\n        userMessage\n        aiAnswer\n        createdAt\n        sessionId\n      }\n    }\n  ": typeof types.SessionFieldsFragmentDoc,
    "\n    fragment FactFields on StructuredFact {\n      id\n      fact\n      category\n      confidence\n      createdAt\n    }\n  ": typeof types.FactFieldsFragmentDoc,
    "    \n    query GetSessions($limit: Int, $offset: Int, $search: String) {       \n      getSessions(limit: $limit, offset: $offset, search: $search) {         \n        ...SessionFields\n      }     \n    }  \n  ": typeof types.GetSessionsDocument,
    "    \n    query GetSessionHistory($sessionId: String!) {       \n      getSessionHistory(sessionId: $sessionId) { \n        type role content \n      }     \n    }  \n  ": typeof types.GetSessionHistoryDocument,
    "    \n    query GetSessionSummary($sessionId: String!) {       \n      getSessionSummary(sessionId: $sessionId) { \n        summaryTitle userMessage aiAnswer createdAt sessionId \n      }     \n    }  \n  ": typeof types.GetSessionSummaryDocument,
    "    \n    query GetStructuredFacts {      \n      getStructuredFacts { \n        ...FactFields\n      }     \n    }  \n  ": typeof types.GetStructuredFactsDocument,
    "\n    mutation CreateSession($id: String!, $title: String!, $initialQuery: String) { \n      createSession(id: $id, title: $title, initialQuery: $initialQuery) { id title } \n    }\n  ": typeof types.CreateSessionDocument,
    "\n    mutation DeleteSession($id: String!) { \n      deleteSession(id: $id) \n    }\n  ": typeof types.DeleteSessionDocument,
    "\n    mutation DeleteStructuredFact($id: String!) {\n      deleteStructuredFact(id: $id)\n    }\n  ": typeof types.DeleteStructuredFactDocument,
    "\n    subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {\n      agentEvents(query: $query, history: $history, attachments: $attachments, sessionId: $sessionId) {\n        type\n        content\n        stage\n      }\n    }\n  ": typeof types.AgentChatDocument,
};
const documents: Documents = {
    "\n    fragment SessionFields on Session {\n      id\n      title\n      createdAt\n      updatedAt\n      summary {\n        summaryTitle\n        userMessage\n        aiAnswer\n        createdAt\n        sessionId\n      }\n    }\n  ": types.SessionFieldsFragmentDoc,
    "\n    fragment FactFields on StructuredFact {\n      id\n      fact\n      category\n      confidence\n      createdAt\n    }\n  ": types.FactFieldsFragmentDoc,
    "    \n    query GetSessions($limit: Int, $offset: Int, $search: String) {       \n      getSessions(limit: $limit, offset: $offset, search: $search) {         \n        ...SessionFields\n      }     \n    }  \n  ": types.GetSessionsDocument,
    "    \n    query GetSessionHistory($sessionId: String!) {       \n      getSessionHistory(sessionId: $sessionId) { \n        type role content \n      }     \n    }  \n  ": types.GetSessionHistoryDocument,
    "    \n    query GetSessionSummary($sessionId: String!) {       \n      getSessionSummary(sessionId: $sessionId) { \n        summaryTitle userMessage aiAnswer createdAt sessionId \n      }     \n    }  \n  ": types.GetSessionSummaryDocument,
    "    \n    query GetStructuredFacts {      \n      getStructuredFacts { \n        ...FactFields\n      }     \n    }  \n  ": types.GetStructuredFactsDocument,
    "\n    mutation CreateSession($id: String!, $title: String!, $initialQuery: String) { \n      createSession(id: $id, title: $title, initialQuery: $initialQuery) { id title } \n    }\n  ": types.CreateSessionDocument,
    "\n    mutation DeleteSession($id: String!) { \n      deleteSession(id: $id) \n    }\n  ": types.DeleteSessionDocument,
    "\n    mutation DeleteStructuredFact($id: String!) {\n      deleteStructuredFact(id: $id)\n    }\n  ": types.DeleteStructuredFactDocument,
    "\n    subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {\n      agentEvents(query: $query, history: $history, attachments: $attachments, sessionId: $sessionId) {\n        type\n        content\n        stage\n      }\n    }\n  ": types.AgentChatDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    fragment SessionFields on Session {\n      id\n      title\n      createdAt\n      updatedAt\n      summary {\n        summaryTitle\n        userMessage\n        aiAnswer\n        createdAt\n        sessionId\n      }\n    }\n  "): typeof import('./graphql').SessionFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    fragment FactFields on StructuredFact {\n      id\n      fact\n      category\n      confidence\n      createdAt\n    }\n  "): typeof import('./graphql').FactFieldsFragmentDoc;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "    \n    query GetSessions($limit: Int, $offset: Int, $search: String) {       \n      getSessions(limit: $limit, offset: $offset, search: $search) {         \n        ...SessionFields\n      }     \n    }  \n  "): typeof import('./graphql').GetSessionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "    \n    query GetSessionHistory($sessionId: String!) {       \n      getSessionHistory(sessionId: $sessionId) { \n        type role content \n      }     \n    }  \n  "): typeof import('./graphql').GetSessionHistoryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "    \n    query GetSessionSummary($sessionId: String!) {       \n      getSessionSummary(sessionId: $sessionId) { \n        summaryTitle userMessage aiAnswer createdAt sessionId \n      }     \n    }  \n  "): typeof import('./graphql').GetSessionSummaryDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "    \n    query GetStructuredFacts {      \n      getStructuredFacts { \n        ...FactFields\n      }     \n    }  \n  "): typeof import('./graphql').GetStructuredFactsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation CreateSession($id: String!, $title: String!, $initialQuery: String) { \n      createSession(id: $id, title: $title, initialQuery: $initialQuery) { id title } \n    }\n  "): typeof import('./graphql').CreateSessionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteSession($id: String!) { \n      deleteSession(id: $id) \n    }\n  "): typeof import('./graphql').DeleteSessionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    mutation DeleteStructuredFact($id: String!) {\n      deleteStructuredFact(id: $id)\n    }\n  "): typeof import('./graphql').DeleteStructuredFactDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n    subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {\n      agentEvents(query: $query, history: $history, attachments: $attachments, sessionId: $sessionId) {\n        type\n        content\n        stage\n      }\n    }\n  "): typeof import('./graphql').AgentChatDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
