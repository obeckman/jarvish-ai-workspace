import { GoogleGenerativeAI, Tool } from '@google/generative-ai';
import { retrieveMemories, Memory } from './memory.js';
import { 
  inventoryToolDeclaration, 
  webSearchDeclaration, 
  fetchWebPageDeclaration, 
  readPdfDeclaration, 
  readFileDeclaration, 
  addMemoryDeclaration 
} from './tools.js';
import { 
  googleCalendarDeclaration, 
  gmailSearchDeclaration, 
  googleDocsDeclaration 
} from './google_tools.js';

// Context Window Guard (Approximate tokens to characters: 1 token ~= 4 chars)
const MAX_CONTEXT_TOKENS = 12000;
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * 4;

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Utility for retrying stateless API calls (like context optimization).
 * Do NOT use for stateful chat sessions directly, but can be used for the initial call.
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorMessage = error.message || "";
    let waitTime = delay;

    // Try to extract "retry in X seconds" from error message
    const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);
    if (retryMatch && retryMatch[1]) {
      waitTime = Math.ceil(parseFloat(retryMatch[1]) * 1000) + 500; // Add 500ms buffer
    }

    if (retries > 0 && (error.status === 503 || error.status === 429 || errorMessage.includes("429") || errorMessage.includes("503"))) {
      console.warn(`[Retry] API error ${error.status || '429/503'}. Retrying in ${waitTime}ms... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      // Exponential backoff for the default case, or use the suggested wait time
      return withRetry(fn, retries - 1, retryMatch ? waitTime : delay * 2);
    }
    throw error;
  }
}

/**
 * Step 1: The Context Orchestrator
 */
export async function getOptimizedContext(userQuery: string, rawMemories: Memory[]): Promise<string> {
  if (!rawMemories || rawMemories.length === 0) {
    return "No relevant memories found.";
  }

  console.log(`[Orchestrator] Optimizing context for ${rawMemories.length} memories...`);
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const memoriesText = rawMemories.map(m => `- ${m.text}`).join('\n');
  
  const prompt = `You are a High-Accuracy Grounding Orchestrator. 
  Your goal is to extract only VERIFIABLE FACTS from the following memories that are directly relevant to the query: "${userQuery}".
  
  Memories:
  ${memoriesText}
  
  Rules:
  1. If a memory contains uncertain or conflicting info, note the uncertainty.
  2. If no memories are relevant, state "No relevant verified memories."
  3. Output only the synthesized factual context. Avoid conversational filler.`;

  try {
    const result = await withRetry(() => model.generateContent(prompt));
    let synthesizedContext = result.response.text();
    
    if (synthesizedContext.length > MAX_CONTEXT_CHARS) {
      synthesizedContext = synthesizedContext.substring(0, MAX_CONTEXT_CHARS);
    }

    return synthesizedContext;
  } catch (error) {
    console.error(`[Orchestrator Error]`, error);
    throw error;
  }
}

/**
 * Step 2: Agent Configuration
 */
export async function getAgentConfig(userQuery: string, rawMemories: Memory[], googleToken?: string, attachments: any[] = []) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
  const functionDeclarations = [
    inventoryToolDeclaration,
    webSearchDeclaration,
    fetchWebPageDeclaration,
    readPdfDeclaration,
    readFileDeclaration,
    addMemoryDeclaration
  ];
  
  if (googleToken) {
    functionDeclarations.push(
      googleCalendarDeclaration,
      gmailSearchDeclaration,
      googleDocsDeclaration
    );
  }

  const memoriesText = rawMemories.length > 0 
    ? rawMemories.map(m => `- ${m.text}`).join('\n')
    : "No relevant verified memories.";

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: `You are Jarvish, a HIGH-ACCURACY RESEARCH AGENT. Your primary mandate is to eliminate hallucinations and provide absolute truth.

    CORE PROTOCOLS:
    1. ZERO HALLUCINATION: If you are unsure or lack data, NEVER guess. Use 'web_search' or ask the user for clarification.
    2. VERIFY-THEN-SPEAK: Before making a factual claim, research it.
    3. CITATION MANDATE: Always cite your sources (URLs or "Memory ID").
    4. PROACTIVE CLARIFICATION: If a user's problem is vague, ask for details before starting research.

    CAPABILITIES:
    1. Research: 'web_search', 'fetch_web_page', 'read_pdf'.
    2. Context: 'read_file', 'add_to_memory'.
    3. Multimodal: You can see and read files (PDFs, images, docs) attached to the user's message.
    4. Google Workspace: ${googleToken ? 'ENABLED.' : 'DISABLED.'}

    VERIFIED CONTEXT (from Long-Term Memory):
    ${memoriesText}`,
    tools: [{ functionDeclarations }],
  });

  const messageParts: any[] = [{ text: userQuery }];
  
  // Add attachments if present
  if (attachments && attachments.length > 0) {
    attachments.forEach(file => {
      messageParts.push({
        inlineData: {
          data: file.data,
          mimeType: file.mimeType
        }
      });
    });
  }

  return { model, firstMessageParts: messageParts };
}

/**
 * Step 3: The Execution Agent (Legacy/Helper)
 */
export async function runAgentTask(userQuery: string, synthesizedContext: string, googleToken?: string) {
  const { model } = await getAgentConfig(userQuery, synthesizedContext, googleToken);
  const chat = model.startChat();
  const result = await chat.sendMessageStream(userQuery);
  return { stream: result.stream, chat };
}

