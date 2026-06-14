import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateContentMock = vi.fn();

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(function GoogleGenerativeAIMock() {
    return {
      getGenerativeModel: vi.fn(() => ({
        generateContent: generateContentMock,
      })),
    };
  }),
}));

vi.mock('@/backend/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('titling service', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it('generates and sanitizes a short title', async () => {
    generateContentMock.mockResolvedValueOnce({
      response: {
        text: () => '"React Hover Components"',
      },
    });

    const { generateTitle } = await import('@/backend/services/titling.service');

    await expect(generateTitle('show react hover component')).resolves.toBe('React Hover Components');
  });

  it('falls back when model returns empty text', async () => {
    generateContentMock.mockResolvedValueOnce({
      response: {
        text: () => '',
      },
    });

    const { generateTitle } = await import('@/backend/services/titling.service');

    await expect(generateTitle('empty response query')).resolves.toBe('New Research');
  });

  it('falls back to a truncated query when generation fails', async () => {
    generateContentMock.mockRejectedValueOnce(new Error('model unavailable'));

    const { generateTitle } = await import('@/backend/services/titling.service');

    await expect(generateTitle('abcdefghijklmnopqrstuvwxyz1234567890')).resolves.toBe('abcdefghijklmnopqrstuvwxyz1234...');
  });
});
