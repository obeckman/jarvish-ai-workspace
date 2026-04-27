export type AgentStatus = 'idle' | 'thinking' | 'responding' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'agent' | 'reasoning';
  content: string;
  timestamp: number;
}

export interface JarvishAgentState {
  messages: Message[];
  status: AgentStatus;
  error?: string;
}
