import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
const googleSearchListMock = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    customsearch: vi.fn(() => ({
      cse: {
        list: googleSearchListMock,
      },
    })),
  },
}));

describe('searchWeb', () => {
  beforeEach(() => {
    vi.resetModules();
    googleSearchListMock.mockReset();
    process.env = { ...originalEnv };
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('returns a readable failure when no provider is configured', async () => {
    delete process.env.SERPER_API_KEY;
    delete process.env.GOOGLE_SEARCH_API_KEY;
    delete process.env.GOOGLE_SEARCH_CX;
    const { searchWeb } = await import('@/backend/services/tools/search.service');

    await expect(searchWeb({ query: 'agent memory' })).resolves.toContain('Search failed: No search provider configured');
  });

  it('uses Serper when configured and formats organic results', async () => {
    process.env.SERPER_API_KEY = 'serper-key';
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({
        organic: [
          {
            title: 'Jarvish architecture',
            link: 'https://example.test/jarvish',
            snippet: 'Agent graph notes',
          },
        ],
      }),
    } as Response);
    const { searchWeb } = await import('@/backend/services/tools/search.service');

    await expect(searchWeb({ query: 'jarvish' })).resolves.toBe(
      '[1] Jarvish architecture\nURL: https://example.test/jarvish\nSnippet: Agent graph notes\n',
    );
    expect(fetch).toHaveBeenCalledWith('https://google.serper.dev/search', expect.objectContaining({
      method: 'POST',
      headers: {
        'X-API-KEY': 'serper-key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: 'jarvish' }),
    }));
  });

  it('formats Serper empty results explicitly', async () => {
    process.env.SERPER_API_KEY = 'serper-key';
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ organic: [] }),
    } as Response);
    const { searchWeb } = await import('@/backend/services/tools/search.service');

    await expect(searchWeb({ query: 'nothing' })).resolves.toBe('No results found (Serper).');
  });

  it('formats Serper results with missing optional fields', async () => {
    process.env.SERPER_API_KEY = 'serper-key';
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({ organic: [{}] }),
    } as Response);
    const { searchWeb } = await import('@/backend/services/tools/search.service');

    await expect(searchWeb({ query: 'partial' })).resolves.toBe(
      '[1] Untitled result\nURL: Unavailable\nSnippet: No snippet\n',
    );
  });

  it('uses Google CSE when Serper is not configured', async () => {
    delete process.env.SERPER_API_KEY;
    process.env.GOOGLE_SEARCH_API_KEY = 'google-key';
    process.env.GOOGLE_SEARCH_CX = 'cx-id';
    googleSearchListMock.mockResolvedValueOnce({
      data: {
        items: [
          {
            title: 'Google result',
            link: 'https://example.test/google',
            snippet: 'From CSE',
          },
        ],
      },
    });
    const { searchWeb } = await import('@/backend/services/tools/search.service');

    await expect(searchWeb({ query: 'google' })).resolves.toBe(
      '[1] Google result\nURL: https://example.test/google\nSnippet: From CSE\n',
    );
    expect(googleSearchListMock).toHaveBeenCalledWith({
      cx: 'cx-id',
      q: 'google',
      auth: 'google-key',
    });
  });

  it('formats Google CSE empty results explicitly', async () => {
    delete process.env.SERPER_API_KEY;
    process.env.GOOGLE_SEARCH_API_KEY = 'google-key';
    process.env.GOOGLE_SEARCH_CX = 'cx-id';
    googleSearchListMock.mockResolvedValueOnce({ data: {} });
    const { searchWeb } = await import('@/backend/services/tools/search.service');

    await expect(searchWeb({ query: 'empty google' })).resolves.toBe('No results found (Google).');
  });
});
