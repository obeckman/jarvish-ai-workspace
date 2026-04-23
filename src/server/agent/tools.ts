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

// --- Tool Execution Logic ---

export async function executeInventoryCheck(args: InventoryCheckArgs): Promise<string> {
  console.log(`[Tool] Executing check_inventory for SKU: ${args.sku}`);
  const mockDb: Record<string, number> = { 'SHOE-123': 42, 'SHIRT-456': 0, 'HAT-789': 5 };
  const stock = mockDb[args.sku];
  return stock !== undefined ? (stock > 0 ? `In stock: ${stock} items available.` : 'Out of stock.') : 'SKU not found.';
}

export async function executeWebSearch(args: { query: string }): Promise<string> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;

  if (!apiKey || !cx) {
    return "Error: Google Search API Key or CX ID is missing in .env. Please provide GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX.";
  }

  const customsearch = google.customsearch('v1');
  try {
    const res = await customsearch.cse.list({ cx, q: args.query, auth: apiKey });
    const items = res.data.items || [];
    if (items.length === 0) return "No results found.";
    
    return items.map((item, i) => `[${i+1}] ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}\n`).join('\n');
  } catch (error: any) {
    return `Search failed: ${error.message}`;
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
