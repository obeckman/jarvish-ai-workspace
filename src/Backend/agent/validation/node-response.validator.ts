import parse from "partial-json-parser";

import { AgentMessageBlocksSchema } from "@/shared/jarvish.blocks";
import { BLOCK_TYPES, TOOL_CONFIDENCE_THRESHOLD } from "@/shared/jarvish.constants";

export type NodeResponseValidationResult = {
  valid: boolean;
  confidence: number;
  content: string;
  reason: string;
};

export type NodeResponseRepairResult = NodeResponseValidationResult & {
  repaired: boolean;
};

const REPAIR_PROMPT_PREFIX = "Your previous response was not valid Jarvish UI block JSON.";

export function validateNodeResponseContent(content: string): NodeResponseValidationResult {
  const trimmed = content.trim();

  if (!trimmed) {
    return invalidNodeResponse("The response was empty.");
  }

  const jsonPayload = extractJsonPayload(stripCodeFence(trimmed));

  if (!jsonPayload) {
    return invalidNodeResponse("The response did not include a JSON UI block array.");
  }

  try {
    const parsed = parse(jsonPayload);
    const blocksArray = Array.isArray(parsed) ? parsed : [parsed];
    const validation = AgentMessageBlocksSchema.safeParse(blocksArray);

    if (validation.success) {
      return {
        valid: true,
        confidence: 100,
        content: JSON.stringify(validation.data),
        reason: "Response matched the shared UI block contract.",
      };
    }

    return invalidNodeResponse(validation.error.message);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown JSON parsing error.";
    return invalidNodeResponse(reason);
  }
}

export async function validateOrRepairNodeResponse(
  content: string,
  repairContent: (prompt: string) => Promise<string>,
): Promise<NodeResponseRepairResult> {
  const validation = validateNodeResponseContent(content);

  if (validation.valid) {
    return { ...validation, repaired: false };
  }

  const repairedContent = await repairContent(buildNodeResponseRepairPrompt(content, validation.reason));
  const repairedValidation = validateNodeResponseContent(repairedContent);

  if (repairedValidation.valid) {
    return {
      ...repairedValidation,
      reason: "Node repaired invalid UI block output.",
      repaired: true,
    };
  }

  return {
    valid: false,
    confidence: 0,
    content: createClarificationBlockContent(repairedValidation.reason),
    reason: repairedValidation.reason,
    repaired: true,
  };
}

export function buildNodeResponseRepairPrompt(
  originalContent: string,
  reason: string,
): string {
  return `${REPAIR_PROMPT_PREFIX}

Validation failure:
${reason}

Return only a JSON array of valid UI blocks. Do not wrap it in markdown.

Allowed examples:
[{ "type": "text", "content": "..." }]
[{ "type": "code", "language": "ts", "content": "..." }]
[{ "type": "data", "displayType": "table", "title": "...", "data": [] }]

Original response to repair:
${originalContent}`;
}

export function createClarificationBlockContent(reason: string): string {
  return JSON.stringify([
    {
      type: BLOCK_TYPES.TEXT,
      content: `I could not produce a valid response with enough confidence. Could you clarify the request so I can answer accurately? Validation issue: ${reason}`,
    },
  ]);
}

export function formatConfidenceStatus(status: string, confidence: number, reason: string): string {
  if (confidence >= TOOL_CONFIDENCE_THRESHOLD) {
    return `${status} Confidence: ${confidence}%.`;
  }

  return `${status} Confidence: ${confidence}%. ${reason}`;
}

function invalidNodeResponse(reason: string): NodeResponseValidationResult {
  return {
    valid: false,
    confidence: 0,
    content: "",
    reason,
  };
}

function stripCodeFence(content: string): string {
  if (!content.startsWith("```")) {
    return content;
  }

  const firstNewline = content.indexOf("\n");
  const withoutOpeningFence = firstNewline === -1 ? content : content.substring(firstNewline + 1);

  if (withoutOpeningFence.endsWith("```")) {
    return withoutOpeningFence.substring(0, withoutOpeningFence.length - 3).trim();
  }

  return withoutOpeningFence.trim();
}

function extractJsonPayload(content: string): string | null {
  const firstBracket = content.indexOf("[");
  const firstBrace = content.indexOf("{");
  let startIndex = -1;

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    startIndex = firstBracket;
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else {
    return null;
  }

  const lastBracket = content.lastIndexOf("]");
  const lastBrace = content.lastIndexOf("}");
  const endIndex = Math.max(lastBracket, lastBrace);

  if (endIndex <= startIndex) {
    return null;
  }

  return content.substring(startIndex, endIndex + 1);
}
