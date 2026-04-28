/**
 * Shared constants for the Agent Backend.
 * Helps avoid magic strings and maintain consistency with the frontend.
 */

export const NODE_NAMES = {
  CONTEXT: 'context',
  REASONING: 'reasoning',
  TOOLS: 'tools',
  PROCESSING: 'processing',
  ARCHIVE: 'archive',
} as const;

export const ROLES = {
  USER: 'user',
  HUMAN: 'human',
  MODEL: 'model',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
  SYSTEM: 'system',
  FUNCTION: 'function',
  REASONING: 'reasoning',
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
