import { db } from "@/Backend/db/index";
import { structuredFacts } from "@/Backend/db/schema";
import {
  MutationDeleteStructuredFactArgs,
  StructuredFact,
} from "@/Backend/graphql/__generated__/resolvers-types";
import { mapStructuredFactRow } from "@/Backend/graphql/mappers/session.mapper";
import { DeleteByIdArgsSchema } from "@/Backend/graphql/schemas/resolver.schema";
import { forgetMemory } from "@/Backend/services/memory/memory.service";
import { DEFAULT_USER_ID } from "@/shared/jarvish.constants";
import { logger } from "@/Backend/utils/logger";
import { and, desc, eq, isNull, or } from "drizzle-orm";

export async function getStructuredFacts(): Promise<StructuredFact[]> {
  const results = await db
    .select()
    .from(structuredFacts)
    .where(or(eq(structuredFacts.userId, DEFAULT_USER_ID), isNull(structuredFacts.userId)))
    .orderBy(desc(structuredFacts.createdAt));
  return results.map(mapStructuredFactRow);
}

export async function deleteStructuredFact({ id }: MutationDeleteStructuredFactArgs): Promise<boolean> {
  const parsed = DeleteByIdArgsSchema.parse({ id });
  const [fact] = await db
    .select()
    .from(structuredFacts)
    .where(and(
      eq(structuredFacts.id, parsed.id),
      or(eq(structuredFacts.userId, DEFAULT_USER_ID), isNull(structuredFacts.userId)),
    ));

  if (!fact) {
    return false;
  }

  if (fact.vectorMemoryId) {
    try {
      await forgetMemory(fact.vectorMemoryId);
    } catch (error) {
      logger.error({ factId: parsed.id, vectorMemoryId: fact.vectorMemoryId, error }, "Failed to delete structured fact from vector store");
    }
  } else {
    logger.warn({ factId: parsed.id }, "Structured fact has no vectorMemoryId; only SQLite row can be deleted");
  }

  await db.delete(structuredFacts).where(eq(structuredFacts.id, parsed.id));
  return true;
}
