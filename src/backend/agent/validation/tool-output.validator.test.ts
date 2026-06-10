import { describe, expect, it } from 'vitest';

import { validateToolOutput } from '@/backend/agent/validation/tool-output.validator';
import { TOOL_CONFIDENCE_THRESHOLD, TOOL_NAMES } from '@/shared/jarvish.constants';

describe('Jarvish tool output validator', () => {
  it('rejects nullish, empty, and operational failure outputs', () => {
    expect(validateToolOutput('calendar', null)).toEqual({
      valid: false,
      confidence: 0,
      reason: 'Tool returned no output.',
    });
    expect(validateToolOutput('calendar', '')).toEqual({
      valid: false,
      confidence: 0,
      reason: 'calendar returned an empty string.',
    });
    expect(validateToolOutput('calendar', 'Error: access denied')).toEqual({
      valid: false,
      confidence: 0,
      reason: 'calendar returned an operational failure.',
    });
  });

  it('marks empty-result language as low-confidence but explainable', () => {
    expect(validateToolOutput('gmail', 'No results found')).toEqual({
      valid: false,
      confidence: 50,
      reason: 'gmail returned no decisive result.',
    });
  });

  it('validates arrays, objects, and primitives with appropriate confidence', () => {
    expect(validateToolOutput('calendar', [{ title: 'standup' }])).toEqual({
      valid: true,
      confidence: 100,
      reason: 'calendar returned 1 result(s).',
    });
    expect(validateToolOutput('calendar', { ok: true })).toEqual({
      valid: true,
      confidence: 100,
      reason: 'Tool returned a structured object.',
    });
    expect(validateToolOutput('calendar', true)).toEqual({
      valid: true,
      confidence: TOOL_CONFIDENCE_THRESHOLD,
      reason: 'Tool returned a primitive value.',
    });
  });

  it('lowers confidence for web search text without URLs', () => {
    expect(validateToolOutput(TOOL_NAMES.WEB_SEARCH, 'A relevant text-only result')).toEqual({
      valid: true,
      confidence: 75,
      reason: 'Search returned text without explicit URLs.',
    });
  });
});
