import { GoogleGenerativeAI } from "@google/generative-ai";
import { REASONING_MODEL } from "@/server_v2/agent/models";
import { db } from "@/server_v2/db";
import { structuredFacts } from "@/server_v2/db/schema";
import parse from "partial-json-parser";

/**
 * Extracts static facts about the user from a session history.
 */
export async function extractAndStoreFacts(sessionId: string, history: { role: string, content: string }[]) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ 
    model: REASONING_MODEL,
    systemInstruction: `You are a Fact Extraction Agent. Your job is to analyze conversation history and extract static, long-term facts about the user.
    Examples of static facts:
    - "User prefers 180°C for pizza."
    - "User has 26 villages in Tribal Wars."
    - "User uses React and TypeScript for frontend."
    
    Ignore transient or conversational information.
    
    Output ONLY a JSON array of objects:
    [
      { "fact": "...", "category": "preferences" },
      { "fact": "...", "category": "gaming" }
    ]
    
    If no facts are found, output an empty array [].`
  });

  const prompt = `Analyze this conversation history and extract static facts:\n${JSON.stringify(history)}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text() || "";
    
    let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedFacts = parse(cleaned);
    
    if (Array.isArray(parsedFacts) && parsedFacts.length > 0) {
      const inserts = parsedFacts.map((f: any) => ({
        sessionId,
        fact: String(f.fact),
        category: String(f.category || "general"),
      }));
      
      await db.insert(structuredFacts).values(inserts);
      console.log(`[Fact Extraction] Extracted and stored ${inserts.length} new facts for session ${sessionId}.`);
    }
  } catch (error) {
    console.error("[Fact Extraction Error]", error);
  }
}
