import { db } from "@/backend/db/index";
import { checkpoints, sessions, writes } from "@/backend/db/schema";
import {
  MutationCreateSessionArgs,
  MutationDeleteSessionArgs,
  MutationStartResearchArgs,
  Session,
} from "@/backend/graphql/__generated__/resolvers-types";
import { mapSessionRow } from "@/backend/graphql/mappers/session.mapper";
import {
  CreateSessionArgsSchema,
  DeleteByIdArgsSchema,
  StartResearchArgsSchema,
} from "@/backend/graphql/schemas/resolver.schema";
import { generateTitle } from "@/backend/services/titling.service";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

export async function startResearch(_args: MutationStartResearchArgs): Promise<string> {
  StartResearchArgsSchema.parse(_args);
  return "Research task acknowledged";
}

export async function createSession(args: MutationCreateSessionArgs, userId: string): Promise<Session> {
  const { title, initialQuery } = CreateSessionArgsSchema.parse(args);
  const id = randomUUID();
  const finalTitle = initialQuery ? await generateTitle(initialQuery) : title || "New Research";

  await db.insert(sessions).values({
    id,
    title: finalTitle,
    userId,
  });

  const [newSession] = await db.select().from(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, userId)));
  return mapSessionRow(newSession);
}

export async function deleteSession({ id }: MutationDeleteSessionArgs, userId: string): Promise<boolean> {
  const parsed = DeleteByIdArgsSchema.parse({ id });
  const [ownedSession] = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, parsed.id), eq(sessions.userId, userId)))
    .limit(1);

  if (!ownedSession) {
    return false;
  }

  await db.delete(sessions).where(eq(sessions.id, parsed.id));
  await db.delete(checkpoints).where(eq(checkpoints.threadId, parsed.id));
  await db.delete(writes).where(eq(writes.threadId, parsed.id));
  return true;
}
