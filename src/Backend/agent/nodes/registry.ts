/**
 * Tool Registry
 * This file centralizes the declarations of all capabilities available to the agent.
 * We follow the Gemini Function Declaration schema.
 */

import { TOOL_NAMES } from "@/shared/jarvish.constants";
import { SchemaType, type FunctionDeclaration } from "@google/generative-ai";

export const queryAttachmentsDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.QUERY_ATTACHMENTS,
  description: 'Searches through the AI-extracted text versions of the currently uploaded attachments.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'What to look for in the uploaded documents.' },
    },
    required: ['query'],
  },
};

export const inventoryToolDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.CHECK_INVENTORY,
  description: 'Checks the live inventory status for a specific product SKU.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      sku: {
        type: SchemaType.STRING,
        description: 'The exact SKU of the product to check (e.g., "SHOE-123").',
      },
    },
    required: ['sku'],
  },
};

export const webSearchDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.WEB_SEARCH,
  description: 'Searches the web for information using Google Search.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'The search query.' },
    },
    required: ['query'],
  },
};

export const fetchWebPageDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.FETCH_WEB_PAGE,
  description: 'Reads the text content of a specific URL.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: { type: SchemaType.STRING, description: 'The URL to fetch.' },
    },
    required: ['url'],
  },
};

export const readPdfDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.READ_PDF,
  description: 'Extracts text from a PDF file at a given URL.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      url: { type: SchemaType.STRING, description: 'The URL of the PDF file.' },
    },
    required: ['url'],
  },
};

export const readFileDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.READ_FILE,
  description: 'Reads the content of a local file within the project.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: { type: SchemaType.STRING, description: 'The relative path to the file.' },
    },
    required: ['path'],
  },
};

export const writeFileDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.WRITE_FILE,
  description: 'Writes content to a local file within the project.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      path: { type: SchemaType.STRING, description: 'The relative path where the file will be written.' },
      content: { type: SchemaType.STRING, description: 'The content to write into the file.' },
    },
    required: ['path', 'content'],
  },
};

export const addMemoryDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.ADD_MEMORY,
  description: 'Saves a specific fact or information to long-term memory.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      fact: { type: SchemaType.STRING, description: 'The fact or information to remember.' },
      category: { type: SchemaType.STRING, description: 'Optional category (e.g., "personal", "work").' },
    },
    required: ['fact'],
  },
};

export const forgetMemoryDeclaration: FunctionDeclaration = {
  name: "forget_memory",
  description: 'Removes a specific memory by its ID. Use this when the user wants you to forget something or when information is outdated.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      memoryId: { type: SchemaType.STRING, description: 'The unique ID of the memory to remove.' },
    },
    required: ['memoryId'],
  },
};

export const googleCalendarDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.LIST_CALENDAR,
  description: 'Lists upcoming events from the user\'s Google Calendar.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      maxResults: { type: SchemaType.NUMBER, description: 'Max results (default 10).' },
    }
  },
};

export const gmailSearchDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.SEARCH_GMAIL,
  description: 'Searches Gmail messages.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'Search query.' },
    },
    required: ['query'],
  },
};

export const googleDocsDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.GET_GOOGLE_DOC,
  description: 'Reads a Google Doc.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      documentId: { type: SchemaType.STRING, description: 'Doc ID.' }
    },
    required: ['documentId'],
  },
};

export const updateGoogleDocDeclaration: FunctionDeclaration = {
  name: TOOL_NAMES.UPDATE_GOOGLE_DOC,
  description: 'Appends or replaces content in a Google Doc.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      documentId: { type: SchemaType.STRING, description: 'Doc ID.' },
      content: { type: SchemaType.STRING, description: 'Text to add/update.' },
      append: { type: SchemaType.BOOLEAN, description: 'If true, appends to the end. Defaults to true.' }
    },
    required: ['documentId', 'content'],
  },
};
