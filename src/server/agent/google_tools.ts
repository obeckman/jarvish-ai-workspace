import { google } from 'googleapis';
import { FunctionDeclaration } from '@google/generative-ai';

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
  name: 'list_calendar_events',
  description: 'Lists upcoming events from the user\'s Google Calendar.',
  parameters: {
    type: 'OBJECT',
    properties: {
      maxResults: { type: 'NUMBER', description: 'Max results (default 10).' },
    }
  },
};

export const gmailSearchDeclaration: FunctionDeclaration = {
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

export const googleDocsDeclaration: FunctionDeclaration = {
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

// --- Execution Logic (Updated to take token) ---

export async function listCalendarEvents(accessToken: string, args: { maxResults?: number }) {
  const calendar = google.calendar({ version: 'v3', auth: getClient(accessToken) });
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: args.maxResults || 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return res.data.items || [];
}

export async function searchGmailMessages(accessToken: string, args: { query: string }) {
  const gmail = google.gmail({ version: 'v1', auth: getClient(accessToken) });
  const res = await gmail.users.messages.list({ userId: 'me', q: args.query, maxResults: 5 });
  if (!res.data.messages) return [];
  
  return Promise.all(res.data.messages.map(async (msg) => {
    const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'minimal' });
    return detail.data.snippet;
  }));
}

export async function getGoogleDocContent(accessToken: string, args: { documentId: string }) {
  const docs = google.docs({ version: 'v1', auth: getClient(accessToken) });
  const res = await docs.documents.get({ documentId: args.documentId });
  let content = '';
  res.data.body?.content?.forEach(e => e.paragraph?.elements?.forEach(el => {
    if (el.textRun?.content) content += el.textRun.content;
  }));
  return content;
}
