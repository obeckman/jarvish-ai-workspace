import { AIMessage, BaseMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { getMessageRole, getMessageType } from "@/Backend/agent/nodes/utils";
import { Message } from "@/Backend/graphql/__generated__/resolvers-types";
import { EVENT_TYPES, NODE_NAMES, ROLES } from "@/shared/jarvish.constants.ts";

type InputHistoryMessage = {
  role?: string | null;
  content?: string | null;
};

type RawGraphMessage = {
  content?: unknown;
  name?: string;
  role?: string;
  type?: string;
  tool_calls?: unknown[];
  lc_kwargs?: {
    name?: string;
    role?: string;
  };
};

const HISTORY_USER_FACING_NODE_NAMES = [
  NODE_NAMES.SUPERVISOR,
  NODE_NAMES.CLARIFICATION,
] as string[];

const HISTORY_REASONING_NODE_NAMES = [
  NODE_NAMES.REASONING,
  NODE_NAMES.SUPERVISOR,
  NODE_NAMES.CLARIFICATION,
  NODE_NAMES.CODER_WORKER,
  NODE_NAMES.RESEARCH_WORKER,
  NODE_NAMES.GOOGLE_WORKER,
  "clarification_agent",
] as string[];

const STREAM_USER_FACING_NODE_NAMES = [
  NODE_NAMES.REASONING,
  NODE_NAMES.SUPERVISOR,
  NODE_NAMES.CLARIFICATION,
  NODE_NAMES.RESEARCH_WORKER,
  NODE_NAMES.GOOGLE_WORKER,
  NODE_NAMES.CODER_WORKER,
] as string[];

export function mapInputToLangChainMessages(history: InputHistoryMessage[] = []): BaseMessage[] {
  return history.map((historyMessage) => {
    const role = historyMessage.role || "";
    const content = historyMessage.content || "";

    if (role === ROLES.USER) {
      return new HumanMessage({ content });
    }

    if (role === ROLES.AGENT || role === ROLES.ASSISTANT || role === ROLES.MODEL) {
      return new AIMessage({ content });
    }

    if (role === ROLES.TOOL || role === ROLES.FUNCTION) {
      return new ToolMessage({ content, tool_call_id: "imported" });
    }

    return new HumanMessage({ content });
  });
}

export function mapGraphMessageToGraphQLMessage(message: RawGraphMessage): Message {
  const rawType = getMessageType(message);
  const rawRole = getMessageRole(message);
  const rawName = message.name || message.lc_kwargs?.name || "";

  let role: string = ROLES.AGENT;
  if (rawType === ROLES.HUMAN || rawRole === ROLES.USER) {
    role = ROLES.USER;
  } else if (isReasoningMessage(message, rawType, rawRole, rawName)) {
    role = ROLES.REASONING;
  }

  const content = stringifyMessageContent(message.content);
  const isUserFacingNode = HISTORY_USER_FACING_NODE_NAMES.includes(rawName);

  return {
    type: isUserFacingNode || role === ROLES.USER ? EVENT_TYPES.MESSAGE : EVENT_TYPES.REASONING,
    role,
    content: content || (role === ROLES.REASONING ? "Processing research step..." : ""),
  };
}

export function shouldStreamMessageFromNode(nodeName: string): boolean {
  return STREAM_USER_FACING_NODE_NAMES.includes(nodeName);
}

export function stringifyMessageContent(content: unknown): string {
  if (Array.isArray(content)) {
    return content.map(stringifyMessagePart).join("\n");
  }

  if (typeof content === "string") {
    return content;
  }

  return content ? JSON.stringify(content) : "";
}

function stringifyMessagePart(part: unknown): string {
  if (part && typeof part === "object" && "text" in part) {
    const text = (part as { text?: unknown }).text;
    if (typeof text === "string") {
      return text;
    }
  }

  return JSON.stringify(part);
}

function isReasoningMessage(
  message: RawGraphMessage,
  rawType: string,
  rawRole: string,
  rawName: string,
): boolean {
  return (
    rawType === ROLES.TOOL ||
    rawRole === ROLES.REASONING ||
    rawType === ROLES.FUNCTION ||
    Boolean(message.tool_calls?.length) ||
    Boolean(rawName && !HISTORY_REASONING_NODE_NAMES.includes(rawName))
  );
}
