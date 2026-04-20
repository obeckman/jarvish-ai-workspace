import { GoogleGenerativeAI, Tool } from '@google/generative-ai';
import { retrieveMemories, Memory } from './memory';
import { inventoryToolDeclaration } from './tools';
import { 
  googleCalendarDeclaration, 
  gmailSearchDeclaration, 
  googleDocsDeclaration 
} from './google_tools';
import { isGoogleAuthenticated } from '../auth/google';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Context Window Guard (Approximate tokens to characters: 1 token ~= 4 chars)
const MAX_CONTEXT_TOKENS = 4000;
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * 4;

const MODEL_NAME = "gemini-flash-latest";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 503 || error.status === 429)) {
      console.warn(`[Retry] API error ${error.status}. Retrying in ${delay}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Step 1: The Context Orchestrator
 * Filters, summarizes, and extracts entities from raw local memories.
 */
export async function getOptimizedContext(userQuery: string, rawMemories: Memory[]): Promise<string> {
  console.log(`[Orchestrator] Optimizing context for ${rawMemories.length} local memories...`);
  
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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
    const result = await withRetry(() => model.generateContent(prompt));
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
export async function runAgentTask(userQuery: string, synthesizedContext: string, googleToken?: string) {
  console.log(`[Execution Agent] Starting task with synthesized context...`);
  
  const functionDeclarations = [inventoryToolDeclaration];
  
  // Only add Google tools if token is passed from the client
  if (googleToken) {
    console.log('[Execution Agent] User is authenticated with Google (token provided). Adding tools.');
    functionDeclarations.push(
      googleCalendarDeclaration,
      gmailSearchDeclaration,
      googleDocsDeclaration
    );
  }

  const tools: Tool[] = [{ functionDeclarations }];

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: `You are Jarvish, an advanced Execution Agent.
    
    Current Capabilities:
    1. Inventory Management: You can check stock for products using SKUs.
    ${googleToken ? '2. Google Workspace (READ-ONLY): You can search Gmail, list Calendar events, and read Google Docs.' : '2. Google Workspace: Currently disabled. Ask the user to login if they want you to access their Google Apps.'}

    Guidelines:
    - Be concise and professional.
    - If you use a tool, explain what you found.
    - If you need a Google tool but are not authenticated, politely ask the user to login.

    Context & Memories:
    ${synthesizedContext}`,
    tools,
  });

  const chat = model.startChat();
  
  console.log(`[Execution Agent] Chat session started. Sending initial message stream...`);
  // Note: Streaming retries are complex, so we'll wrap the call itself.
  // If the stream starts successfully, it usually continues unless connection breaks.
  const result = await withRetry(() => chat.sendMessageStream(userQuery));
  return { stream: result.stream, chat };
}
