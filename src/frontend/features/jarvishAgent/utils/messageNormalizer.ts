import { Message } from "@/frontend/features/jarvishAgent/types";
import { GetSessionHistoryQuery } from "@/frontend/features/jarvishAgent/graphql/__generated__/graphql";
import { createHistoryMessageId } from "@/frontend/features/jarvishAgent/utils/messageIds";
import { parseAgentMessageContent } from "@/frontend/features/jarvishAgent/utils/parser";
import { clientLogger } from "@/frontend/utils/clientLogger";
import { BLOCK_TYPES, ROLES, type MessageRole } from "@/shared/jarvish.constants";

type HistoryMessageInput = GetSessionHistoryQuery["getSessionHistory"][number];

export function normalizeHistoryMessages(historyMessages: HistoryMessageInput[]): Message[] {
  return historyMessages.map((historyMessage, messageIndex) => {
    const blocks = parseAgentMessageContent(String(historyMessage.content));
    const role = normalizeHistoryRole(historyMessage.role);
    const firstBlock = blocks[0];

    if (role === ROLES.USER && firstBlock?.type === BLOCK_TYPES.TEXT) {
      return {
        id: createHistoryMessageId(messageIndex, 0),
        type: BLOCK_TYPES.TEXT,
        content: firstBlock.content,
        timestamp: messageIndex,
        role,
      };
    }

    if (role === ROLES.REASONING && firstBlock?.type === BLOCK_TYPES.TEXT) {
      return {
        id: createHistoryMessageId(messageIndex, 0),
        type: BLOCK_TYPES.REASONING,
        content: firstBlock.content,
        timestamp: messageIndex,
        role,
      };
    }

    return {
      id: createHistoryMessageId(messageIndex, 0),
      type: BLOCK_TYPES.TEXT,
      content: blocks,
      timestamp: messageIndex,
      role,
    };
  });
}

function normalizeHistoryRole(role: string): MessageRole {
  if (role === ROLES.USER) {
    return ROLES.USER;
  }

  if (role === ROLES.REASONING) {
    return ROLES.REASONING;
  }

  if (role === ROLES.AGENT || role === ROLES.ASSISTANT || role === ROLES.MODEL) {
    return ROLES.AGENT;
  }

  clientLogger.warn(`Unknown history role "${role}", defaulting to agent.`);
  return ROLES.AGENT;
}
