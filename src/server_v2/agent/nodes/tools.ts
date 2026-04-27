import { AgentStateType } from "../state.js";
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
    notes.push(`[Source: ${call.name}] ${output.substring(0, 500)}...`);
  }

  return {
    messages: results,
    researchNotes: notes,
    metadata: { stage: 2, status: `Completed ${toolCalls.length} research steps.` }
  };
}
