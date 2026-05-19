import { db } from "@/Backend/db/index";
import { sessionSummaries } from "@/Backend/db/schema";
import {
  QueryGetSessionSummaryArgs,
  SessionSummary,
} from "@/Backend/graphql/__generated__/resolvers-types";
import { mapSessionSummaryRow } from "@/Backend/graphql/mappers/session.mapper";
import { SessionIdArgsSchema } from "@/Backend/graphql/schemas/resolver.schema";
import { getSessionHistory } from "@/Backend/graphql/services/session.resolver.service";
import { summarizeSession } from "@/Backend/services/summarization.service";
import { logger } from "@/Backend/utils/logger";
import { eq } from "drizzle-orm";

export async function getSessionSummary(
  { sessionId }: QueryGetSessionSummaryArgs,
): Promise<SessionSummary | null> {
  const parsed = SessionIdArgsSchema.parse({ sessionId });
  const [existing] = await db.select().from(sessionSummaries).where(eq(sessionSummaries.sessionId, parsed.sessionId));

  if (existing) {
    return mapSessionSummaryRow(existing);
  }

  void generateSessionSummaryInBackground(parsed.sessionId);

  return null;
}

export async function getSessionSummaryBySessionId(sessionId: string): Promise<SessionSummary | null> {
  const parsed = SessionIdArgsSchema.parse({ sessionId });
  const [summary] = await db.select().from(sessionSummaries).where(eq(sessionSummaries.sessionId, parsed.sessionId));
  return summary ? mapSessionSummaryRow(summary) : null;
}

async function generateSessionSummaryInBackground(sessionId: string): Promise<void> {
  try {
    const history = await getSessionHistory({ sessionId });

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
