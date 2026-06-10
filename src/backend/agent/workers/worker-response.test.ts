import { describe, expect, it } from 'vitest';

import { normalizeWorkerContent } from '@/backend/agent/workers/worker-response';
import { BLOCK_TYPES } from '@/shared/jarvish.constants';

describe('Jarvish worker response normalization', () => {
  it('wraps plain prose in a text block', () => {
    expect(normalizeWorkerContent('plain worker answer', false)).toBe(JSON.stringify([
      { type: BLOCK_TYPES.TEXT, content: 'plain worker answer' },
    ]));
  });

  it('preserves valid block arrays from fenced JSON', () => {
    expect(normalizeWorkerContent(`\`\`\`json
[{ "type": "text", "content": "structured" }]
\`\`\``, false)).toBe(JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: 'structured' }]));
  });

  it('does not normalize content while tool calls are pending', () => {
    expect(normalizeWorkerContent('raw content', true)).toBe('raw content');
  });

  it('wraps incomplete structured-looking content when no JSON payload can be extracted', () => {
    expect(normalizeWorkerContent('[{"type":"text"', false)).toBe(JSON.stringify([
      { type: BLOCK_TYPES.TEXT, content: '[{"type":"text"' },
    ]));
  });
});
