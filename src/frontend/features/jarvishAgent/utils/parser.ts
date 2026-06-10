import { AgentMessageBlock, AgentMessageBlockSchema } from '../types';
import { BLOCK_TYPES } from '@/shared/jarvish.constants';

/**
 * Robustly parses agent message content which might be:
 * 1. A simple string.
 * 2. A JSON stringified array of blocks.
 * 3. A JSON stringified array of blocks where one block's content is a markdown code block containing more JSON.
 */
export function parseAgentMessageContent(content: string): AgentMessageBlock[] {
  if (!content || typeof content !== 'string') return [];

  let cleaned = content.trim();

  // Helper to remove markdown code block delimiters
  const stripMarkdown = (str: string): string => {
    const trimmed = str.trim();
    if (trimmed.startsWith('```json') && trimmed.endsWith('```')) {
      return trimmed.replace(/^```json\s*\n?/, '').replace(/\n?\s*```$/, '').trim();
    }
    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
      return trimmed.replace(/^```\s*\n?/, '').replace(/\n?\s*```$/, '').trim();
    }
    return trimmed;
  };

  cleaned = stripMarkdown(cleaned);

  if (!cleaned) return [];

  try {
    // Try standard JSON.parse first for efficiency and correctness
    const parsed = JSON.parse(cleaned);
    return processParsedResult(parsed);
  } catch {
    // If all parsing fails, return as a text block
    return cleaned ? [{ type: BLOCK_TYPES.TEXT, content: cleaned }] : [];
  }

}

function processParsedResult(parsed: unknown): AgentMessageBlock[] {
  if (Array.isArray(parsed)) {
    // Flat map to handle nested blocks that might have been parsed recursively
    return parsed.flatMap((item: unknown): AgentMessageBlock[] => {
      const validation = AgentMessageBlockSchema.safeParse(item);
      if (validation.success) {
        const block = validation.data;
        // Check if this is a text block that contains more JSON (recursion)
        // Zod already guarantees content is a string for BLOCK_TYPES.TEXT
        if (block.type === BLOCK_TYPES.TEXT) {
          const subParsed = parseAgentMessageContent(block.content);
          // If we got multiple blocks back, or a single block that is DIFFERENT from the current one, return them.
          // This avoids infinite recursion if parsing a string results in the same string text block.
          const isSameBlock = subParsed.length === 1 && 
                             subParsed[0].type === BLOCK_TYPES.TEXT && 
                             subParsed[0].content === block.content;

          if (subParsed.length > 0 && !isSameBlock) {
            return subParsed;
          }
        }
        return [block];
      }

      // If item doesn't match schema, return as a text block if possible or ignore
      if (typeof item === 'string') {
        return [{ type: BLOCK_TYPES.TEXT, content: item }];
      }
      if (item && typeof item === 'object') {
        return [{ type: BLOCK_TYPES.TEXT, content: JSON.stringify(item) }];
      }
      return []; // Filter out invalid items
    });
  }

  const validation = AgentMessageBlockSchema.safeParse(parsed);
  if (validation.success) {
    return [validation.data];
  }

  // If it's a single object/primitive but not a valid block, return as stringified JSON if it's not a string
  if (typeof parsed === 'string') {
    return [{ type: BLOCK_TYPES.TEXT, content: parsed }];
  }
  
  return [{ type: BLOCK_TYPES.TEXT, content: JSON.stringify(parsed) ?? '' }];
}
