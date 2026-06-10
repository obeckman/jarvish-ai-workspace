import { describe, expect, it } from 'vitest';

import {
  createGeminiErrorBlockContent,
  formatGeminiOperationalMessage,
  getGeminiErrorDetails,
} from '@/backend/services/gemini-error';
import { BLOCK_TYPES } from '@/shared/jarvish.constants';

describe('Gemini operational error handling', () => {
  it('classifies direct authorization failures', () => {
    const details = getGeminiErrorDetails({
      status: 403,
      statusText: 'Forbidden',
      message: 'project denied access',
    });

    expect(details).toEqual({
      status: 403,
      statusText: 'Forbidden',
      message: 'project denied access',
      isAuthOrPermissionError: true,
    });
  });

  it('classifies nested provider responses', () => {
    const details = getGeminiErrorDetails({
      response: {
        status: 401,
        statusText: 'Unauthorized',
      },
      message: 'bad key',
    });

    expect(details.status).toBe(401);
    expect(details.statusText).toBe('Unauthorized');
    expect(details.isAuthOrPermissionError).toBe(true);
  });

  it('returns reviewer-friendly operational messages by status family', () => {
    expect(formatGeminiOperationalMessage({ status: 403 })).toContain('not authorized');
    expect(formatGeminiOperationalMessage({ status: 429 })).toContain('rate limit');
    expect(formatGeminiOperationalMessage({ status: 503 })).toContain('temporarily unavailable');
    expect(formatGeminiOperationalMessage(new Error('network down'))).toContain('backend logs');
  });

  it('wraps provider failures in Jarvish text blocks', () => {
    expect(JSON.parse(createGeminiErrorBlockContent({ status: 403 }))).toEqual([
      {
        type: BLOCK_TYPES.TEXT,
        content: expect.stringContaining('GEMINI_API_KEY'),
      },
    ]);
  });
});
