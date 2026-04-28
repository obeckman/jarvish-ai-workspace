/**
 * Localized constants for the JarvishAgent feature.
 * Following the "Zero Magic Strings" policy.
 */

import { ROLES, EVENT_TYPES, STAGES } from '@/shared/jarvish.constants';

export { EVENT_TYPES, STAGES };

export const STORAGE_KEYS = {
  GOOGLE_TOKEN: 'google_access_token',
  SESSION_ID: 'jarvish_session_id',
} as const;

export const API_ENDPOINTS = {
  GRAPHQL: '/graphql',
  CONFIG: '/api/config',
} as const;

export const MESSAGE_ROLES = ROLES;

export const AGENT_STATUS = {
  IDLE: 'idle',
  THINKING: 'thinking',
  RESPONDING: 'responding',
  ERROR: 'error',
} as const;

export const UI_STRINGS = {
  INITIAL_GREETING: 'Hello! I am Jarvish, your personal agent. How can I help you today?',
  DEFAULT_INPUT: 'תמשיך את המחקר על זכיות הבניה של המבנים הטמפלרים בנחלה שלי',
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

export const GQL_QUERIES = {
  GET_SESSIONS: `
    query($limit: Int, $offset: Int, $search: String) { 
      getSessions(limit: $limit, offset: $offset, search: $search) { 
        id title createdAt updatedAt summary { summaryTitle userMessage aiAnswer } 
      } 
    }
  `,
  GET_SESSION_HISTORY: `
    query($sessionId: String!) { 
      getSessionHistory(sessionId: $sessionId) { role content } 
    }
  `,
  GET_SESSION_SUMMARY: `
    query($sessionId: String!) { 
      getSessionSummary(sessionId: $sessionId) { summaryTitle userMessage aiAnswer } 
    }
  `,
} as const;

export const GQL_MUTATIONS = {
  CREATE_SESSION: `
    mutation($id: String!, $title: String!) { 
      createSession(id: $id, title: $title) { id title } 
    }
  `,
  DELETE_SESSION: `
    mutation($id: String!) { 
      deleteSession(id: $id) 
    }
  `,
} as const;

export const GQL_SUBSCRIPTIONS = {
  AGENT_CHAT: `
    subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {
      agentEvents(query: $query, history: $history, attachments: $attachments, sessionId: $sessionId) {
        type
        content
        stage
      }
    }
  `,
} as const;
