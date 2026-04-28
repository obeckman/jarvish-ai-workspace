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
  
  return {
    messages: [{
      role: ROLES.MODEL,
      content: response.text(),
      tool_calls: response.functionCalls(),
      name: "google_worker"
    }],
    lastWorker: NODE_NAMES.GOOGLE_WORKER,
    metadata: { stage: STAGES.RESEARCH, status: "Google Worker is searching..." }
  };
}
