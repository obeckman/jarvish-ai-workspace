import { google } from 'googleapis';
import { getToolErrorMessage } from './tool-error';

/**
 * Common interface for any web search engine.
 */
interface SearchProvider {
  search(query: string): Promise<string>;
}

type SerperSearchResponse = {
  organic?: SearchResultItem[];
};

type SearchResultItem = {
  title?: string | null;
  link?: string | null;
  snippet?: string | null;
};

/**
 * Google Custom Search (CSE) Implementation.
 * Best for: Searching within specific trusted domains.
 */
class GoogleCSEProvider implements SearchProvider {
  async search(query: string): Promise<string> {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;
    
    if (!apiKey || !cx) return "Error: Google Search configuration (API Key or CX) is missing.";

    const customsearch = google.customsearch('v1');
    const res = await customsearch.cse.list({ cx, q: query, auth: apiKey });
    const items = res.data.items || [];
    
    if (items.length === 0) return "No results found (Google).";
    
    return items.map((item, i) => `[${i+1}] ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}\n`).join('\n');
  }
}

/**
 * Serper.dev Implementation.
 * Best for: General, unrestricted web research.
 */
class SerperProvider implements SearchProvider {
  async search(query: string): Promise<string> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return "Error: Serper API Key is missing.";

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    });

    const data = await response.json() as SerperSearchResponse;
    const items = data.organic || [];
    
    if (items.length === 0) return "No results found (Serper).";

    return items.map(formatSearchResult).join('\n');
  }
}

/**
 * Factory to determine the best provider based on environment variables.
 */
function getSearchProvider(): SearchProvider {
  if (process.env.SERPER_API_KEY) {
    return new SerperProvider();
  }
  if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
    return new GoogleCSEProvider();
  }
  throw new Error("No search provider configured. Please add SERPER_API_KEY or Google Search keys to your .env file.");
}

/**
 * Orchestrates a web search using the best available provider.
 * 
 * @param args Contains the search query.
 * @returns A formatted string of search results.
 */
export async function searchWeb(args: { query: string }): Promise<string> {
  try {
    const provider = getSearchProvider();
    return await provider.search(args.query);
  } catch (error: unknown) {
    return `Search failed: ${getToolErrorMessage(error)}`;
  }
}

function formatSearchResult(item: SearchResultItem, index: number): string {
  return `[${index + 1}] ${item.title || "Untitled result"}\nURL: ${item.link || "Unavailable"}\nSnippet: ${item.snippet || "No snippet"}\n`;
}
