import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/server_v2/agent/state";
import { REASONING_MODEL } from "@/server_v2/agent/models";
import { ROLES, STAGES, TOOL_NAMES } from "@/server_v2/agent/constants";
import { 
  inventoryToolDeclaration, 
  webSearchDeclaration, 
  fetchWebPageDeclaration, 
  readPdfDeclaration, 
  readFileDeclaration, 
  addMemoryDeclaration,
  queryAttachmentsDeclaration,
  googleCalendarDeclaration,
  gmailSearchDeclaration,
  googleDocsDeclaration
} from "@/server_v2/agent/nodes/registry";

// Gemini API specific role strings
const GEMINI_ROLES = {
  USER: 'user',
  MODEL: 'model',
  FUNCTION: 'function',
} as const;

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

  // Format processed attachments for context
  const attachmentsContext = state.processedAttachments?.length > 0
    ? state.processedAttachments.map(a => `[Document: ${a.name}]\n${a.extractedText?.substring(0, 1000)}...`).join('\n\n')
    : "No processed documents available.";

  const systemInstruction = `You are Jarvish, a HIGH-ACCURACY RESEARCH AGENT.
  
  CORE PROTOCOLS:
  1. ZERO HALLUCINATION: Never guess. Use research tools or ask for clarification.
  2. VERIFY-THEN-SPEAK: Cross-reference findings.
  3. CITATION MANDATE: Always cite sources.

  VERIFIED CONTEXT FROM MEMORY:
  ${memoriesText}

  PROCESSED DOCUMENTS (EXTRACTED TEXT):
  ${attachmentsContext}

  CURRENT RESEARCH NOTES:
  ${state.researchNotes.join('\n')}

  Directives:
  - If you need more info from uploaded files, call '${TOOL_NAMES.QUERY_ATTACHMENTS}'.
  - If you need info from the web, call '${TOOL_NAMES.WEB_SEARCH}'.
  - If you need info from the user's Google Calendar, call '${TOOL_NAMES.LIST_CALENDAR}'.
  - If you need to search the user's Gmail, call '${TOOL_NAMES.SEARCH_GMAIL}'.
  - If you need to read a Google Doc, call '${TOOL_NAMES.GET_GOOGLE_DOC}'.
  - If you have enough info, provide a detailed final answer.`;

  const model = genAI.getGenerativeModel({
    model: REASONING_MODEL,
    systemInstruction,
    tools: [{
      functionDeclarations: [
        inventoryToolDeclaration as any,
        webSearchDeclaration as any,
        fetchWebPageDeclaration as any,
        readPdfDeclaration as any,
        readFileDeclaration as any,
        addMemoryDeclaration as any,
        queryAttachmentsDeclaration as any,
        googleCalendarDeclaration as any,
        gmailSearchDeclaration as any,
        googleDocsDeclaration as any
      ]
    }]
  });

  console.log(`[Agent Graph] Node: Reasoning | Deciding next steps...`);

  // Map state messages to Gemini parts
  let history = state.messages
    .filter(m => {
      const r = (m.role || "").toLowerCase();
      return r !== ROLES.REASONING.toLowerCase();
    }) // UI-only messages, don't send to LLM
    .map(m => {
    const r = (m.role || "").toLowerCase();
    const t = (m.type || "").toLowerCase();

    let role: string = GEMINI_ROLES.MODEL; // Default Gemini role
    if (r === ROLES.USER.toLowerCase() || r === ROLES.HUMAN.toLowerCase() || t === ROLES.HUMAN.toLowerCase()) {
      role = GEMINI_ROLES.USER;
    } else if (r === ROLES.TOOL.toLowerCase() || r === ROLES.FUNCTION.toLowerCase() || t === ROLES.TOOL.toLowerCase()) {
      role = GEMINI_ROLES.FUNCTION;
    }

    const parts: any[] = [];
    
    if (m.tool_calls && m.tool_calls.length > 0) {
      // Model calling a tool
      parts.push(...m.tool_calls.map((tc: any) => ({
        functionCall: {
          name: tc.name,
          args: tc.args
        }
      })));
    } else if (role === GEMINI_ROLES.FUNCTION) {
      // Result of a tool call
      parts.push({
        functionResponse: {
          name: m.name || 'unknown_tool', 
          response: { result: m.content }
        }
      });
    } else if (m.content || m.text) {
      // Regular text message
      parts.push({ text: m.content || m.text });
    } else if (role === GEMINI_ROLES.USER) {
      // User messages must have at least an empty text part if no content
      parts.push({ text: "" });
    }

    return { role, parts };
  })
  .filter(m => m.parts.length > 0);

  // Gemini Requirement: History must start with a 'user' message.
  const firstUserIndex = history.findIndex(m => m.role === GEMINI_ROLES.USER);
  if (firstUserIndex !== -1) {
    history = history.slice(firstUserIndex);
  }

  // The last message is the current query
  const lastMsg = history.pop();
  
  if (!lastMsg) {
    throw new Error("No messages found in history to send to Gemini.");
  }

  // Add raw attachments to the last message parts if they exist (multimodal support)
  if (state.attachments && Array.isArray(state.attachments)) {
    state.attachments.forEach(att => {
      if (att.data && att.mimeType) {
        lastMsg.parts.push({
          inlineData: {
            data: att.data,
            mimeType: att.mimeType
          }
        } as any);
      }
    });
  }

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMsg.parts);
  const response = result.response;

  // Map response back to a format our graph understands
  const content = response.text();
  const toolCalls = response.functionCalls();

  return {
    messages: [{
      role: ROLES.MODEL,
      content: content,
      tool_calls: toolCalls
    }],
    metadata: { stage: STAGES.SYNTHESIZE, status: "Jarvish is thinking..." }
  };
}
