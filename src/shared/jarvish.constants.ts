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
  REASONING: 'reasoning',
  TOOLS: 'tools',
  PROCESSING: 'processing',
  ARCHIVE: 'archive',
} as const;

export const TOOL_NAMES = {
  WEB_SEARCH: 'web_search',
  FETCH_WEB_PAGE: 'fetch_web_page',
  READ_PDF: 'read_pdf',
  READ_FILE: 'read_file',
  ADD_MEMORY: 'add_to_memory',
  QUERY_ATTACHMENTS: 'query_attachments',
  LIST_CALENDAR: 'list_calendar_events',
  SEARCH_GMAIL: 'search_gmail_messages',
  GET_GOOGLE_DOC: 'get_google_doc_content',
  CHECK_INVENTORY: 'check_inventory',
} as const;
