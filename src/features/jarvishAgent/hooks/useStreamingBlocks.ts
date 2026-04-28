import { useMemo } from 'react';
import parse from 'partial-json-parser';
import { AgentMessageBlock, AgentMessageBlockSchema } from '../types';
import { BLOCK_TYPES } from '../constants';

/**
 * useStreamingBlocks
 * 
 * Logic to handle "The Dangling String":
 * 1. If rawContent starts with '[', attempt partial JSON parsing.
 * 2. If it doesn't look like JSON, wrap the entire thing in a TextBlock.
 * 3. Validate each parsed block using Zod.
 * 4. Gracefully handle incomplete final blocks.
 */
export const useStreamingBlocks = (rawContent: string): AgentMessageBlock[] => {
  return useMemo(() => {
    if (!rawContent) return [];

    const content = rawContent.trim();

    // 1. Try to find the JSON boundaries
    // We look for the first '[' or '{' and the last ']' or '}'
    const firstBracket = content.indexOf('[');
    const firstBrace = content.indexOf('{');
    let startIdx = -1;

    if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
      startIdx = firstBracket;
    } else if (firstBrace !== -1) {
      startIdx = firstBrace;
    }

    // If no JSON-like start is found, treat as plain text
    if (startIdx === -1) {
      return [{ type: BLOCK_TYPES.TEXT, content: rawContent }];
    }

    const lastBracket = content.lastIndexOf(']');
    const lastBrace = content.lastIndexOf('}');
    const endIdx = Math.max(lastBracket, lastBrace);

    if (endIdx === -1 || endIdx <= startIdx) {
      return [{ type: BLOCK_TYPES.TEXT, content: rawContent }];
    }

    const jsonPotential = content.substring(startIdx, endIdx + 1);

    try {
      // partial-json-parser helps close dangling quotes/brackets for streaming
      const parsed = parse(jsonPotential);
      
      // Ensure we're working with an array of blocks
      const blocksArray = Array.isArray(parsed) ? parsed : [parsed];

      return blocksArray.map((block: any) => {
        // Attempt Zod validation
        const result = AgentMessageBlockSchema.safeParse(block);
        
        if (result.success) {
          return result.data;
        }

        // Fallback for partially formed or schema-mismatched objects
        if (typeof block === 'object' && block !== null) {
          return {
            type: (block.type as any) || BLOCK_TYPES.TEXT,
            content: block.content || JSON.stringify(block),
            ...block
          } as AgentMessageBlock;
        }

        // Absolute fallback for non-object parsed results
        return { type: BLOCK_TYPES.TEXT, content: String(block) };
      });
      
    } catch (e) {
      // If parsing fails (e.g. it wasn't actually JSON), fallback to raw text
      return [{ type: BLOCK_TYPES.TEXT, content: rawContent }];
    }
  }, [rawContent]);
};
