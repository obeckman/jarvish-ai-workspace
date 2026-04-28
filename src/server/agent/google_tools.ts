import { google } from 'googleapis';
import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { TOOL_NAMES } from '../../shared/jarvish.constants';

/**
 * Helper to create an authorized client on the fly using the user's token.
 * No Client Secret required for this!
 */
function getClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

// --- Tool Declarations --- (Remain the same)
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

// --- Execution Logic (Updated to take token) ---

export async function listCalendarEvents(accessToken: string, args: { maxResults?: number }) {
  try {
    const oauth2Client = getClient(accessToken);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: args.maxResults || 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items || [];
  } catch (error: any) {
    console.error(`[Google Tool Error] listCalendarEvents failed:`, error.message);
    if (error.response?.data) {
      console.error(`Response Data:`, JSON.stringify(error.response.data));
    }
    
    if (error.code === 401 || error.status === 401) {
      return "ERROR: Google authentication has expired or is invalid. Please log out and log in again to refresh your access.";
    }
    if (error.code === 403 || error.status === 403) {
      return "ERROR: Access to Google Calendar was denied. Please ensure you have granted the 'calendar.events.readonly' permission.";
    }
    return `ERROR: Failed to access Google Calendar: ${error.message}`;
  }
}

export async function searchGmailMessages(accessToken: string, args: { query: string }) {
  try {
    const gmail = google.gmail({ version: 'v1', auth: getClient(accessToken) });
    const res = await gmail.users.messages.list({ userId: 'me', q: args.query, maxResults: 5 });
    if (!res.data.messages) return [];
    
    return await Promise.all(res.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'minimal' });
      return detail.data.snippet;
    }));
  } catch (error: any) {
    console.error(`[Google Tool Error] searchGmailMessages failed:`, error.message);
    throw error;
  }
}

export async function getGoogleDocContent(accessToken: string, args: { documentId: string }) {
  try {
    const docs = google.docs({ version: 'v1', auth: getClient(accessToken) });
    const res = await docs.documents.get({ documentId: args.documentId });
    let content = '';
    res.data.body?.content?.forEach(e => e.paragraph?.elements?.forEach(el => {
      if (el.textRun?.content) content += el.textRun.content;
    }));
    return content;
  } catch (error: any) {
    console.error(`[Google Tool Error] getGoogleDocContent failed:`, error.message);
    throw error;
  }
}
