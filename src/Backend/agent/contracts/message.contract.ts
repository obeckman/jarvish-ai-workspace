import { AgentToolCall } from "@/Backend/agent/contracts/state.contract";

export type AgentMessageLike = {
  content?: unknown;
  lc_kwargs?: {
    role?: string;
  };
  name?: string;
  role?: string;
  tool_calls?: AgentToolCall[];
  type?: string;
  _getType?: () => string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function asAgentMessageLike(message: unknown): AgentMessageLike {
  return isRecord(message) ? (message as AgentMessageLike) : {};
}

export function getAgentMessageName(message: unknown): string | undefined {
  const value = asAgentMessageLike(message).name;
  return typeof value === "string" ? value : undefined;
}

export function getAgentMessageRole(message: unknown): string {
  const msg = asAgentMessageLike(message);
  return msg.role || msg.lc_kwargs?.role || (typeof msg._getType === "function" ? msg._getType() : msg.type) || "";
}

export function getAgentMessageType(message: unknown): string {
  const msg = asAgentMessageLike(message);
  return typeof msg._getType === "function" ? msg._getType() : msg.type || "";
}

export function getAgentToolCalls(message: unknown): AgentToolCall[] {
  const calls = asAgentMessageLike(message).tool_calls;
  return Array.isArray(calls) ? calls : [];
}
