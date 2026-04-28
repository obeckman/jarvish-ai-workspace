import { AGENT_STATUS, MESSAGE_ROLES } from '@/features/jarvishAgent/constants';

export type AgentStatus = typeof AGENT_STATUS[keyof typeof AGENT_STATUS];
export type MessageRole = typeof MESSAGE_ROLES[keyof typeof MESSAGE_ROLES];

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
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
