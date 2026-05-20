import { logger } from "@/Backend/utils/logger";
import { AgentToolCall } from "@/Backend/agent/contracts/state.contract";
import { AgentStateType } from "@/Backend/agent/state";
import { addMemory, forgetMemory } from "@/Backend/services/memory/memory.service";
import { readFile, writeFile } from "@/Backend/services/tools/file.service";
import { getGoogleDocContent, listCalendarEvents, searchGmailMessages, updateGoogleDoc } from "@/Backend/services/tools/google.service";
import { checkInventory } from "@/Backend/services/tools/inventory.service";
import { readPdf } from "@/Backend/services/tools/pdf.service";
import { searchWeb } from "@/Backend/services/tools/search.service";
import { fetchWebPage } from "@/Backend/services/tools/web.service";
import { TOOL_NAMES } from "@/shared/jarvish.constants";
import { queryProcessedAttachments } from "@/Backend/agent/tools/attachment-query";
import {
  AddMemoryToolArgsSchema,
  FetchWebPageToolArgsSchema,
  ForgetMemoryToolArgsSchema,
  GoogleDocToolArgsSchema,
  InventoryToolArgsSchema,
  ListCalendarEventsToolArgsSchema,
  QueryAttachmentsToolArgsSchema,
  ReadFileToolArgsSchema,
  ReadPdfToolArgsSchema,
  SearchGmailMessagesToolArgsSchema,
  UpdateGoogleDocToolArgsSchema,
  WebSearchToolArgsSchema,
  WriteFileToolArgsSchema,
} from "@/Backend/agent/tools/tool.schemas";
import { validateToolOutput } from "@/Backend/agent/validation/tool-output.validator";

type ToolHandler = (call: AgentToolCall, state: AgentStateType) => Promise<unknown>;

type ToolExecutionResult = {
  output: unknown;
  confidence: number;
  valid: boolean;
  reason: string;
};

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  [TOOL_NAMES.WEB_SEARCH]: (call) => searchWeb(WebSearchToolArgsSchema.parse(call.args)),
  [TOOL_NAMES.FETCH_WEB_PAGE]: (call) => fetchWebPage(FetchWebPageToolArgsSchema.parse(call.args)),
  [TOOL_NAMES.READ_PDF]: (call) => readPdf(ReadPdfToolArgsSchema.parse(call.args)),
  [TOOL_NAMES.READ_FILE]: (call) => readFile(ReadFileToolArgsSchema.parse(call.args)),
  [TOOL_NAMES.WRITE_FILE]: (call) => writeFile(WriteFileToolArgsSchema.parse(call.args)),
  [TOOL_NAMES.ADD_MEMORY]: (call) => {
    const args = AddMemoryToolArgsSchema.parse(call.args);
    return addMemory(args.fact, { category: args.category });
  },
  [TOOL_NAMES.FORGET_MEMORY]: async (call) => {
    const args = ForgetMemoryToolArgsSchema.parse(call.args);
    await forgetMemory(args.memoryId);
    return `Successfully forgotten memory with ID: ${args.memoryId}`;
  },
  [TOOL_NAMES.QUERY_ATTACHMENTS]: (call, state) => {
    const args = QueryAttachmentsToolArgsSchema.parse(call.args);
    return queryProcessedAttachments(args.query, state);
  },
  [TOOL_NAMES.CHECK_INVENTORY]: (call) => checkInventory(InventoryToolArgsSchema.parse(call.args)),
  [TOOL_NAMES.LIST_CALENDAR]: (call, state) => listCalendarEvents(
    requireGoogleToken(state),
    ListCalendarEventsToolArgsSchema.parse(call.args),
  ),
  [TOOL_NAMES.SEARCH_GMAIL]: (call, state) => searchGmailMessages(
    requireGoogleToken(state),
    SearchGmailMessagesToolArgsSchema.parse(call.args),
  ),
  [TOOL_NAMES.GET_GOOGLE_DOC]: (call, state) => getGoogleDocContent(
    requireGoogleToken(state),
    GoogleDocToolArgsSchema.parse(call.args),
  ),
  [TOOL_NAMES.UPDATE_GOOGLE_DOC]: (call, state) => updateGoogleDoc(
    requireGoogleToken(state),
    UpdateGoogleDocToolArgsSchema.parse(call.args),
  ),
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
      valid: false,
      reason: "Tool was not registered.",
    };
  }

  try {
    logger.debug({ sessionId: state.sessionId, toolName: call.name, toolArgs: call.args }, "Executing tool");
    const output = await handler(call, state);
    const validation = validateToolOutput(call.name, output);

    if (!validation.valid) {
      logger.warn(
        { sessionId: state.sessionId, toolName: call.name, reason: validation.reason, confidence: validation.confidence },
        "Tool output failed validation",
      );
    } else {
      logger.debug(
        { sessionId: state.sessionId, toolName: call.name, reason: validation.reason, confidence: validation.confidence },
        "Tool output passed validation",
      );
    }

    return {
      output,
      confidence: validation.confidence,
      valid: validation.valid,
      reason: validation.reason,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown tool execution error";
    logger.error({ sessionId: state.sessionId, toolName: call.name, error }, "Error executing tool");
    return {
      output: `Error executing tool: ${message}`,
      confidence: 0,
      valid: false,
      reason: message,
    };
  }
}

export function formatToolNote(call: AgentToolCall, output: unknown, confidence: number, reason: string): string {
  const safeOutput = typeof output === "string" ? output : (JSON.stringify(output) || "");
  return `[Source: ${call.name} | Conf: ${confidence}% | ${reason}] ${safeOutput.substring(0, 500)}...`;
}

function requireGoogleToken(state: AgentStateType): string {
  if (!state.googleToken) {
    throw new Error("Google authentication required.");
  }

  return state.googleToken;
}
