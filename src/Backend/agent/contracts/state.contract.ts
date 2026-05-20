import type { JsonValue } from "@/shared/jarvish.blocks";

export type AgentMetadata = {
  stage?: number;
  status?: string;
  confidence?: number;
  validationReason?: string;
};

export type AgentAttachment = {
  name: string;
  data: string;
  mimeType: string;
};

export type ProcessedAttachment = AgentAttachment & {
  extractedText?: string;
  timestamp?: string;
};

export type AgentToolCall = {
  id: string;
  name: string;
  args: Record<string, JsonValue>;
};
