import { z } from 'zod';
import { 
  ROLES, MessageRole, BlockType, AGENT_STATUS,
  AgentStatus
} from '@/shared/jarvish.constants'
import * as GQL from './graphql/__generated__/graphql';
import {
  AgentMessageBlockSchema,
  type AgentMessageBlock,
} from '@/shared/jarvish.blocks';




// Re-export generated fragment types with null-to-undefined conversion or just as they are
export type Session = GQL.SessionFieldsFragment;
export type StructuredFact = GQL.FactFieldsFragment;
export type SessionSummary = NonNullable<GQL.SessionFieldsFragment['summary']>;

import { AnyBlockComponentProps } from './components/Blocks/blockProps';
import { STATE_ACTIONS, UI_STRINGS } from './constants';

export { AgentMessageBlockSchema };
export type { AgentMessageBlock };

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

export interface ConfidenceSummary {
  latest: number;
  lowest: number;
  reason: string | null;
}

export interface ConfidenceObservation {
  confidence: number;
  reason: string | null;
}

export interface ChatState {
  messages: Message[];
  input: string;
  status: AgentStatus;
  statusMessage: string | null;
  statusLogs: string[];
  confidenceSummary: ConfidenceSummary | null;
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
  | { type: typeof STATE_ACTIONS.SET_CONFIDENCE_SUMMARY; payload: ConfidenceSummary | null }
  | { type: typeof STATE_ACTIONS.RECORD_CONFIDENCE_OBSERVATION; payload: ConfidenceObservation }
  | { type: typeof STATE_ACTIONS.SET_CURRENT_STAGE; payload: number }
  | { type: typeof STATE_ACTIONS.SET_ATTACHMENTS; payload: Attachment[] }
  | { type: typeof STATE_ACTIONS.ADD_ATTACHMENT; payload: Attachment }
  | { type: typeof STATE_ACTIONS.REMOVE_ATTACHMENT; payload: number }
  | { type: typeof STATE_ACTIONS.SET_ERROR_MESSAGE; payload: string | null }
  | { type: typeof STATE_ACTIONS.SET_REASONING_VISIBLE; payload: boolean }
  | { type: typeof STATE_ACTIONS.SET_LAST_SENT_QUERY; payload: string }
  | { type: typeof STATE_ACTIONS.RESET_CHAT };
