import {
  Session,
  SessionSummary,
  StructuredFact,
} from "@/Backend/graphql/__generated__/resolvers-types";
import {
  Session as DbSession,
  SessionSummary as DbSessionSummary,
  StructuredFact as DbStructuredFact,
} from "@/Backend/db/schema";

type DateLike = Date | string | number;

export function mapSessionRow(row: Pick<DbSession, "id" | "title" | "createdAt" | "updatedAt">): Session {
  return {
    id: row.id,
    title: row.title,
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt),
  };
}

export function mapSessionSummaryRow(row: DbSessionSummary): SessionSummary {
  return {
    sessionId: row.sessionId,
    summaryTitle: row.summaryTitle,
    userMessage: row.userMessage,
    aiAnswer: row.aiAnswer,
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
