import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "../state.js";
import { REASONING_MODEL } from "../models.js";
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
  - If you need more info from uploaded files, call 'query_attachments'.
  - If you need info from the web, call 'web_search'.
  - If you need info from the user's Google Calendar, call 'list_calendar_events'.
  - If you need to search the user's Gmail, call 'search_gmail_messages'.
  - If you need to read a Google Doc, call 'get_google_doc_content'.
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
    .filter(m => m.role !== 'reasoning') // UI-only messages, don't send to LLM
    .map(m => {
    let role = 'model';
    if (m.role === 'user' || m.role === 'human') {
      role = 'user';
    } else if (m.role === 'tool') {
      role = 'function';
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
    } else if (m.role === 'tool') {
      // Result of a tool call
      parts.push({
        functionResponse: {
          name: m.name || 'unknown_tool', 
          response: { result: m.content }
        }
      });
    } else {
      // Regular text message
      parts.push({ text: m.content || m.text || "" });
    }

    return { role, parts };
  });

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
      role: "model",
      content: content,
      tool_calls: toolCalls
    }],
    metadata: { stage: 3, status: "Jarvish is thinking..." }
  };
}
