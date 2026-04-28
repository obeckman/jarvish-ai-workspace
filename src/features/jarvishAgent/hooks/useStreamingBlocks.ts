import { useMemo } from 'react';
import { parse } from 'partial-json-parser';
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

    const trimmed = rawContent.trim();

    // If it doesn't start with a JSON array bracket, it's likely standard text
    if (!trimmed.startsWith('[')) {
      return [{ type: BLOCK_TYPES.TEXT, content: rawContent }];
    }

    try {
      // partial-json-parser helps close dangling quotes/brackets
      const parsed = parse(rawContent);

      if (Array.isArray(parsed)) {
        return parsed.map((block: any) => {
          // Attempt Zod validation
          const result = AgentMessageBlockSchema.safeParse(block);
          
          if (result.success) {
            return result.data;
          }

          // Fallback for partially formed blocks that Zod might reject
          // e.g. if 'type' is missing yet, but we have 'content'
          if (typeof block === 'object' && block !== null) {
            return {
              type: (block.type as any) || BLOCK_TYPES.TEXT,
              content: block.content || '',
              ...block
            } as AgentMessageBlock;
          }

          // Absolute fallback
          return { type: BLOCK_TYPES.TEXT, content: JSON.stringify(block) };
        });
      }
    } catch (e) {
      // If total failure, fallback to raw text
      return [{ type: BLOCK_TYPES.TEXT, content: rawContent }];
    }

    return [{ type: BLOCK_TYPES.TEXT, content: rawContent }];
  }, [rawContent]);
};
