import { db } from "@/backend/db/index";
import { structuredFacts } from "@/backend/db/schema";
import {
  MutationDeleteStructuredFactArgs,
  StructuredFact,
} from "@/backend/graphql/__generated__/resolvers-types";
import { mapStructuredFactRow } from "@/backend/graphql/mappers/session.mapper";
import { DeleteByIdArgsSchema } from "@/backend/graphql/schemas/resolver.schema";
import { forgetMemory } from "@/backend/services/memory/memory.service";
import { logger } from "@/backend/utils/logger";
import { and, desc, eq } from "drizzle-orm";

export async function getStructuredFacts(userId: string): Promise<StructuredFact[]> {
  const results = await db
    .select()
    .from(structuredFacts)
    .where(eq(structuredFacts.userId, userId))
    .orderBy(desc(structuredFacts.createdAt));
  return results.map(mapStructuredFactRow);
}

export async function deleteStructuredFact({ id }: MutationDeleteStructuredFactArgs, userId: string): Promise<boolean> {
  const parsed = DeleteByIdArgsSchema.parse({ id });
  const [fact] = await db
    .select()
    .from(structuredFacts)
    .where(and(eq(structuredFacts.id, parsed.id), eq(structuredFacts.userId, userId)));

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
