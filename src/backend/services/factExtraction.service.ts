import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { REASONING_MODEL } from "@/backend/agent/models";
import parse from "partial-json-parser";
import { addMemory, MEMORY_TYPES } from "@/backend/services/memory/memory.service"; // Import addMemory
import { db } from "@/backend/db";
import { structuredFacts } from "@/backend/db/schema";
import { logger } from "@/backend/utils/logger";
import { and, eq, isNull, or } from "drizzle-orm";
import { getGeminiErrorDetails } from "@/backend/services/gemini-error";

export type ExtractedFact = {
  fact: string;
  category: string;
  status: "stored" | "duplicate" | "conflict";
  conflictWith?: string;
};

const ExtractedFactSchema = z.object({
  fact: z.string().trim().min(1),
  category: z.string().trim().min(1).default("general"),
});

const ExtractedFactsSchema = z.array(ExtractedFactSchema);

type FactExtractionHistoryMessage = {
  role: string;
  content: string;
};

/**
 * Extracts static facts about the user from a session history.
 */
export async function extractAndStoreFacts(
  sessionId: string,
  userId: string,
  history: FactExtractionHistoryMessage[],
): Promise<ExtractedFact[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ 
    model: REASONING_MODEL,
    systemInstruction: `You are a Fact Extraction Agent. Your job is to analyze conversation history and extract key, long-term facts about the user and entities they mention. When a user provides documents or specific information, extract key facts *from the content*, not just meta-facts about the user providing them.

    **CRITICAL: Pay close attention to ALL personal details, preferences, and relationships the user explicitly states, including location, name, and other biographical information.**

    Examples of facts to extract:
    - "User's friend's name is Bobi." (Category: relationships)
    - "User lives in בית לחם הגלילית." (Category: personal_info)
    - "User prefers 180°C for pizza." (Category: preferences)
    - "User has 26 villages in Tribal Wars." (Category: gaming)
    - "User uses React and TypeScript for frontend." (Category: professional_info)
    - "Oren Beckman's resume lists 10 years of experience in software development." (Category: professional_info)
    - "The provided CV highlights expertise in AI and machine learning." (Category: resume_summary)

    Ignore transient information (like asking for the time) unless it reveals a preference (e.g., "I always check the time at 5 PM").

    Output ONLY a JSON array of objects:
    [
      { "fact": "User's friend is named Bobi.", "category": "relationships" },
      { "fact": "User lives in בית לחם הגלילית.", "category": "personal_info" },
      { "fact": "...", "category": "preferences" }
    ]

    If no facts are found, output an empty array [].`  });

  const prompt = `Analyze this conversation history and extract static facts:\n${JSON.stringify(history)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text() || "";
    logger.debug({ text }, "[Fact Extraction] Raw model output");
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedFacts = parse(cleaned);
    logger.debug({ parsedFacts }, "[Fact Extraction] Parsed facts");

    if (Array.isArray(parsedFacts) && parsedFacts.length > 0) {
      const extractedFacts = ExtractedFactsSchema.parse(parsedFacts.map((factData) => ({
        fact: factData?.fact,
        category: factData?.category || "general",
      })));

      const storedFacts: ExtractedFact[] = [];

      for (const factData of extractedFacts) {
        const factText = factData.fact;
        const category = factData.category;

        const existingFacts = await db
          .select()
          .from(structuredFacts)
          .where(and(
            or(eq(structuredFacts.userId, userId), isNull(structuredFacts.userId)),
            eq(structuredFacts.category, category),
          ));

        const duplicateFact = existingFacts.find((existingFact) => normalizeFact(existingFact.fact) === normalizeFact(factText));
        if (duplicateFact) {
          storedFacts.push({
            fact: factText,
            category,
            status: "duplicate",
          });
          logger.info({ sessionId, userId, category, factText }, "[Fact Extraction] Duplicate fact skipped.");
          continue;
        }

        const conflictingFact = findConflictingFact(existingFacts, factText, category);
        if (conflictingFact) {
          storedFacts.push({
            fact: factText,
            category,
            status: "conflict",
            conflictWith: conflictingFact.fact,
          });
          logger.warn({
            sessionId,
            userId,
            category,
            newFact: factText,
            existingFact: conflictingFact.fact,
          }, "[Fact Extraction] Potential fact conflict requires user clarification.");
          continue;
        }

        const [insertedFact] = await db.insert(structuredFacts).values({
          sessionId,
          userId,
          fact: factText,
          category,
        }).returning({ id: structuredFacts.id });

        if (!insertedFact) {
          logger.error({ sessionId, userId, category, factText }, "[Fact Extraction] SQLite insert did not return a fact ID.");
          continue;
        }

        const createdAt = new Date().toISOString();
        const vectorMemoryId = await addMemory(factText, {
          type: MEMORY_TYPES.STRUCTURED_FACT,
          sourceKind: MEMORY_TYPES.STRUCTURED_FACT,
          sourceId: insertedFact.id,
          structuredFactId: insertedFact.id,
          userId,
          sessionId,
          category,
          timestamp: createdAt,
          createdAt,
          isActive: true,
          isLatest: true,
        });

        await db.update(structuredFacts)
          .set({ vectorMemoryId })
          .where(eq(structuredFacts.id, insertedFact.id));

        storedFacts.push({
          fact: factText,
          category,
          status: "stored",
        });
        logger.info(`[Fact Extraction] Stored fact: "${factText}" (Category: ${category}) in VectorDB and database.`);
      }
      logger.info(`[Fact Extraction] Extracted ${extractedFacts.length} facts for session ${sessionId}; stored ${storedFacts.filter(fact => fact.status === "stored").length}.`);
      return storedFacts; // Return the extracted facts on success
    }
    return []; // Return empty array if no facts found
  } catch (error) {
    logger.warn({ error: getGeminiErrorDetails(error) }, "[Fact Extraction Warning] Skipping fact extraction.");
    return []; // Return empty array on error
  }
}

function normalizeFact(fact: string): string {
  return fact.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function findConflictingFact(
  existingFacts: Array<{ fact: string; category: string | null }>,
  newFact: string,
  category: string,
): { fact: string } | undefined {
  if (!isConflictSensitiveCategory(category)) {
    return undefined;
  }

  const newSubject = getFactSubject(newFact);
  if (!newSubject) {
    return undefined;
  }

  return existingFacts.find((existingFact) => {
    const existingSubject = getFactSubject(existingFact.fact);
    if (!existingSubject) {
      return false;
    }

    return existingSubject === newSubject && normalizeFact(existingFact.fact) !== normalizeFact(newFact);
  });
}

function isConflictSensitiveCategory(category: string): boolean {
  return ["personal_info", "preferences", "relationships"].includes(category);
}

function getFactSubject(fact: string): string | undefined {
  const normalized = normalizeFact(fact);
  const match = normalized.match(/^(.*?)(?:\s+is\s+|\s+are\s+|\s+lives\s+in\s+|\s+prefers\s+|\s+has\s+)/);
  if (match?.[1]) {
    return match[1].trim();
  }

  return undefined;
}
