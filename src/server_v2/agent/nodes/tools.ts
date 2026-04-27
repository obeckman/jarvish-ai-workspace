import { GoogleGenerativeAI } from "@google/generative-ai";
import { AgentStateType } from "../state.js";
import { TOOL_EXECUTION_MODEL } from "../models.js";
import { searchWeb } from "../../services/tools/search.service.js";
import { fetchWebPage } from "../../services/tools/web.service.js";
import { readPdf } from "../../services/tools/pdf.service.js";
import { readFile } from "../../services/tools/file.service.js";
import { addMemory } from "../../services/memory/memory.service.js";

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
      if (call.name === 'web_search') {
        output = await searchWeb(call.args);
      } else if (call.name === 'fetch_web_page') {
        output = await fetchWebPage(call.args);
      } else if (call.name === 'read_pdf') {
        output = await readPdf(call.args);
      } else if (call.name === 'read_file') {
        output = await readFile(call.args);
      } else if (call.name === 'add_to_memory') {
        output = await addMemory(call.args.fact, { category: call.args.category });
      } else if (call.name === 'query_attachments') {
        output = await handleQueryAttachments(call.args.query, state);
      } else {
        output = `Error: Tool '${call.name}' not recognized.`;
      }
    } catch (e: any) {
      output = `Error executing tool: ${e.message}`;
    }

    results.push({
      role: "tool",
      content: output,
      tool_call_id: call.id,
    });
    notes.push(`[Source: ${call.name}] ${typeof output === 'string' ? output.substring(0, 500) : JSON.stringify(output).substring(0, 500)}...`);
  }

  return {
    messages: results,
    researchNotes: notes,
    metadata: { stage: 2, status: `Completed ${toolCalls.length} research steps.` }
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
