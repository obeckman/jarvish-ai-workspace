import { describe, expect, it } from 'vitest';

import {
  getToolErrorMessage,
  getToolErrorStatus,
} from '@/backend/services/tools/tool-error';

describe('Jarvish tool error helpers', () => {
  it('extracts readable messages only from Error instances', () => {
    expect(getToolErrorMessage(new Error('calendar denied'))).toBe('calendar denied');
    expect(getToolErrorMessage({ message: 'hidden' })).toBe('Unknown tool error');
  });

  it('extracts numeric status or code fields', () => {
    expect(getToolErrorStatus({ status: 403 })).toBe(403);
    expect(getToolErrorStatus({ code: 429 })).toBe(429);
    expect(getToolErrorStatus({ status: '403' })).toBeUndefined();
    expect(getToolErrorStatus(null)).toBeUndefined();
  });
});
