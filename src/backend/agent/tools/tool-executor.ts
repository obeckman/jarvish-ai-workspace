import { logger } from "@/backend/utils/logger";
import { AgentToolCall } from "@/backend/agent/contracts/state.contract";
import { AgentStateType } from "@/backend/agent/state";
import { addMemory, forgetMemory, MEMORY_TYPES } from "@/backend/services/memory/memory.service";
import { readFile, writeFile } from "@/backend/services/tools/file.service";
import { getGoogleDocContent, listCalendarEvents, searchGmailMessages, updateGoogleDoc } from "@/backend/services/tools/google.service";
import { checkInventory } from "@/backend/services/tools/inventory.service";
import { readPdf } from "@/backend/services/tools/pdf.service";
import { searchWeb } from "@/backend/services/tools/search.service";
import { fetchWebPage } from "@/backend/services/tools/web.service";
import { TOOL_NAMES } from "@/shared/jarvish.constants";
import { queryProcessedAttachments } from "@/backend/agent/tools/attachment-query";
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
} from "@/backend/agent/tools/tool.schemas";
import { validateToolOutput } from "@/backend/agent/validation/tool-output.validator";

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
  [TOOL_NAMES.ADD_MEMORY]: (call, state) => {
    const args = AddMemoryToolArgsSchema.parse(call.args);
    const createdAt = new Date().toISOString();
    return addMemory(args.fact, {
      ...(args.category ? { category: args.category } : {}),
      type: MEMORY_TYPES.TOOL_FACT,
      sourceKind: MEMORY_TYPES.TOOL_FACT,
      userId: state.userId,
      sessionId: state.sessionId,
      timestamp: createdAt,
      createdAt,
      isActive: true,
      isLatest: true,
    });
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
