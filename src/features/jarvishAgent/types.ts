import { z } from 'zod';
import { 
  ROLES, BLOCK_TYPES, EVENT_TYPES, MessageRole, BlockType, DISPLAY_TYPE ,AGENT_STATUS,
  AgentStatus
} from '@/shared/jarvish.constants'
import * as GQL from './graphql/__generated__/graphql';




// Re-export generated fragment types with null-to-undefined conversion or just as they are
export type Session = GQL.SessionFieldsFragment;
export type StructuredFact = GQL.FactFieldsFragment;
export type SessionSummary = NonNullable<GQL.SessionFieldsFragment['summary']>;

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
  displayType: z.enum(Object.values(DISPLAY_TYPE)),
  title: z.string().optional(),
  data: z.unknown().describe('Data for rendering, can be any JSON-serializable structure.'),
});

export const DocumentBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.DOCUMENT),
  title: z.string().optional(),
  content: z.string(), // Live draft content
});

export const DraftBlockSchema = z.object({
  type: z.literal(BLOCK_TYPES.DRAFT),
  title: z.string().optional(),
  content: z.string(),
});

export const AgentMessageBlockSchema = z.discriminatedUnion('type', [
  TextBlockSchema,
  CodeBlockSchema,
  ReasoningBlockSchema,
  ActionBlockSchema,
  DataBlockSchema,
  DocumentBlockSchema,
  DraftBlockSchema,
]);

import { AnyBlockComponentProps } from './components/Blocks/blockProps';
import { STATE_ACTIONS, UI_STRINGS } from './constants';

export type AgentMessageBlock = z.infer<typeof AgentMessageBlockSchema>;

export type { AnyBlockComponentProps };

// --- Message Content Schema ---
export const MessageContentSchema = z.union([z.string(), z.array(AgentMessageBlockSchema)]);
export type MessageContent = z.infer<typeof MessageContentSchema>;

// --- Application Types ---

export interface Message {
  id: string;
  role: MessageRole;
  content?: MessageContent; 
  timestamp: number;
  type: BlockType;
}

export interface Attachment {
  name: string;
  data: string;
  mimeType: string;
}

// --- GraphQL Response Schemas ---

// For GQL_QUERIES.GET_SESSION_HISTORY
export const SessionHistoryItemSchema = z.object({
  type: z.enum(EVENT_TYPES),//EventTypeKeySchema,
  role: z.enum(ROLES),
  content: z.string(), // Backend sends string, will be parsed into MessageContent in frontend
});
export const GetSessionHistoryResponseSchema = z.object({
  getSessionHistory: z.array(SessionHistoryItemSchema),
});

// For GQL_SUBSCRIPTIONS.AGENT_CHAT (agentEvents field)
export const AgentEventDataSchema = z.object({
  type: z.enum(EVENT_TYPES),//EventTypeKeySchema,
  content: z.string(), // Raw content from SSE, might be JSON string
  stage: z.number().nullable(),
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
    createdAt: z.string(),
    sessionId: z.string(),
  }).nullable(), // It can return null if not yet generated
});

// For GQL_QUERIES.GET_STRUCTURED_FACTS
export const GetStructuredFactsResponseSchema = z.object({
  getStructuredFacts: z.array(z.object({
    id: z.string(),
    fact: z.string(),
    category: z.string(),
    confidence: z.number(),
    createdAt: z.string(),
  })),
});

export interface ChatState {
  messages: Message[];
  input: string;
  status: AgentStatus;
  statusMessage: string | null;
  statusLogs: string[];
  currentStage: number;
  attachments: Attachment[];
  errorMessage: string | null;
  isReasoningVisible: boolean;
  lastSentQuery: string;
}

export type ChatAction =
  | { type: typeof STATE_ACTIONS.SET_MESSAGES; payload: Message[] }
  | { type: typeof STATE_ACTIONS.ADD_MESSAGE; payload: Message }
  | { type: typeof STATE_ACTIONS.UPDATE_LAST_MESSAGE; payload: { id: string; content: MessageContent } }
  | { type: typeof STATE_ACTIONS.SET_INPUT; payload: string }
  | { type: typeof STATE_ACTIONS.SET_STATUS; payload: AgentStatus }
  | { type: typeof STATE_ACTIONS.SET_STATUS_MESSAGE; payload: string | null }
  | { type: typeof STATE_ACTIONS.ADD_STATUS_LOG; payload: string }
  | { type: typeof STATE_ACTIONS.SET_STATUS_LOGS; payload: string[] }
  | { type: typeof STATE_ACTIONS.SET_CURRENT_STAGE; payload: number }
  | { type: typeof STATE_ACTIONS.SET_ATTACHMENTS; payload: Attachment[] }
  | { type: typeof STATE_ACTIONS.ADD_ATTACHMENT; payload: Attachment }
  | { type: typeof STATE_ACTIONS.REMOVE_ATTACHMENT; payload: number }
  | { type: typeof STATE_ACTIONS.SET_ERROR_MESSAGE; payload: string | null }
  | { type: typeof STATE_ACTIONS.SET_REASONING_VISIBLE; payload: boolean }
  | { type: typeof STATE_ACTIONS.SET_LAST_SENT_QUERY; payload: string }
  | { type: typeof STATE_ACTIONS.RESET_CHAT };


