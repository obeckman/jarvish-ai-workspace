import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
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
  const model = new ChatGoogleGenerativeAI({
    modelName: "gemini-2.5-flash",
    apiKey: process.env.GEMINI_API_KEY,
    streaming: true,
  });

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

  console.log(`[Agent Graph] Node: Reasoning | Deciding next steps...`);

  // Bind the tool declarations to the Gemini model
  const modelWithTools = model.bind({
    functions: [
      inventoryToolDeclaration,
      webSearchDeclaration,
      fetchWebPageDeclaration,
      readPdfDeclaration,
      readFileDeclaration,
      addMemoryDeclaration
    ],
  });

  const response = await modelWithTools.invoke([
    { role: "system", content: systemInstruction },
    ...state.messages
  ]);

  return {
    messages: [response],
    metadata: { stage: 3, status: "Jarvish is thinking..." }
  };
}
