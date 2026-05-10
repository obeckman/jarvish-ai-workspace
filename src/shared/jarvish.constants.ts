/**
 * Shared constants between Frontend and Backend for the Jarvish Agent.
 * Ensures data consistency across the network boundary.
 */

export const ROLES = {
  USER: 'USER',
  AGENT: 'AGENT',
  REASONING: 'REASONING',
  HUMAN: 'HUMAN',
  MODEL: 'MODEL',
  ASSISTANT: 'ASSISTANT',
  TOOL: 'TOOL',
  SYSTEM: 'SYSTEM',
  FUNCTION: 'FUNCTION',
} as const;

export const EVENT_TYPES = {
  STATUS: 'STATUS',
  MESSAGE: 'MESSAGE',
  REASONING: 'REASONING',
  ERROR: 'ERROR',
} as const;

export const STAGES = {
  PREPARE: 1,
  RESEARCH: 2,
  SYNTHESIZE: 3,
  FINALIZE: 4,
} as const;

export const NODE_NAMES = {
  CONTEXT: 'context',
  REASONING: 'REASONING', // Legacy / Main
  SUPERVISOR: 'supervisor',
  RESEARCH_WORKER: 'research_worker',
  GOOGLE_WORKER: 'google_worker',
  CODER_WORKER: 'coder_worker',
  CLARIFICATION: 'clarification',
  TOOLS: 'tools',
  PROCESSING: 'processing',
  ARCHIVE: 'archive',
} as const;

export const TOOL_CONFIDENCE_THRESHOLD = 70;

export const TOOL_NAMES = {
  WEB_SEARCH: 'web_search',
  FETCH_WEB_PAGE: 'fetch_web_page',
  READ_PDF: 'read_pdf',
  READ_FILE: 'read_file',
  WRITE_FILE: 'write_file',
  ADD_MEMORY: 'add_to_memory',
  FORGET_MEMORY: 'forget_memory',
  QUERY_ATTACHMENTS: 'query_attachments',
  LIST_CALENDAR: 'list_calendar_events',
  SEARCH_GMAIL: 'search_gmail_messages',
  GET_GOOGLE_DOC: 'get_google_doc_content',
  UPDATE_GOOGLE_DOC: 'update_google_doc',
  CHECK_INVENTORY: 'check_inventory',
} as const;

export const BLOCK_TYPES = {
  TEXT: 'TEXT',
  CODE: 'CODE',
  REASONING: 'REASONING',
  ACTION: 'ACTION',
  DATA: 'DATA',
  DOCUMENT: 'DOCUMENT',
  DRAFT: 'DRAFT',
} as const;

// Gemini API specific role strings
export const GEMINI_ROLES = {
  USER: 'USER',
  MODEL: 'MODEL',
  FUNCTION: 'FUNCTION',
} as const;

export const AGENT_STATUS = {
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  RESPONDING: 'RESPONDING',
  ERROR: 'ERROR',
} as const;

export const STORAGE_KEYS = {
  GOOGLE_TOKEN: 'google_access_token',
  SESSION_ID: 'jarvish_session_id',
} as const;

export const API_ENDPOINTS = {
  GRAPHQL: '/graphql',
  CONFIG: '/api/config',
} as const;

export type AgentStatus = typeof AGENT_STATUS[keyof typeof AGENT_STATUS];
export type MessageRole = typeof ROLES[keyof typeof ROLES];
export type BlockType = typeof BLOCK_TYPES[keyof typeof BLOCK_TYPES];
export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];