import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import parse from "partial-json-parser";
import { AgentStateType } from "@/Backend/agent/state";
import { REASONING_MODEL } from "@/Backend/agent/models";
import { STAGES, BLOCK_TYPES, ROLES, NODE_NAMES } from "@/shared/jarvish.constants";;
import { AgentMessageBlocksSchema} from "@/Backend/agent/schema";
import { mapStateToGeminiHistory } from "./utils";
import { AIMessage } from "@langchain/core/messages";
import { HumanMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
/**
 * Node: Supervisor
 * Responsibilities:
 * 1. Analyze user intent.
 * 2. Delegate to specialized workers (Research, Google, System).
 * 3. Synthesize final answers from worker findings.
 */
export async function supervisorNode(state: AgentStateType) {
  try{
    const lastMessage = state.messages[state.messages.length - 1];
    const lastMessageName = (lastMessage as any).name;

    // If the last message is from a worker, it's the final answer for this turn.
    if (lastMessageName === NODE_NAMES.CODER_WORKER || lastMessageName === NODE_NAMES.RESEARCH_WORKER || lastMessageName === NODE_NAMES.GOOGLE_WORKER) {
      console.log(`[Agent Graph] Node: Supervisor | Worker response detected. Ending turn.`);
      return {}; // Return empty object to avoid re-broadcasting the message.
    }
  //console.log(`[Agent Graph] Node: Supervisor | State messages param:`, state.messages);
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  // Format memories for context
  const memoriesText = state.memories.length > 0 
    ? state.memories.map(m => `- ${m.text}`).join('\n')
    : "No relevant verified memories found.";

  const systemInstruction = `You are the Jarvish Supervisor, a HIGH-ACCURACY RESEARCH ORCHESTRATOR.
  
  Current Date and Time: ${new Date().toLocaleString()}

  STRICT ANTI-HALLUCINATION PROTOCOL:
  1. ZERO TOLERANCE: Never invent facts, URLs, dates, or technical specifications.
  2. VERIFY-THEN-SPEAK: If a worker provides information, treat it as "unverified" until you have cross-referenced it or it comes from a trusted source (e.g., user's own Gmail/Docs).
  3. "I DON'T KNOW": If the team cannot find the information, explicitly state what was tried and that the information is unavailable. Never guess.
  4. NO SYSTEM LEAKAGE: Do not mention internal tool names (e.g., 'delegate_to_...') or your own reasoning process to the user.

  VERIFIED CONTEXT FROM MEMORY:
  ${memoriesText}

  USER AUTHENTICATION STATUS:
  - Google Services: ${state.googleToken ? "AUTHENTICATED" : "NOT AUTHENTICATED"}

  THE TEAM:
  1. research_worker: Search the web, read PDFs, fetch URLs, and analyze uploaded documents.
  2. google_worker: SEARCH AND RETRIEVE from user's Gmail, Calendar, and Google Docs.
  3. coder_worker: CREATE AND IMPLEMENT. Best for drafting documents (proposals, emails), writing code, analyzing codebase, and updating local files.

  DELEGATION STRATEGY:
  - If the user wants to DRAFT, WRITE, or IMPLEMENT something, delegate to the coder_worker.
  - If the user wants to FIND info in their private accounts, delegate to the google_worker.
  - If the user wants to FIND info on the web or in documents, delegate to the research_worker.
  - If the task requires multiple steps, delegate sequentially.

  UI BLOCK OUTPUT MANDATE:
  - When providing a final answer, you MUST use a JSON array of UI blocks.
  - NEVER wrap the JSON in markdown code blocks.
  - Use 'TEXT' for standard prose: { "type": "${BLOCK_TYPES.TEXT}", "content": "..." }
  - Use 'DATA' for tables/charts: { "type": "${BLOCK_TYPES.DATA}", "displayType": "chart" | "table", "title": "...", "data": [...] }
  - Use 'CODE' for snippets: { "type": "${BLOCK_TYPES.CODE}", "language": "...", "content": "..." }`;

  const model = genAI.getGenerativeModel({
    model: REASONING_MODEL,
    systemInstruction,
    tools: [{
      functionDeclarations: [
        {
          name: "delegate_to_research_worker",
          description: "Hands off the task to the Research Worker for web search, document analysis, or PDF reading.",
          parameters: { type: SchemaType.OBJECT, properties: { reason: { type: SchemaType.STRING } } }
        },
        {
          name: "delegate_to_google_worker",
          description: "Hands off the task to the Google Worker for Gmail, Calendar, or Google Docs access.",
          parameters: { type: SchemaType.OBJECT, properties: { reason: { type: SchemaType.STRING } } }
        },
        {
          name: "delegate_to_coder_worker",
          description: "Hands off the task to the Coder Worker for codebase analysis, reading local files, or technical implementation.",
          parameters: { type: SchemaType.OBJECT, properties: { reason: { type: SchemaType.STRING } } }
        }
      ]
    }]
  });

  const history = mapStateToGeminiHistory(state);
  const lastHistoryMsg = history.pop(); 
  
  //console.log(`[Agent Graph] Node: Supervisor | Last user message for Gemini:`, lastHistoryMsg);
  
  if (!lastHistoryMsg) throw new Error("No messages found in history for Supervisor.");

  // Add raw attachments to the last message if they exist
  if (state.attachments && Array.isArray(state.attachments)) {
    state.attachments.forEach(att => {
      if (att.data && att.mimeType) {
        lastHistoryMsg.parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } } as any);
      }
    });
  }
  // find last humen message in messages 
  const userMsg = state.messages.slice().reverse().find(msg => { 
    return msg instanceof HumanMessage 
  }) || null;
  const sentMessage = userMsg?.content || lastHistoryMsg.parts;
  console.log(`[Agent Graph] Node: Supervisor | Sending message `, { 
    'state.messages':state.messages, 
    sentMessage
  });
  const chat = model.startChat({ history });

  const result = await chat.sendMessage(sentMessage);
  const response = result.response;
  console.log(`[Agent Graph] Node: Supervisor | Raw response text:`, response.text());

  let content = response.text();
  const toolCalls = response.functionCalls();

  // --- UI Block Validation ---
  if (content && !toolCalls?.length) {
    try {
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        const firstNewline = cleaned.indexOf('\n');
        if (firstNewline !== -1) cleaned = cleaned.substring(firstNewline + 1);
        if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.length - 3).trim();
      }

      const firstBracket = cleaned.indexOf('[');
      const firstBrace = cleaned.indexOf('{');
      let startIdx = -1;
      if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) startIdx = firstBracket;
      else if (firstBrace !== -1) startIdx = firstBrace;

      if (startIdx !== -1) {
        const lastBracket = cleaned.lastIndexOf(']');
        const lastBrace = cleaned.lastIndexOf('}');
        const endIdx = Math.max(lastBracket, lastBrace);

        if (endIdx > startIdx) {
          const jsonPotential = cleaned.substring(startIdx, endIdx + 1);
          console.log(`[Supervisor Node] Extracted JSON potential:`, jsonPotential);
          const parsed = parse(jsonPotential);
          console.log(`[Supervisor Node] parsed JSON :`, parsed);
          const blocksArray = Array.isArray(parsed) ? parsed : [parsed];
          const validation = AgentMessageBlocksSchema.safeParse(blocksArray);
          
          if (validation.success) {
            content = JSON.stringify(validation.data);
          }
        }
      } else {
        content = JSON.stringify([{ type: BLOCK_TYPES.TEXT, content }]);
      }
    } catch (e) {
      if (!content.startsWith('[') && !content.startsWith('{')) {
        content = JSON.stringify([{ type: BLOCK_TYPES.TEXT, content }]);
      }
    }
  }
  
  return {
    messages: [new AIMessage({
      
      content: content,
      tool_calls: toolCalls,
      name: "supervisor"
    })],
    metadata: { stage: STAGES.SYNTHESIZE, status: "Supervisor is orchestrating..." }
  };
}
  catch (error) {
    console.error(`[Agent Graph] Node: Supervisor | Error during processing:`, error);
    return {
      messages: [new AIMessage({
        content: JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: "An error occurred while processing the response." }]),
        tool_calls: [],
        name: "supervisor"
      })],
      metadata: { stage: STAGES.SYNTHESIZE, status: "Supervisor encountered an error." }
    };
  }
}
