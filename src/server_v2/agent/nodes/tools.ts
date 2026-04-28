import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "../state";
import { TOOL_EXECUTION_MODEL } from "../models";
import { ROLES, STAGES, TOOL_NAMES } from "../constants";
import { searchWeb } from "../../services/tools/search.service";
import { fetchWebPage } from "../../services/tools/web.service";
import { readPdf } from "../../services/tools/pdf.service";
import { readFile } from "../../services/tools/file.service";
import { addMemory } from "../../services/memory/memory.service";
import { listCalendarEvents, searchGmailMessages, getGoogleDocContent } from "../../services/tools/google.service";

/**
 * Node: Tool Execution
 * Responsibilities:
 * 1. Extract tool calls from the last AI message.
 * 2. Route calls to the correct service implementation.
 * 3. Accumulate results into the 'researchNotes' state.
 */
export async function toolsNode(state: AgentStateType) {
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = lastMessage.tool_calls || [];
  
  console.log(`[Agent Graph] Node: Tools | Executing ${toolCalls.length} tools.`);

  const results: any[] = [];
  const notes: string[] = [];

  for (const call of toolCalls) {
    let output: any;
    try {
      if (call.name === TOOL_NAMES.WEB_SEARCH) {
        output = await searchWeb(call.args);
      } else if (call.name === TOOL_NAMES.FETCH_WEB_PAGE) {
        output = await fetchWebPage(call.args);
      } else if (call.name === TOOL_NAMES.READ_PDF) {
        output = await readPdf(call.args);
      } else if (call.name === TOOL_NAMES.READ_FILE) {
        output = await readFile(call.args);
      } else if (call.name === TOOL_NAMES.ADD_MEMORY) {
        output = await addMemory(call.args.fact, { category: call.args.category });
      } else if (call.name === TOOL_NAMES.QUERY_ATTACHMENTS) {
        output = await handleQueryAttachments(call.args.query, state);
      } else if (call.name === TOOL_NAMES.LIST_CALENDAR) {
        if (!state.googleToken) throw new Error("Google authentication required.");
        output = await listCalendarEvents(state.googleToken, call.args);
      } else if (call.name === TOOL_NAMES.SEARCH_GMAIL) {
        if (!state.googleToken) throw new Error("Google authentication required.");
        output = await searchGmailMessages(state.googleToken, call.args);
      } else if (call.name === TOOL_NAMES.GET_GOOGLE_DOC) {
        if (!state.googleToken) throw new Error("Google authentication required.");
        output = await getGoogleDocContent(state.googleToken, call.args);
      } else {
        output = `Error: Tool '${call.name}' not recognized.`;
      }
    } catch (e: any) {
      output = `Error executing tool: ${e.message}`;
    }

    results.push({
      role: ROLES.TOOL,
      name: call.name,
      content: output,
      tool_call_id: call.id,
    });
    const safeOutput = typeof output === 'string' 
      ? output 
      : (JSON.stringify(output) || '');
    
    notes.push(`[Source: ${call.name}] ${safeOutput.substring(0, 500)}...`);
  }

  return {
    messages: results,
    researchNotes: notes,
    metadata: { stage: STAGES.RESEARCH, status: `Completed ${toolCalls.length} research steps.` }
  };
}

/**
 * Searches through processed attachments using an LLM.
 */
async function handleQueryAttachments(query: string, state: AgentStateType) {
  if (!state.processedAttachments || state.processedAttachments.length === 0) {
    return "No processed attachments found to query.";
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: TOOL_EXECUTION_MODEL });

  const context = state.processedAttachments.map(a => 
    `--- DOCUMENT: ${a.name} ---\n${a.extractedText}\n`
  ).join("\n\n");

  const prompt = `You are a document search assistant. Using the provided document context, answer the following query. 
  If the information is not in the documents, say so.
  
  CONTEXT:
  ${context}
  
  QUERY: ${query}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
