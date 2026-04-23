import { GoogleGenerativeAI, Tool } from '@google/generative-ai';
import { retrieveMemories, Memory } from './memory';
import { inventoryToolDeclaration } from './tools';
import { 
  googleCalendarDeclaration, 
  gmailSearchDeclaration, 
  googleDocsDeclaration 
} from './google_tools';

// Context Window Guard (Approximate tokens to characters: 1 token ~= 4 chars)
const MAX_CONTEXT_TOKENS = 4000;
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * 4;

const MODEL_NAME = "gemini-2.0-flash";

/**
 * Utility for retrying stateless API calls (like context optimization).
 * Do NOT use for stateful chat sessions.
 */
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
 */
export async function getOptimizedContext(userQuery: string, rawMemories: Memory[]): Promise<string> {
  console.log(`[Orchestrator] Optimizing context...`);
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const memoriesText = rawMemories.map(m => `- ${m.text}`).join('');
  
  const prompt = `
    You are a Context Orchestrator.
    User Query: "${userQuery}"
    
    Raw Memories:
    ${memoriesText}
    
    Output strictly a "Synthesized Context" string.
  `;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    let synthesizedContext = result.response.text();
    
    if (synthesizedContext.length > MAX_CONTEXT_CHARS) {
      synthesizedContext = synthesizedContext.substring(0, MAX_CONTEXT_CHARS);
    }

    return synthesizedContext;
  } catch (error) {
    console.error(`[Orchestrator Error]`, error);
    return "Failed to synthesize context.";
  }
}

/**
 * Step 2: The Execution Agent
 */
export async function runAgentTask(userQuery: string, synthesizedContext: string, googleToken?: string) {
  console.log(`[Execution Agent] Initializing chat session with ${MODEL_NAME}...`);
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const functionDeclarations = [inventoryToolDeclaration];
  
  if (googleToken) {
    functionDeclarations.push(
      googleCalendarDeclaration,
      gmailSearchDeclaration,
      googleDocsDeclaration
    );
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: `You are Jarvish, an advanced Execution Agent.
    
    Current Capabilities:
    1. Inventory Management: Check stock for products using SKUs.
    ${googleToken ? '2. Google Workspace: Search Gmail, list Calendar events, read Google Docs.' : '2. Google Workspace: DISABLED. Ask user to login if needed.'}

    Context & Memories:
    ${synthesizedContext}`,
    tools: [{ functionDeclarations }],
  });

  const chat = model.startChat();
  
  // NOTE: No withRetry here. Stateful chat stream handles its own lifecycle.
  const result = await chat.sendMessageStream(userQuery);
  return { stream: result.stream, chat };
}

