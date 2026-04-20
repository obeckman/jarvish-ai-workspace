import { google } from 'googleapis';
import { FunctionDeclaration } from '@google/generative-ai';

/**
 * Helper to create an authorized client on the fly using the user's token.
 */
function getClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

// --- Tool Declarations ---

export const gmailSearchDeclaration: FunctionDeclaration = {
  name: 'search_gmail_messages',
  description: 'Searches for messages in the user\'s Gmail account using a query string.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: {
        type: 'STRING',
        description: 'Gmail search query (e.g., "from:someone@example.com").',
      },
    },
    required: ['query'],
  },
};

// --- Execution Logic ---

export async function searchGmailMessages(accessToken: string, args: { query: string }) {
  const gmail = google.gmail({ version: 'v1', auth: getClient(accessToken) });
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: args.query,
    maxResults: 5,
  });
  
  if (!res.data.messages) return [];
  
  return Promise.all(res.data.messages.map(async (msg) => {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'minimal'
    });
    return detail.data.snippet;
  }));
}
