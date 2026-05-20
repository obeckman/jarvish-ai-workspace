import { db } from "@/Backend/db/index";
import { sessions } from "@/Backend/db/schema";
import {
  MutationCreateSessionArgs,
  MutationDeleteSessionArgs,
  MutationStartResearchArgs,
  Session,
} from "@/Backend/graphql/__generated__/resolvers-types";
import { mapSessionRow } from "@/Backend/graphql/mappers/session.mapper";
import {
  CreateSessionArgsSchema,
  DeleteByIdArgsSchema,
  StartResearchArgsSchema,
} from "@/Backend/graphql/schemas/resolver.schema";
import { generateTitle } from "@/Backend/services/titling.service";
import { DEFAULT_USER_ID } from "@/shared/jarvish.constants";
import { eq } from "drizzle-orm";

export async function startResearch(_args: MutationStartResearchArgs): Promise<string> {
  StartResearchArgsSchema.parse(_args);
  return "Research task acknowledged";
}

export async function createSession(args: MutationCreateSessionArgs): Promise<Session> {
  const { id, title, initialQuery } = CreateSessionArgsSchema.parse(args);
  const finalTitle = initialQuery ? await generateTitle(initialQuery) : title || "New Research";

  await db.insert(sessions).values({
    id,
    title: finalTitle,
    userId: DEFAULT_USER_ID,
  });

  const [newSession] = await db.select().from(sessions).where(eq(sessions.id, id));
  return mapSessionRow(newSession);
}

export async function deleteSession({ id }: MutationDeleteSessionArgs): Promise<boolean> {
  const parsed = DeleteByIdArgsSchema.parse({ id });
  await db.delete(sessions).where(eq(sessions.id, parsed.id));
  return true;
}
