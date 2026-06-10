import { createAgentGraph } from "@/backend/agent/graph";
import { db, sqlite } from "@/backend/db/index";
import { sessionSummaries, sessions } from "@/backend/db/schema";
import {
  Message,
  QueryGetSessionHistoryArgs,
  QueryGetSessionsArgs,
  Session,
} from "@/backend/graphql/__generated__/resolvers-types";
import {
  mapGraphMessageToGraphQLMessage,
  RawGraphMessage,
} from "@/backend/graphql/mappers/message.mapper";
import { mapSessionRow } from "@/backend/graphql/mappers/session.mapper";
import {
  GetSessionsArgsSchema,
  SessionIdArgsSchema,
} from "@/backend/graphql/schemas/resolver.schema";
import { logger } from "@/backend/utils/logger";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { desc, eq, like, or } from "drizzle-orm";

const checkpointer = new SqliteSaver(sqlite);
const MAX_HISTORY_LOG_MESSAGES = 20;

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

  const messageSummaries = values.messages
    .slice(0, MAX_HISTORY_LOG_MESSAGES)
    .map((message, index) => summarizeHistoryMessage(message as RawGraphMessage, index));

  logger.debug({
    sessionId: parsed.sessionId,
    messagesCount: values.messages.length,
    messages: messageSummaries,
    truncatedMessages: Math.max(values.messages.length - MAX_HISTORY_LOG_MESSAGES, 0),
  }, "Mapping session history messages");

  return values.messages.map((message) => {
    const graphMessage = message as RawGraphMessage;
    return mapGraphMessageToGraphQLMessage(graphMessage);
  });
}

export async function touchSession(sessionId: string): Promise<void> {
  const parsed = SessionIdArgsSchema.parse({ sessionId });
  await db.update(sessions)
    .set({ updatedAt: new Date() })
    .where(eq(sessions.id, parsed.sessionId));
}

function summarizeHistoryMessage(message: RawGraphMessage, index: number) {
  return {
    index,
    type: message.type,
    role: message.role || message.lc_kwargs?.role,
    name: message.name || message.lc_kwargs?.name,
    content: summarizeContentShape(message.content),
    toolCallsCount: message.tool_calls?.length ?? 0,
  };
}

function summarizeContentShape(content: RawGraphMessage["content"]) {
  if (typeof content === "string") {
    return {
      kind: "string",
      length: content.length,
    };
  }

  if (Array.isArray(content)) {
    return {
      kind: "array",
      parts: content.length,
    };
  }

  return {
    kind: content === undefined || content === null ? "empty" : typeof content,
  };
}
