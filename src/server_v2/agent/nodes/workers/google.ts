import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "@/server_v2/agent/state";
import { REASONING_MODEL } from "@/server_v2/agent/models";
import { ROLES, TOOL_NAMES, STAGES, NODE_NAMES } from "@/server_v2/agent/constants";
import { mapStateToGeminiHistory } from "../utils";
import { 
  googleCalendarDeclaration,
  gmailSearchDeclaration,
  googleDocsDeclaration
} from "@/server_v2/agent/nodes/registry";

/**
 * Node: Google Worker
 * Specialized in Google Workspace tools.
 */
export async function googleWorkerNode(state: AgentStateType) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  
  const systemInstruction = `You are the Google Worker. Your job is to use Google Workspace tools to answer the user's request.
  
  STRICT PROTOCOLS:
  1. ZERO HALLUCINATION: If a search returns no results, say "No results found for [query]". Never invent emails, events, or doc content.
  2. RAW TRUTH: Report the data exactly as found in the tools. Do not "enhance" findings with outside knowledge.
  3. SUMMARY MANDATE: Summarize the findings clearly so the supervisor can synthesize them.

  AVAILABLE TOOLS:
  - list_calendar_events: For schedule and events.
  - search_gmail_messages: For emails.
  - get_google_doc_content: For reading documents.`;

  const model = genAI.getGenerativeModel({
    model: REASONING_MODEL,
    systemInstruction,
    tools: [{
      functionDeclarations: [
        googleCalendarDeclaration as any,
        gmailSearchDeclaration as any,
        googleDocsDeclaration as any
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
