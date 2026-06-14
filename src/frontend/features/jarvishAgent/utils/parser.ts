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
    const legacyBlocks = parseLegacyPlainTextWithCode(cleaned);
    if (legacyBlocks.some((block) => block.type === BLOCK_TYPES.CODE)) {
      return legacyBlocks;
    }

    // If all parsing fails, return as a text block
    return cleaned ? [{ type: BLOCK_TYPES.TEXT, content: cleaned }] : [];
  }

}

function parseLegacyPlainTextWithCode(content: string): AgentMessageBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: AgentMessageBlock[] = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const codeStart = findNextCodeStart(lines, cursor);

    if (codeStart === -1) {
      pushTextBlock(blocks, lines.slice(cursor).join('\n'));
      break;
    }

    pushTextBlock(blocks, lines.slice(cursor, codeStart).join('\n'));

    const codeEnd = findCodeEnd(lines, codeStart);
    const code = lines.slice(codeStart, codeEnd).join('\n').trim();
    if (code) {
      blocks.push({
        type: BLOCK_TYPES.CODE,
        language: inferCodeLanguage(code),
        content: code,
      });
    }

    cursor = codeEnd;
  }

  return blocks;
}

function findNextCodeStart(lines: string[], startIndex: number): number {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (isCodeStartLine(lines[index])) {
      return index;
    }
  }

  return -1;
}

function findCodeEnd(lines: string[], startIndex: number): number {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (isLegacyCodeBoundaryLine(line) && hasMeaningfulCode(lines.slice(startIndex, index))) {
      return index;
    }
  }

  return lines.length;
}

function isCodeStartLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^\/\/\s*[\w.-]+\.(tsx?|jsx?)$/i.test(trimmed) ||
    /^(import|export)\s/.test(trimmed) ||
    /^(const|let|var)\s+\w+/.test(trimmed) ||
    /^(function|class)\s+\w+/.test(trimmed) ||
    /^(interface|type)\s+\w+/.test(trimmed) ||
    /^(from\s+\S+\s+import|def\s+\w+|async\s+function\s+\w+)/.test(trimmed)
  );
}

function isLegacyCodeBoundaryLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  return (
    /^(Explanation|To use|Usage|Notes?|This code|In this example)\b:?/i.test(trimmed) ||
    (/^[A-Z][^{}()[\];=<>]*:$/.test(trimmed) && !isCodeStartLine(trimmed))
  );
}

function hasMeaningfulCode(lines: string[]): boolean {
  const code = lines.join('\n');
  return (
    /[{};]/.test(code) ||
    /return\s*\(/.test(code) ||
    /<\w+[\s>]/.test(code) ||
    /\b(import|export|function|const|let|var|class)\b/.test(code)
  );
}

function inferCodeLanguage(code: string): string {
  if (/\bReact\b/.test(code) || /<\w+[\s>]/.test(code) || /\.[jt]sx?\b/i.test(code)) {
    return 'jsx';
  }

  if (/\b(type|interface)\s+\w+/.test(code)) {
    return 'typescript';
  }

  if (/^(from\s+\S+\s+import|def\s+\w+)/m.test(code)) {
    return 'python';
  }

  return 'javascript';
}

function pushTextBlock(blocks: AgentMessageBlock[], content: string) {
  const trimmed = content.trim();
  if (trimmed) {
    blocks.push({ type: BLOCK_TYPES.TEXT, content: trimmed });
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
