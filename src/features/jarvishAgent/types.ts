import { z } from 'zod';
import { AGENT_STATUS, MESSAGE_ROLES, BLOCK_TYPES } from '@/features/jarvishAgent/constants';

export type AgentStatus = typeof AGENT_STATUS[keyof typeof AGENT_STATUS];
export type MessageRole = typeof MESSAGE_ROLES[keyof typeof MESSAGE_ROLES];
export type BlockType = typeof BLOCK_TYPES[keyof typeof BLOCK_TYPES];

// --- Block Schemas ---

export const TextBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.TEXT),
  content: z.string(),
});

export const CodeBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.CODE),
  language: z.string().optional(),
  content: z.string(),
});

export const ReasoningBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.REASONING),
  title: z.string().optional(),
  content: z.string(), // Supports Markdown
});

export const ActionBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.ACTION),
  actionId: z.string(),
  label: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
  disabled: z.boolean().optional(),
  loading: z.boolean().optional(),
});

export const DataBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.DATA),
  displayType: z.enum(['table', 'chart']),
  title: z.string().optional(),
  data: z.unknown().describe('Data for rendering, can be any JSON-serializable structure.'),
});

export const DocumentBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.DOCUMENT),
  title: z.string().optional(),
  content: z.string(), // Live draft content
});

export const AgentMessageBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  CodeBlockSchema,
  ReasoningBlockSchema,
  ActionBlockSchema,
  DataBlockSchema,
  DocumentBlockSchema,
]);

import { AnyBlockComponentProps } from './components/Blocks/blockProps';

export type AgentMessageBlock = z.infer<typeof AgentMessageBlockSchema>;

export { AnyBlockComponentProps };

// --- Message Content Schema ---
export const MessageContentSchema = z.union([z.string(), z.array(AgentMessageBlockSchema)]);
export type MessageContent = z.infer<typeof MessageContentSchema>;

// --- Existing Types ---

export interface Message {
  id: string;
  role: MessageRole;
  content: MessageContent; // This will now potentially be a JSON string of AgentMessageBlock[]
  timestamp: number;
}

export interface StructuredFact {
  id: string;
  fact: string;
  category: string;
  confidence: number;
  createdAt: string;
}

export interface SessionSummary {
  summaryTitle: string;
  userMessage: string;
  aiAnswer: string;
}

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  summary?: SessionSummary;
}

export interface Attachment {
  name: string;
  data: string;
  mimeType: string;
}

// --- GraphQL Response Schemas for useJarvishChat ---

// For GQL_QUERIES.GET_SESSION_HISTORY
export const SessionHistoryItemSchema = z.object({
  role: z.string(),
  content: z.string(), // Backend sends string, will be parsed into MessageContent in frontend
});
export const GetSessionHistoryResponseSchema = z.object({
  getSessionHistory: z.array(SessionHistoryItemSchema),
});

// For GQL_SUBSCRIPTIONS.AGENT_CHAT (agentEvents field)
export const AgentEventDataSchema = z.object({
  type: z.string(), // Corresponds to EVENT_TYPES
  content: z.string(), // Raw content from SSE, might be JSON string
  stage: z.number().optional(),
});
export const AgentEventsSubscriptionResponseSchema = z.object({
  agentEvents: AgentEventDataSchema,
});

// For GQL_QUERIES.GET_SESSION_SUMMARY
export const GetSessionSummaryResponseSchema = z.object({
  getSessionSummary: z.object({
    summaryTitle: z.string(),
    userMessage: z.string(),
    aiAnswer: z.string(),
  }).nullable(), // It can return null if not yet generated
});
