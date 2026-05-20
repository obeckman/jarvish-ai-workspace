import { Message } from "@/features/jarvishAgent/types";
import { GetSessionHistoryQuery } from "@/features/jarvishAgent/graphql/__generated__/graphql";
import { createHistoryMessageId } from "@/features/jarvishAgent/utils/messageIds";
import { parseAgentMessageContent } from "@/features/jarvishAgent/utils/parser";
import { ROLES, type MessageRole } from "@/shared/jarvish.constants";

type HistoryMessageInput = GetSessionHistoryQuery["getSessionHistory"][number];

export function normalizeHistoryMessages(historyMessages: HistoryMessageInput[]): Message[] {
  return historyMessages.flatMap((historyMessage, messageIndex) => {
    const blocks = parseAgentMessageContent(String(historyMessage.content));
    const role = normalizeHistoryRole(historyMessage.role);

    return blocks.map((block, blockIndex) => ({
      id: createHistoryMessageId(messageIndex, blockIndex),
      timestamp: messageIndex,
      ...block,
      role,
    }));
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

  console.warn(`Unknown history role "${role}", defaulting to agent.`);
  return ROLES.AGENT;
}
