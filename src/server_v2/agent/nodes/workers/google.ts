import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/server_v2/agent/state";
import { REASONING_MODEL } from "@/server_v2/agent/models";
import { ROLES, TOOL_NAMES, STAGES, NODE_NAMES } from "@/server_v2/agent/constants";
import { mapStateToGeminiHistory } from "../utils";
import { 
  googleCalendarDeclaration,
  gmailSearchDeclaration,
  googleDocsDeclaration,
  updateGoogleDocDeclaration
} from "@/server_v2/agent/nodes/registry";

/**
 * Node: Google Worker
 * Specialized in Google Workspace tools.
 */
export async function googleWorkerNode(state: AgentStateType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  const systemInstruction = `You are the Google Worker, part of the Jarvish team. Your job is to use Google Workspace tools to find information and assist in content creation.
  
  STRICT PROTOCOLS:
  1. ZERO HALLUCINATION: If a search returns no results, state that clearly.
  2. RAW TRUTH: Report data exactly as found in the tools.
  3. COLLABORATION: Use update_google_doc to help the user draft or update their documents.
  4. HANDOFF: If a task is purely technical (coding) or requires deep web research, provide what you found and suggest the Coder or Research worker.

  AVAILABLE TOOLS:
  - list_calendar_events: For schedule and events.
  - search_gmail_messages: For emails.
  - get_google_doc_content: For reading documents.
  - update_google_doc: For writing or appending to documents.`;

  const model = genAI.getGenerativeModel({
    model: REASONING_MODEL,
    systemInstruction,
    tools: [{
      functionDeclarations: [
        googleCalendarDeclaration as any,
        gmailSearchDeclaration as any,
        googleDocsDeclaration as any,
        updateGoogleDocDeclaration as any
      ]
    }]
  });

  const history = mapStateToGeminiHistory(state);
  const lastMsg = history.pop();
  
  if (!lastMsg) throw new Error("No messages found for Google Worker.");

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMsg.parts);
  const response = result.response;
  console.log(`[Agent Graph] Node: Google Worker | Raw response text:`, response.text());

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
          // Assuming AgentMessageBlocksSchema and BLOCK_TYPES are available or can be imported.
          // For now, let's just parse and re-stringify if valid JSON array.
          // A more robust solution would involve importing AgentMessageBlocksSchema and BLOCK_TYPES
          // and using safeParse as in supervisorNode.
          try {
            const parsed = JSON.parse(jsonPotential);
            if (Array.isArray(parsed) && parsed.every((block: any) => block.type && typeof block.content === 'string')) {
              content = JSON.stringify(parsed);
            } else {
              content = JSON.stringify([{ type: "text", content }]);
            }
          } catch (jsonError) {
            content = JSON.stringify([{ type: "text", content }]);
          }
        }
      } else {
        content = JSON.stringify([{ type: "text", content }]);
      }
    } catch (e) {
      if (!content.startsWith('[') && !content.startsWith('{')) {
        content = JSON.stringify([{ type: "text", content }]);
      }
    }
  }

  return {
    messages: [{
      role: ROLES.MODEL,
      content: content,
      tool_calls: toolCalls,
      name: "google_worker"
    }],
    lastWorker: NODE_NAMES.GOOGLE_WORKER,
    metadata: { stage: STAGES.RESEARCH, status: "Google Worker is searching..." }
  };
}
