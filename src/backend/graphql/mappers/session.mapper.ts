import {
  Session,
  SessionSummary,
  StructuredFact,
} from "@/backend/graphql/__generated__/resolvers-types";
import {
  Session as DbSession,
  SessionSummary as DbSessionSummary,
  StructuredFact as DbStructuredFact,
} from "@/backend/db/schema";
import { messageContentToPlainText } from "@/shared/messageContent";

type DateLike = Date | string | number;
const GENERIC_SUMMARY_TITLE = "Conversation Summary";
const MISSING_SUMMARY_TEXT = "N/A";
const EMPTY_SUMMARY_ANSWER = "No answer captured.";

export function mapSessionRow(row: Pick<DbSession, "id" | "title" | "createdAt" | "updatedAt">): Session {
  return {
    id: row.id,
    title: row.title,
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt),
  };
}

export function mapSessionSummaryRow(row: DbSessionSummary): SessionSummary {
  const summaryTitle = messageContentToPlainText(row.summaryTitle);
  const userMessage = messageContentToPlainText(row.userMessage);
  const aiAnswer = messageContentToPlainText(row.aiAnswer);

  return {
    sessionId: row.sessionId,
    summaryTitle: isMeaningfulSummaryText(summaryTitle) && summaryTitle !== GENERIC_SUMMARY_TITLE
      ? summaryTitle
      : userMessage || summaryTitle,
    userMessage,
    aiAnswer: isMeaningfulSummaryText(aiAnswer) ? aiAnswer : EMPTY_SUMMARY_ANSWER,
    createdAt: formatDate(row.createdAt),
  };
}

export function mapStructuredFactRow(row: DbStructuredFact): StructuredFact {
  return {
    id: row.id,
    sessionId: row.sessionId || null,
    fact: row.fact,
    category: row.category || "general",
    confidence: row.confidence ?? 100,
    createdAt: formatDate(row.createdAt),
  };
}

function formatDate(value: DateLike): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function isMeaningfulSummaryText(value: string): boolean {
  return Boolean(value.trim()) && value.trim() !== MISSING_SUMMARY_TEXT;
}
