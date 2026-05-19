import { z } from "zod";
import { Message, SessionHistoryItemSchema } from "@/features/jarvishAgent/types";
import { createHistoryMessageId } from "@/features/jarvishAgent/utils/messageIds";
import { parseAgentMessageContent } from "@/features/jarvishAgent/utils/parser";

type HistoryMessageInput = z.infer<typeof SessionHistoryItemSchema>;

export function normalizeHistoryMessages(historyMessages: HistoryMessageInput[]): Message[] {
  return historyMessages.flatMap((historyMessage, messageIndex) => {
    const blocks = parseAgentMessageContent(String(historyMessage.content));

    return blocks.map((block, blockIndex) => ({
      id: createHistoryMessageId(messageIndex, blockIndex),
      timestamp: messageIndex,
      ...block,
      role: historyMessage.role,
    }));
  });
}
