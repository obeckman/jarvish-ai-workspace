import { GoogleGenerativeAI } from "@google/generative-ai";
import { REASONING_MODEL } from "@/server_v2/agent/models";
import { db } from "@/server_v2/db";
import { structuredFacts } from "@/server_v2/db/schema";
import parse from "partial-json-parser";

/**
 * Extracts static facts about the user from a session history.
 */
export async function extractAndStoreFacts(sessionId: string, history: { role: string, content: string }[]): Promise<any[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ 
    model: REASONING_MODEL,
    systemInstruction: `You are a Fact Extraction Agent. Your job is to analyze conversation history and extract static, long-term facts about the user. When a user provides documents or specific information, extract key facts *from the content of those documents or information*, not just meta-facts about the user providing them.
    Examples of static facts:
    - "User prefers 180°C for pizza."
    - "User has 26 villages in Tribal Wars."
    - "User uses React and TypeScript for frontend."
    - "Oren Beckman's resume lists 10 years of experience in software development."
    - "The provided CV highlights expertise in AI and machine learning."

    Ignore transient or conversational information.

    Output ONLY a JSON array of objects:
    [
      { "fact": "...", "category": "preferences" },
      { "fact": "...", "category": "gaming" },
      { "fact": "...", "category": "resume" }
    ]

    If no facts are found, output an empty array [].`  });

  const prompt = `Analyze this conversation history and extract static facts:\n${JSON.stringify(history)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text() || "";
    console.log(`[Fact Extraction] Raw model output: ${text}`);
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedFacts = parse(cleaned);
    console.log(`[Fact Extraction] Parsed facts:`, parsedFacts);

    if (Array.isArray(parsedFacts) && parsedFacts.length > 0) {
      const inserts = parsedFacts.map((f: any) => ({
        sessionId,
        fact: String(f.fact),
        category: String(f.category || "general"),
      }));
      console.log(`[Fact Extraction] Inserting facts into DB:`, inserts);

      await db.insert(structuredFacts).values(inserts);
      console.log(`[Fact Extraction] Extracted and stored ${inserts.length} new facts for session ${sessionId}. Facts: ${JSON.stringify(inserts)}`);
      return parsedFacts; // Return the extracted facts on success
    }
    return []; // Return empty array if no facts found
  } catch (error) {
    console.error("[Fact Extraction Error]", error);
    return []; // Return empty array on error
  }
}
