import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readPdf } from '@/backend/services/tools/pdf.service';

const getTextMock = vi.fn();
const destroyMock = vi.fn();

vi.mock('pdf-parse', () => ({
  PDFParse: vi.fn().mockImplementation(function PDFParseMock() {
    return {
    getText: getTextMock,
    destroy: destroyMock,
    };
  }),
}));

describe('PDF tool service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    getTextMock.mockReset();
    destroyMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('downloads and extracts PDF text', async () => {
    fetchMock.mockResolvedValueOnce({
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    getTextMock.mockResolvedValueOnce({ text: 'pdf text' });
    destroyMock.mockResolvedValueOnce(undefined);

    await expect(readPdf({ url: 'https://example.test/file.pdf' })).resolves.toBe('pdf text');
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/file.pdf');
    expect(destroyMock).toHaveBeenCalledOnce();
  });

  it('truncates extracted PDF text', async () => {
    fetchMock.mockResolvedValueOnce({
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
    getTextMock.mockResolvedValueOnce({ text: 'x'.repeat(10050) });
    destroyMock.mockResolvedValueOnce(undefined);

    await expect(readPdf({ url: 'https://example.test/long.pdf' })).resolves.toHaveLength(10000);
  });

  it('returns a tool error message when PDF extraction fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('download failed'));

    await expect(readPdf({ url: 'https://example.test/fail.pdf' })).resolves.toBe('Failed to read PDF: download failed');
  });
});
