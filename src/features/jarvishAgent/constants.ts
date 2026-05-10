/**
 * Localized constants for the JarvishAgent feature.
 * Following the "Zero Magic Strings" policy.
 */

import { EVENT_TYPES, STAGES } from '@/shared/jarvish.constants';
import { graphql } from './gql';

export { EVENT_TYPES, STAGES };


export const UI_STRINGS = {
  INITIAL_GREETING: 'Hello! I am Jarvish, your personal agent. How can I help you today?',
  DEFAULT_INPUT: 'whats the date',
  NEW_RESEARCH_PREFIX: 'New Research',
  DELETE_CONFIRMATION: 'Are you sure you want to delete this session?',
  FILE_LARGE_ERROR: 'File too large. Max 10MB per file.',
  GOOGLE_CLIENT_ID_ERROR: 'Google Client ID not loaded from server.',
  GOOGLE_SDK_ERROR: 'Google Identity Services SDK not loaded.',
  RECOVERY_NOTE: (stage: number) => `\n\n[RECOVERY: Interrupted at Stage ${stage}. \nProgress made:\n{steps}\n\nPlease resume from the next step.]`,
  CONTEXT_AGENT_PLACEHOLDER: "Ask about inventory (e.g., 'Do we have SHOE-123 in stock?')",
  STATUS_RETRIEVING: 'Retrieving Memories...',
  STATUS_ORCHESTRATING: 'Orchestrating Context...',
  STATUS_EXECUTING: 'Executing Task...',
} as const;

export const GQL_FRAGMENTS = {
  SESSION: graphql(`
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
  `),
  FACT: graphql(`
    fragment FactFields on StructuredFact {
      id
      fact
      category
      confidence
      createdAt
    }
  `),
};

export const GQL_QUERIES = {
  GET_SESSIONS: graphql(`    
    query GetSessions($limit: Int, $offset: Int, $search: String) {       
      getSessions(limit: $limit, offset: $offset, search: $search) {         
        ...SessionFields
      }     
    }  
  `),  
  GET_SESSION_HISTORY: graphql(`    
    query GetSessionHistory($sessionId: String!) {       
      getSessionHistory(sessionId: $sessionId) { 
        type role content 
      }     
    }  
  `),  
  GET_SESSION_SUMMARY: graphql(`    
    query GetSessionSummary($sessionId: String!) {       
      getSessionSummary(sessionId: $sessionId) { 
        summaryTitle userMessage aiAnswer createdAt sessionId 
      }     
    }  
  `),  
  GET_STRUCTURED_FACTS: graphql(`    
    query GetStructuredFacts {      
      getStructuredFacts { 
        ...FactFields
      }     
    }  
  `),
} as const;

export const GQL_MUTATIONS = {
   CREATE_SESSION: graphql(`
    mutation CreateSession($id: String!, $title: String!, $initialQuery: String) { 
      createSession(id: $id, title: $title, initialQuery: $initialQuery) { id title } 
    }
  `),
  DELETE_SESSION: graphql(`
    mutation DeleteSession($id: String!) { 
      deleteSession(id: $id) 
    }
  `),
  DELETE_STRUCTURED_FACT: graphql(`
    mutation DeleteStructuredFact($id: String!) {
      deleteStructuredFact(id: $id)
    }
  `),
} as const;

export const GQL_SUBSCRIPTIONS = {
  AGENT_CHAT: graphql(`
    subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {
      agentEvents(query: $query, history: $history, attachments: $attachments, sessionId: $sessionId) {
        type
        content
        stage
      }
    }
  `),
} as const;
