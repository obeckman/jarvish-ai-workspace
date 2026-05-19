import { db } from "@/Backend/db/index";
import { structuredFacts } from "@/Backend/db/schema";
import {
  MutationDeleteStructuredFactArgs,
  StructuredFact,
} from "@/Backend/graphql/__generated__/resolvers-types";
import { mapStructuredFactRow } from "@/Backend/graphql/mappers/session.mapper";
import { DeleteByIdArgsSchema } from "@/Backend/graphql/schemas/resolver.schema";
import { desc, eq } from "drizzle-orm";

export async function getStructuredFacts(): Promise<StructuredFact[]> {
  const results = await db.select().from(structuredFacts).orderBy(desc(structuredFacts.createdAt));
  return results.map(mapStructuredFactRow);
}

export async function deleteStructuredFact({ id }: MutationDeleteStructuredFactArgs): Promise<boolean> {
  const parsed = DeleteByIdArgsSchema.parse({ id });
  await db.delete(structuredFacts).where(eq(structuredFacts.id, parsed.id));
  return true;
}
