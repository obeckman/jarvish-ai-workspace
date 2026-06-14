import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchWebPage } from '@/backend/services/tools/web.service';

describe('web page tool service', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches and strips noisy html content', async () => {
    fetchMock.mockResolvedValueOnce({
      text: async () => `
        <html>
          <head><style>.hidden { display: none; }</style></head>
          <body>
            <script>alert("nope")</script>
            <h1>Hello</h1>
            <p>World</p>
          </body>
        </html>
      `,
    });

    await expect(fetchWebPage({ url: 'https://example.test' })).resolves.toBe('Hello World');
    expect(fetchMock).toHaveBeenCalledWith('https://example.test');
  });

  it('truncates long page text', async () => {
    fetchMock.mockResolvedValueOnce({
      text: async () => `<p>${'x'.repeat(5100)}</p>`,
    });

    await expect(fetchWebPage({ url: 'https://example.test/long' })).resolves.toHaveLength(5000);
  });

  it('returns a tool error message when fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(fetchWebPage({ url: 'https://example.test/fail' })).resolves.toBe('Failed to fetch page: network down');
  });
});
