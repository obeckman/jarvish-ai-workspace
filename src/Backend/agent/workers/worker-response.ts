import { z } from "zod";
import { BLOCK_TYPES } from "@/shared/jarvish.constants";

const StringContentBlockSchema = z.object({
  type: z.string(),
  content: z.string(),
});

export function normalizeWorkerContent(content: string, hasToolCalls: boolean): string {
  if (!content || hasToolCalls) {
    return content;
  }

  try {
    const cleaned = stripCodeFence(content.trim());
    const jsonPotential = extractJsonPayload(cleaned);

    if (!jsonPotential) {
      return stringifyTextBlock(content);
    }

    const parsed = JSON.parse(jsonPotential);
    if (Array.isArray(parsed) && parsed.every(isStringContentBlock)) {
      return JSON.stringify(parsed);
    }

    return stringifyTextBlock(content);
  } catch (_error) {
    if (!content.startsWith("[") && !content.startsWith("{")) {
      return stringifyTextBlock(content);
    }

    return content;
  }
}

function stripCodeFence(content: string): string {
  if (!content.startsWith("```")) {
    return content;
  }

  const firstNewline = content.indexOf("\n");
  let cleaned = firstNewline !== -1 ? content.substring(firstNewline + 1) : content;

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3).trim();
  }

  return cleaned;
}

function extractJsonPayload(content: string): string | null {
  const firstBracket = content.indexOf("[");
  const firstBrace = content.indexOf("{");
  let startIndex = -1;

  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    startIndex = firstBracket;
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  }

  if (startIndex === -1) {
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

function isStringContentBlock(block: unknown): block is { type: string; content: string } {
  return StringContentBlockSchema.safeParse(block).success;
}

function stringifyTextBlock(content: string): string {
  return JSON.stringify([{ type: BLOCK_TYPES.TEXT, content }]);
}
