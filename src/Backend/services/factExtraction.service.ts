import { GoogleGenerativeAI } from "@google/generative-ai";
import { REASONING_MODEL } from "@/Backend/agent/models";
import parse from "partial-json-parser";
import { addMemory } from "@/Backend/services/memory/memory.service"; // Import addMemory
import { db } from "@/Backend/db";
import { structuredFacts } from "@/Backend/db/schema";
import { logger } from "@/Backend/utils/logger";
/**
 * Extracts static facts about the user from a session history.
 */
export async function extractAndStoreFacts(sessionId: string, history: { role: string, content: string }[]): Promise<any[]> {
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
      for (const factData of parsedFacts) {
        const factText = String(factData.fact);
        const category = String(factData.category || "general");
        await addMemory(factText, {
          type: 'structured_fact',
          sessionId,
          category,
          timestamp: new Date().toISOString(),
        });
        await db.insert(structuredFacts).values({
          sessionId,
          fact: factText,
          category,
        });
        logger.info(`[Fact Extraction] Stored fact: "${factText}" (Category: ${category}) in VectorDB and database.`);
      }
      logger.info(`[Fact Extraction] Extracted and stored ${parsedFacts.length} new facts for session ${sessionId} in VectorDB.`);
      return parsedFacts; // Return the extracted facts on success
    }
    return []; // Return empty array if no facts found
  } catch (error) {
    logger.error(error, "[Fact Extraction Error]");
    return []; // Return empty array on error
  }
}
