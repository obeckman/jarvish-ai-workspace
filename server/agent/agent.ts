import { GoogleGenerativeAI, Tool } from '@google/generative-ai';
import { retrieveMemories, Memory } from './memory';
import { inventoryToolDeclaration, executeInventoryCheck } from './tools';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Context Window Guard (Approximate tokens to characters: 1 token ~= 4 chars)
const MAX_CONTEXT_TOKENS = 4000;
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * 4;

/**
 * Step 1: The Context Orchestrator
 * Filters, summarizes, and extracts entities from raw Pinecone memories.
 */
export async function getOptimizedContext(userQuery: string, rawMemories: Memory[]): Promise<string> {
  console.log(`[Orchestrator] Optimizing context for ${rawMemories.length} memories...`);
  
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

  const memoriesText = rawMemories.map(m => `- ${m.text}`).join('');
  
  const prompt = `
    You are a Context Orchestrator.
    User Query: "${userQuery}"
    
    Raw Memories from database:
    ${memoriesText}
    
    Task:
    1. Filter out irrelevant memories that don't relate to the user query.
    2. Summarize older but relevant interactions.
    3. Extract specific entities (SKUs, preferences, names).
    
    Output strictly a "Synthesized Context" string that can be used by an execution agent.
    Do not include conversational filler.
  `;

  try {
    const result = await model.generateContent(prompt);
    let synthesizedContext = result.response.text();
    console.log(`[Orchestrator] Context synthesized. Length: ${synthesizedContext.length} chars.`);

    // Context Window Guard Implementation
    if (synthesizedContext.length > MAX_CONTEXT_CHARS) {
      console.warn(`[Guard] Truncating synthesized context from ${synthesizedContext.length} to ${MAX_CONTEXT_CHARS} chars.`);
      synthesizedContext = synthesizedContext.substring(0, MAX_CONTEXT_CHARS);
    }

    return synthesizedContext;
  } catch (error) {
    console.error(`[Orchestrator Error]`, error);
    return "Failed to synthesize context. Proceeding with raw data if possible.";
  }
}

/**
 * Step 2: The Execution Agent
 * Uses synthesized context as system instructions and binds tools for ReAct execution.
 */
export async function runAgentTask(userQuery: string, synthesizedContext: string) {
  console.log(`[Execution Agent] Starting task with synthesized context...`);
  
  const tools: Tool[] = [{
    functionDeclarations: [inventoryToolDeclaration],
  }];

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    systemInstruction: `You are an Execution Agent.

Context & Memories:
${synthesizedContext}`,
    tools,
  });

  const chat = model.startChat();
  
  console.log(`[Execution Agent] Chat session started. Sending initial message stream...`);
  // We return the chat session and the initial stream.
  // The route handler will process function calls (ReAct loop) and stream chunks.
  const result = await chat.sendMessageStream(userQuery);
  return { stream: result.stream, chat };
}
