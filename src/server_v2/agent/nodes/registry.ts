/**
 * Tool Registry
 * This file centralizes the declarations of all capabilities available to the agent.
 * We follow the Gemini Function Declaration schema.
 */

import { TOOL_NAMES } from "../constants";

export const queryAttachmentsDeclaration = {
  name: TOOL_NAMES.QUERY_ATTACHMENTS,
  description: 'Searches through the AI-extracted text versions of the currently uploaded attachments.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'What to look for in the uploaded documents.' },
    },
    required: ['query'],
  },
};

export const inventoryToolDeclaration = {
  name: TOOL_NAMES.CHECK_INVENTORY,
  description: 'Checks the live inventory status for a specific product SKU.',
  parameters: {
    type: "object",
    properties: {
      sku: {
        type: "string",
        description: 'The exact SKU of the product to check (e.g., "SHOE-123").',
      },
    },
    required: ['sku'],
  },
};

export const webSearchDeclaration = {
  name: TOOL_NAMES.WEB_SEARCH,
  description: 'Searches the web for information using Google Search.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query.' },
    },
    required: ['query'],
  },
};

export const fetchWebPageDeclaration = {
  name: TOOL_NAMES.FETCH_WEB_PAGE,
  description: 'Reads the text content of a specific URL.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to fetch.' },
    },
    required: ['url'],
  },
};

export const readPdfDeclaration = {
  name: TOOL_NAMES.READ_PDF,
  description: 'Extracts text from a PDF file at a given URL.',
  parameters: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL of the PDF file.' },
    },
    required: ['url'],
  },
};

export const readFileDeclaration = {
  name: TOOL_NAMES.READ_FILE,
  description: 'Reads the content of a local file within the project.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The relative path to the file.' },
    },
    required: ['path'],
  },
};

export const writeFileDeclaration = {
  name: TOOL_NAMES.WRITE_FILE,
  description: 'Writes content to a local file within the project.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'The relative path where the file will be written.' },
      content: { type: 'string', description: 'The content to write into the file.' },
    },
    required: ['path', 'content'],
  },
};

export const addMemoryDeclaration = {
  name: TOOL_NAMES.ADD_MEMORY,
  description: 'Saves a specific fact or information to long-term memory.',
  parameters: {
    type: 'object',
    properties: {
      fact: { type: 'string', description: 'The fact or information to remember.' },
      category: { type: 'string', description: 'Optional category (e.g., "personal", "work").' },
    },
    required: ['fact'],
  },
};

export const forgetMemoryDeclaration = {
  name: "forget_memory",
  description: 'Removes a specific memory by its ID. Use this when the user wants you to forget something or when information is outdated.',
  parameters: {
    type: 'object',
    properties: {
      memoryId: { type: 'string', description: 'The unique ID of the memory to remove.' },
    },
    required: ['memoryId'],
  },
};

export const googleCalendarDeclaration = {
  name: TOOL_NAMES.LIST_CALENDAR,
  description: 'Lists upcoming events from the user\'s Google Calendar.',
  parameters: {
    type: 'object',
    properties: {
      maxResults: { type: 'number', description: 'Max results (default 10).' },
    }
  },
};

export const gmailSearchDeclaration = {
  name: TOOL_NAMES.SEARCH_GMAIL,
  description: 'Searches Gmail messages.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search query.' },
    },
    required: ['query'],
  },
};

export const googleDocsDeclaration = {
  name: TOOL_NAMES.GET_GOOGLE_DOC,
  description: 'Reads a Google Doc.',
  parameters: {
    type: 'object',
    properties: {
      documentId: { type: 'string', description: 'Doc ID.' }
    },
    required: ['documentId'],
  },
};
