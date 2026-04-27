/**
 * Tool Registry
 * This file centralizes the declarations of all capabilities available to the agent.
 * We follow the Gemini Function Declaration schema.
 */

export const inventoryToolDeclaration = {
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

export const webSearchDeclaration = {
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

export const fetchWebPageDeclaration = {
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

export const readPdfDeclaration = {
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

export const readFileDeclaration = {
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

export const addMemoryDeclaration = {
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

export const googleCalendarDeclaration = {
  name: 'list_calendar_events',
  description: 'Lists upcoming events from the user\'s Google Calendar.',
  parameters: {
    type: 'OBJECT',
    properties: {
      maxResults: { type: 'NUMBER', description: 'Max results (default 10).' },
    }
  },
};

export const gmailSearchDeclaration = {
  name: 'search_gmail_messages',
  description: 'Searches Gmail messages.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: { type: 'STRING', description: 'Search query.' },
    },
    required: ['query'],
  },
};

export const googleDocsDeclaration = {
  name: 'get_google_doc_content',
  description: 'Reads a Google Doc.',
  parameters: {
    type: 'OBJECT',
    properties: {
      documentId: { type: 'STRING', description: 'Doc ID.' }
    },
    required: ['documentId'],
  },
};
