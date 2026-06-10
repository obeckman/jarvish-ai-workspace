import { describe, expect, it } from 'vitest';

import { parseAgentMessageContent } from '@/frontend/features/jarvishAgent/utils/parser';
import { BLOCK_TYPES, DISPLAY_TYPE } from '@/shared/jarvish.constants';

describe('Jarvish agent block parser', () => {
  it('returns plain text as a text block', () => {
    expect(parseAgentMessageContent('plain answer')).toEqual([
      { type: BLOCK_TYPES.TEXT, content: 'plain answer' },
    ]);
  });

  it('parses JSON block arrays wrapped in markdown fences', () => {
    expect(parseAgentMessageContent(`\`\`\`json
[
  {"type":"text","content":"hello"},
  {"type":"data","displayType":"table","data":[{"name":"Standup"}]}
]
\`\`\``)).toEqual([
      { type: BLOCK_TYPES.TEXT, content: 'hello' },
      {
        type: BLOCK_TYPES.DATA,
        displayType: DISPLAY_TYPE.TABLE,
        data: [{ name: 'Standup' }],
      },
    ]);
  });

  it('recursively unwraps a text block that contains structured blocks', () => {
    const nested = JSON.stringify([
      {
        type: BLOCK_TYPES.TEXT,
        content: JSON.stringify([{ type: BLOCK_TYPES.REASONING, content: 'inner plan' }]),
      },
    ]);

    expect(parseAgentMessageContent(nested)).toEqual([
      { type: BLOCK_TYPES.REASONING, content: 'inner plan' },
    ]);
  });
});
