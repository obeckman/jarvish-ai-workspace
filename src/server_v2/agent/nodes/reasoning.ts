import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "../state.js";
import { 
  inventoryToolDeclaration, 
  webSearchDeclaration, 
  fetchWebPageDeclaration, 
  readPdfDeclaration, 
  readFileDeclaration, 
  addMemoryDeclaration 
} from "./registry.js";

/**
 * Node: LLM Reasoning
 * Responsibilities:
 * 1. Initialize the Gemini model with system instructions and tools.
 * 2. Combine history, memories, and research notes into a coherent prompt.
 * 3. Invoke the model to decide whether to call a tool or provide a final answer.
 */
export async function reasoningNode(state: AgentStateType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  // Format memories for the system prompt
  const memoriesText = state.memories.length > 0 
    ? state.memories.map(m => `- ${m.text}`).join('\n')
    : "No relevant verified memories found.";

  const systemInstruction = `You are Jarvish, a HIGH-ACCURACY RESEARCH AGENT.
  
  CORE PROTOCOLS:
  1. ZERO HALLUCINATION: Never guess. Use research tools or ask for clarification.
  2. VERIFY-THEN-SPEAK: Cross-reference findings.
  3. CITATION MANDATE: Always cite sources.

  VERIFIED CONTEXT FROM MEMORY:
  ${memoriesText}

  CURRENT RESEARCH NOTES:
  ${state.researchNotes.join('\n')}

  Directives:
  - If you need more info, call a tool.
  - If you have enough info, provide a detailed final answer.`;

  // Use gemini-2.5-flash as specified by the user
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction,
    tools: [{
      functionDeclarations: [
        inventoryToolDeclaration as any,
        webSearchDeclaration as any,
        fetchWebPageDeclaration as any,
        readPdfDeclaration as any,
        readFileDeclaration as any,
        addMemoryDeclaration as any
      ]
    }]
  });

  console.log(`[Agent Graph] Node: Reasoning | Deciding next steps...`);

  // Map state messages to Gemini parts
  let history = state.messages.map(m => ({
    role: (m.role === 'user' || m.role === 'human') ? 'user' : 'model',
    parts: [{ text: m.content || m.text || "" }]
  }));

  // Gemini Requirement: History must start with a 'user' message.
  const firstUserIndex = history.findIndex(m => m.role === 'user');
  if (firstUserIndex !== -1) {
    history = history.slice(firstUserIndex);
  }

  // The last message is the current query
  const lastMsg = history.pop();
  
  if (!lastMsg) {
    throw new Error("No messages found in history to send to Gemini.");
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMsg.parts);
  const response = result.response;

  // Map response back to a format our graph understands
  const content = response.text();
  const toolCalls = response.functionCalls();

  return {
    messages: [{
      role: "model",
      content: content,
      tool_calls: toolCalls
    }],
    metadata: { stage: 3, status: "Jarvish is thinking..." }
  };
}
