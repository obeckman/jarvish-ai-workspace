import type { Session } from "@/frontend/features/jarvishAgent/types";
import { messageContentToPlainText } from "@/shared/messageContent";

const GENERIC_SUMMARY_TITLE = "Conversation Summary";
const MISSING_SUMMARY_TEXT = "N/A";
export const EMPTY_SUMMARY_ANSWER = "No answer captured.";

export function getSessionSummaryDisplay(session: Session) {
  const summaryTitle = messageContentToPlainText(session.summary?.summaryTitle);
  const userMessage = messageContentToPlainText(session.summary?.userMessage);
  const aiAnswer = messageContentToPlainText(session.summary?.aiAnswer);

  const meaningfulTitle = isMeaningfulText(summaryTitle) && summaryTitle !== GENERIC_SUMMARY_TITLE
    ? summaryTitle
    : "";
  const meaningfulAnswer = isMeaningfulText(aiAnswer) ? aiAnswer : "";

  return {
    title: meaningfulTitle || userMessage || session.title,
    userMessage,
    aiAnswer: meaningfulAnswer || EMPTY_SUMMARY_ANSWER,
    preview: meaningfulAnswer || userMessage || EMPTY_SUMMARY_ANSWER,
  };
}

function isMeaningfulText(value: string): boolean {
  return Boolean(value.trim()) && value.trim() !== MISSING_SUMMARY_TEXT;
}
