import { logger } from "@/Backend/utils/logger";
import { AgentToolCall } from "@/Backend/agent/contracts/state.contract";
import { AgentStateType } from "@/Backend/agent/state";
import { addMemory, forgetMemory } from "@/Backend/services/memory/memory.service";
import { readFile, writeFile } from "@/Backend/services/tools/file.service";
import { getGoogleDocContent, listCalendarEvents, searchGmailMessages, updateGoogleDoc } from "@/Backend/services/tools/google.service";
import { readPdf } from "@/Backend/services/tools/pdf.service";
import { searchWeb } from "@/Backend/services/tools/search.service";
import { fetchWebPage } from "@/Backend/services/tools/web.service";
import { TOOL_NAMES } from "@/shared/jarvish.constants";
import { queryProcessedAttachments } from "@/Backend/agent/tools/attachment-query";

type ToolHandler = (call: AgentToolCall, state: AgentStateType) => Promise<unknown>;

type ToolExecutionResult = {
  output: unknown;
  confidence: number;
};

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  [TOOL_NAMES.WEB_SEARCH]: (call) => searchWeb(call.args as any),
  [TOOL_NAMES.FETCH_WEB_PAGE]: (call) => fetchWebPage(call.args as any),
  [TOOL_NAMES.READ_PDF]: (call) => readPdf(call.args as any),
  [TOOL_NAMES.READ_FILE]: (call) => readFile(call.args as any),
  [TOOL_NAMES.WRITE_FILE]: (call) => writeFile(call.args as any),
  [TOOL_NAMES.ADD_MEMORY]: (call) => addMemory(String(call.args.fact), { category: call.args.category }),
  [TOOL_NAMES.FORGET_MEMORY]: async (call) => {
    await forgetMemory(String(call.args.memoryId));
    return `Successfully forgotten memory with ID: ${call.args.memoryId}`;
  },
  [TOOL_NAMES.QUERY_ATTACHMENTS]: (call, state) => queryProcessedAttachments(String(call.args.query), state),
  [TOOL_NAMES.LIST_CALENDAR]: (call, state) => listCalendarEvents(requireGoogleToken(state), call.args as any),
  [TOOL_NAMES.SEARCH_GMAIL]: (call, state) => searchGmailMessages(requireGoogleToken(state), call.args as any),
  [TOOL_NAMES.GET_GOOGLE_DOC]: (call, state) => getGoogleDocContent(requireGoogleToken(state), call.args as any),
  [TOOL_NAMES.UPDATE_GOOGLE_DOC]: (call, state) => updateGoogleDoc(requireGoogleToken(state), call.args as any),
};

export async function executeAgentTool(
  call: AgentToolCall,
  state: AgentStateType,
): Promise<ToolExecutionResult> {
  const handler = TOOL_HANDLERS[call.name];

  if (!handler) {
    return {
      output: `Error: Tool '${call.name}' not recognized.`,
      confidence: 0,
    };
  }

  try {
    logger.debug({ sessionId: state.sessionId, toolName: call.name, toolArgs: call.args }, "Executing tool");
    const output = await handler(call, state);
    return {
      output,
      confidence: scoreToolConfidence(output),
    };
  } catch (error: any) {
    logger.error({ sessionId: state.sessionId, toolName: call.name, error }, "Error executing tool");
    return {
      output: `Error executing tool: ${error.message}`,
      confidence: 0,
    };
  }
}

export function formatToolNote(call: AgentToolCall, output: unknown, confidence: number): string {
  const safeOutput = typeof output === "string" ? output : (JSON.stringify(output) || "");
  return `[Source: ${call.name} | Conf: ${confidence}%] ${safeOutput.substring(0, 500)}...`;
}

function requireGoogleToken(state: AgentStateType): string {
  if (!state.googleToken) {
    throw new Error("Google authentication required.");
  }

  return state.googleToken;
}

function scoreToolConfidence(output: unknown): number {
  const outputStr = String(output);

  if (!output || outputStr.trim() === "") {
    return 0;
  }

  const lowerOutput = outputStr.toLowerCase();
  if (lowerOutput.includes("error:") || lowerOutput.includes("failed to")) {
    return 0;
  }

  if (lowerOutput.includes("no results found") || lowerOutput.includes("could not find")) {
    return 50;
  }

  return 100;
}
