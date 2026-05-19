export type AgentMetadata = {
  stage?: number;
  status?: string;
  [key: string]: unknown;
};

export type AgentAttachment = {
  name: string;
  data: string;
  mimeType: string;
};

export type ProcessedAttachment = AgentAttachment & {
  extractedText?: string;
  [key: string]: unknown;
};

export type AgentToolCall = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};
