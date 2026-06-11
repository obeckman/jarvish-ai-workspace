import { db } from "@/backend/db/index";
import { sessionSummaries, sessions } from "@/backend/db/schema";
import {
  QueryGetSessionSummaryArgs,
  SessionSummary,
} from "@/backend/graphql/__generated__/resolvers-types";
import { mapSessionSummaryRow } from "@/backend/graphql/mappers/session.mapper";
import { SessionIdArgsSchema } from "@/backend/graphql/schemas/resolver.schema";
import { getSessionHistory } from "@/backend/graphql/services/session.resolver.service";
import { summarizeSession } from "@/backend/services/summarization.service";
import { logger } from "@/backend/utils/logger";
import { and, eq } from "drizzle-orm";

export async function getSessionSummary(
  { sessionId }: QueryGetSessionSummaryArgs,
  userId: string,
): Promise<SessionSummary | null> {
  const parsed = SessionIdArgsSchema.parse({ sessionId });
  const [existing] = await db
    .select({
      sessionId: sessionSummaries.sessionId,
      summaryTitle: sessionSummaries.summaryTitle,
      userMessage: sessionSummaries.userMessage,
      aiAnswer: sessionSummaries.aiAnswer,
      createdAt: sessionSummaries.createdAt,
    })
    .from(sessionSummaries)
    .innerJoin(sessions, eq(sessionSummaries.sessionId, sessions.id))
    .where(and(eq(sessionSummaries.sessionId, parsed.sessionId), eq(sessions.userId, userId)));

  if (existing) {
    return mapSessionSummaryRow(existing);
  }

  const [ownedSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, parsed.sessionId), eq(sessions.userId, userId)))
    .limit(1);

  if (!ownedSession) {
    return null;
  }

  void generateSessionSummaryInBackground(parsed.sessionId, userId);

  return null;
}

export async function getSessionSummaryBySessionId(sessionId: string, userId: string): Promise<SessionSummary | null> {
  const parsed = SessionIdArgsSchema.parse({ sessionId });
  const [summary] = await db
    .select({
      sessionId: sessionSummaries.sessionId,
      summaryTitle: sessionSummaries.summaryTitle,
      userMessage: sessionSummaries.userMessage,
      aiAnswer: sessionSummaries.aiAnswer,
      createdAt: sessionSummaries.createdAt,
    })
    .from(sessionSummaries)
    .innerJoin(sessions, eq(sessionSummaries.sessionId, sessions.id))
    .where(and(eq(sessionSummaries.sessionId, parsed.sessionId), eq(sessions.userId, userId)));
  return summary ? mapSessionSummaryRow(summary) : null;
}

async function generateSessionSummaryInBackground(sessionId: string, userId: string): Promise<void> {
  try {
    const history = await getSessionHistory({ sessionId }, userId);

    if (history.length === 0) {
      return;
    }

    const summary = await summarizeSession(history);
    await db.insert(sessionSummaries).values({
      sessionId,
      summaryTitle: summary.summaryTitle,
      userMessage: summary.userMessage,
      aiAnswer: summary.aiAnswer,
    }).onConflictDoUpdate({
      target: sessionSummaries.sessionId,
      set: {
        summaryTitle: summary.summaryTitle,
        userMessage: summary.userMessage,
        aiAnswer: summary.aiAnswer,
      },
    });
  } catch (error) {
    logger.error({ sessionId, error }, "Async summary generation failed");
  }
}
