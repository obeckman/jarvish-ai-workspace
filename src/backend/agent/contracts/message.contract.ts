import type { MessageContent } from "@langchain/core/messages";
import { AgentToolCall } from "@/Backend/agent/contracts/state.contract";

export type AgentMessageLike = {
  content?: MessageContent;
  lc_kwargs?: {
    role?: string;
  };
  name?: string;
  role?: string;
  tool_calls?: AgentToolCall[];
  type?: string;
  _getType?: () => string;
};

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function asAgentMessageLike(message: unknown): AgentMessageLike {
  return isObject(message) ? (message as AgentMessageLike) : {};
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
