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
  payload: z.any().optional(),
  disabled: z.boolean().optional(),
  loading: z.boolean().optional(),
});

export const DataBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.DATA),
  displayType: z.enum(['table', 'chart']),
  title: z.string().optional(),
  data: z.any(),
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

export type AgentMessageBlock = z.infer<typeof AgentMessageBlockSchema>;

// --- Existing Types ---

export interface Message {
  id: string;
  role: MessageRole;
  content: string; // This will now potentially be a JSON string of AgentMessageBlock[]
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
