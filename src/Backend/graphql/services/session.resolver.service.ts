import { createAgentGraph } from "@/Backend/agent/graph";
import { db, sqlite } from "@/Backend/db/index";
import { sessionSummaries, sessions } from "@/Backend/db/schema";
import {
  Message,
  QueryGetSessionHistoryArgs,
  QueryGetSessionsArgs,
  Session,
} from "@/Backend/graphql/__generated__/resolvers-types";
import {
  mapGraphMessageToGraphQLMessage,
  RawGraphMessage,
} from "@/Backend/graphql/mappers/message.mapper";
import { mapSessionRow } from "@/Backend/graphql/mappers/session.mapper";
import {
  GetSessionsArgsSchema,
  SessionIdArgsSchema,
} from "@/Backend/graphql/schemas/resolver.schema";
import { logger } from "@/Backend/utils/logger";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { desc, eq, like, or } from "drizzle-orm";

const checkpointer = new SqliteSaver(sqlite);

export function getCheckpointer() {
  return checkpointer;
}

export async function getSessions(args: Partial<QueryGetSessionsArgs>): Promise<Session[]> {
  const { limit = 10, offset = 0, search } = GetSessionsArgsSchema.parse(args);
  const safeLimit = limit ?? 10;
  const safeOffset = offset ?? 0;

  if (search) {
    const searchTerm = `%${search}%`;
    const results = await db.select({
      id: sessions.id,
      title: sessions.title,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
    })
      .from(sessions)
      .leftJoin(sessionSummaries, eq(sessions.id, sessionSummaries.sessionId))
      .where(
        or(
          like(sessions.title, searchTerm),
          like(sessionSummaries.summaryTitle, searchTerm),
          like(sessionSummaries.userMessage, searchTerm),
          like(sessionSummaries.aiAnswer, searchTerm),
        ),
      )
      .limit(safeLimit)
      .offset(safeOffset)
      .orderBy(desc(sessions.updatedAt));

    return results.map(mapSessionRow);
  }

  const results = await db.select().from(sessions)
    .limit(safeLimit)
    .offset(safeOffset)
    .orderBy(desc(sessions.updatedAt));

  return results.map(mapSessionRow);
}

export async function getSessionHistory({ sessionId }: QueryGetSessionHistoryArgs): Promise<Message[]> {
  const parsed = SessionIdArgsSchema.parse({ sessionId });
  const graph = createAgentGraph(checkpointer);
  const state = await graph.getState({ configurable: { thread_id: parsed.sessionId } });
  const values = state?.values;

  if (!Array.isArray(values?.messages)) {
    logger.debug({ sessionId: parsed.sessionId }, "No message history found for session");
    return [];
  }

  return values.messages.map((message) => {
    const graphMessage = message as RawGraphMessage;
    logger.debug({ message, sessionId: parsed.sessionId }, "Mapping message in getSessionHistory");
    return mapGraphMessageToGraphQLMessage(graphMessage);
  });
}

export async function touchSession(sessionId: string): Promise<void> {
  const parsed = SessionIdArgsSchema.parse({ sessionId });
  await db.update(sessions)
    .set({ updatedAt: new Date() })
    .where(eq(sessions.id, parsed.sessionId));
}
