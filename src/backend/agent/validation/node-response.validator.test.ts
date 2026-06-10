import { describe, expect, it, vi } from 'vitest';

import {
  buildNodeResponseRepairPrompt,
  createClarificationBlockContent,
  formatConfidenceStatus,
  validateNodeResponseContent,
  validateOrRepairNodeResponse,
} from '@/backend/agent/validation/node-response.validator';
import { BLOCK_TYPES } from '@/shared/jarvish.constants';

describe('Jarvish node response validator', () => {
  it('accepts valid UI block JSON and normalizes it', () => {
    expect(validateNodeResponseContent(`\`\`\`json
[{ "type": "text", "content": "done" }]
\`\`\``)).toEqual({
      valid: true,
      confidence: 100,
      content: JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: 'done' }]),
      reason: 'Response matched the shared UI block contract.',
    });
  });

  it('rejects empty and non-block responses', () => {
    expect(validateNodeResponseContent('')).toMatchObject({
      valid: false,
      confidence: 0,
      reason: 'The response was empty.',
    });

    expect(validateNodeResponseContent('plain prose')).toMatchObject({
      valid: false,
      confidence: 0,
      reason: 'The response did not include a JSON UI block array.',
    });
  });

  it('repairs invalid responses when the repair callback returns valid blocks', async () => {
    const repairContent = vi.fn().mockResolvedValue(JSON.stringify([
      { type: BLOCK_TYPES.TEXT, content: 'repaired answer' },
    ]));

    await expect(validateOrRepairNodeResponse('not json', repairContent)).resolves.toEqual({
      valid: true,
      confidence: 100,
      content: JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: 'repaired answer' }]),
      reason: 'Node repaired invalid UI block output.',
      repaired: true,
    });

    expect(repairContent.mock.calls[0][0]).toContain('Validation failure');
  });

  it('falls back to a clarification block when repair fails', async () => {
    const result = await validateOrRepairNodeResponse('not json', async () => 'still not json');

    expect(result).toMatchObject({
      valid: false,
      confidence: 0,
      repaired: true,
      reason: 'The response did not include a JSON UI block array.',
    });
    expect(JSON.parse(result.content)[0]).toMatchObject({
      type: BLOCK_TYPES.TEXT,
      content: expect.stringContaining('Could you clarify'),
    });
  });

  it('builds repair and confidence messages for observability', () => {
    expect(buildNodeResponseRepairPrompt('bad', 'missing array')).toContain('missing array');
    expect(createClarificationBlockContent('missing array')).toContain('missing array');
    expect(formatConfidenceStatus('Validated.', 80, 'ok')).toBe('Validated. Confidence: 80%.');
    expect(formatConfidenceStatus('Validated.', 50, 'thin result')).toBe('Validated. Confidence: 50%. thin result');
  });
});
