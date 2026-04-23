import { FunctionDeclaration } from '@google/generative-ai';
import { google } from 'googleapis';
import { PDFParse } from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';
import { addMemory } from './memory.js';

export interface InventoryCheckArgs {
  sku: string;
}

// --- Tool Declarations ---

export const inventoryToolDeclaration: FunctionDeclaration = {
  name: 'check_inventory',
  description: 'Checks the live inventory status for a specific product SKU.',
  parameters: {
    type: "OBJECT",
    properties: {
      sku: {
        type: "STRING",
        description: 'The exact SKU of the product to check (e.g., "SHOE-123").',
      },
    },
    required: ['sku'],
  },
};

export const webSearchDeclaration: FunctionDeclaration = {
  name: 'web_search',
  description: 'Searches the web for information using Google Search.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING', description: 'The search query.' },
    },
    required: ['query'],
  },
};

export const fetchWebPageDeclaration: FunctionDeclaration = {
  name: 'fetch_web_page',
  description: 'Reads the text content of a specific URL.',
  parameters: {
    type: 'OBJECT',
    properties: {
      url: { type: 'STRING', description: 'The URL to fetch.' },
    },
    required: ['url'],
  },
};

export const readPdfDeclaration: FunctionDeclaration = {
  name: 'read_pdf',
  description: 'Extracts text from a PDF file at a given URL.',
  parameters: {
    type: 'OBJECT',
    properties: {
      url: { type: 'STRING', description: 'The URL of the PDF file.' },
    },
    required: ['url'],
  },
};

export const readFileDeclaration: FunctionDeclaration = {
  name: 'read_file',
  description: 'Reads the content of a local file within the project.',
  parameters: {
    type: 'OBJECT',
    properties: {
      path: { type: 'STRING', description: 'The relative path to the file.' },
    },
    required: ['path'],
  },
};

export const addMemoryDeclaration: FunctionDeclaration = {
  name: 'add_to_memory',
  description: 'Saves a specific fact or information to long-term memory.',
  parameters: {
    type: 'OBJECT',
    properties: {
      fact: { type: 'STRING', description: 'The fact or information to remember.' },
      category: { type: 'STRING', description: 'Optional category (e.g., "personal", "work").' },
    },
    required: ['fact'],
  },
};

// --- Search Provider Abstraction ---

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

interface SearchProvider {
  search(query: string): Promise<string>;
}

/**
 * Google Custom Search Implementation
 * Best for: Searching specific domains/sites.
 */
class GoogleCSEProvider implements SearchProvider {
  async search(query: string): Promise<string> {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_SEARCH_CX;
    if (!apiKey || !cx) return "Error: Google Search config missing.";

    const customsearch = google.customsearch('v1');
    const res = await customsearch.cse.list({ cx, q: query, auth: apiKey });
    const items = res.data.items || [];
    if (items.length === 0) return "No results found (Google).";
    
    return items.map((item, i) => `[${i+1}] ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}\n`).join('\n');
  }
}

/**
 * Serper.dev Implementation
 * Best for: Unrestricted, open web research.
 */
class SerperProvider implements SearchProvider {
  async search(query: string): Promise<string> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) return "Error: Serper API Key missing.";

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query }),
    });

    const data = await response.json();
    const items = data.organic || [];
    if (items.length === 0) return "No results found (Serper).";

    return items.map((item: any, i: number) => `[${i+1}] ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}\n`).join('\n');
  }
}

/**
 * Factory to pick the best search provider based on available keys.
 */
function getSearchProvider(): SearchProvider {
  if (process.env.SERPER_API_KEY) {
    console.log("[Search] Using Serper.dev (Open Web)");
    return new SerperProvider();
  }
  if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) {
    console.log("[Search] Using Google CSE (Site-specific)");
    return new GoogleCSEProvider();
  }
  throw new Error("No search provider configured. Add SERPER_API_KEY or GOOGLE_SEARCH keys to .env.");
}

// --- Tool Execution Logic ---

export async function executeInventoryCheck(args: InventoryCheckArgs): Promise<string> {
  console.log(`[Tool] Executing check_inventory for SKU: ${args.sku}`);
  const mockDb: Record<string, number> = { 'SHOE-123': 42, 'SHIRT-456': 0, 'HAT-789': 5 };
  const stock = mockDb[args.sku];
  return stock !== undefined ? (stock > 0 ? `In stock: ${stock} items available.` : 'Out of stock.') : 'SKU not found.';
}

export async function executeWebSearch(args: { query: string }): Promise<string> {
  try {
    const provider = getSearchProvider();
    return await provider.search(args.query);
  } catch (error: any) {
    return `Search failed: ${error.message}. Please provide SERPER_API_KEY or Google Search keys in .env.`;
  }
}

export async function executeFetchWebPage(args: { url: string }): Promise<string> {
  try {
    const response = await fetch(args.url);
    const html = await response.text();
    // Very basic tag stripping to reduce tokens
    const text = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
                     .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
                     .replace(/<[^>]+>/g, ' ')
                     .replace(/\s+/g, ' ')
                     .trim();
    return text.substring(0, 5000); // Limit to 5k chars for context
  } catch (error: any) {
    return `Failed to fetch page: ${error.message}`;
  }
}

export async function executeReadPdf(args: { url: string }): Promise<string> {
  try {
    const response = await fetch(args.url);
    const arrayBuffer = await response.arrayBuffer();
    const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text.substring(0, 10000); // Limit to 10k chars
  } catch (error: any) {
    return `Failed to read PDF: ${error.message}`;
  }
}

export async function executeReadFile(args: { path: string }): Promise<string> {
  try {
    // Basic security check: resolve path and ensure it's within CWD
    const fullPath = path.resolve(process.cwd(), args.path);
    if (!fullPath.startsWith(process.cwd())) {
      return "Error: Access denied. Paths must be within the project directory.";
    }
    const content = await fs.readFile(fullPath, 'utf-8');
    return content.substring(0, 10000);
  } catch (error: any) {
    return `Failed to read file: ${error.message}`;
  }
}

export async function executeAddMemory(args: { fact: string, category?: string }): Promise<string> {
  try {
    await addMemory(args.fact, { category: args.category || 'general', timestamp: new Date().toISOString() });
    return "Fact successfully saved to long-term memory.";
  } catch (error: any) {
    return `Failed to save memory: ${error.message}`;
  }
}
