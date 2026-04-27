import { google } from 'googleapis';

/**
 * Creates an authorized OAuth2 client using a temporary user access token.
 * 
 * @param accessToken The Bearer token received from the frontend login.
 */
function getOAuth2Client(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}

/**
 * Lists upcoming events from the user's Primary Google Calendar.
 * 
 * @param accessToken User's Google auth token.
 * @param args Contains optional maxResults parameter.
 */
export async function listCalendarEvents(accessToken: string, args: { maxResults?: number }) {
  const calendar = google.calendar({ version: 'v3', auth: getOAuth2Client(accessToken) });
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: args.maxResults || 10,
    singleEvents: true,
    orderBy: 'startTime',
  });
  return res.data.items || [];
}

/**
 * Searches for relevant Gmail messages and returns their snippets.
 * 
 * @param accessToken User's Google auth token.
 * @param args Contains the search query.
 */
export async function searchGmailMessages(accessToken: string, args: { query: string }) {
  const gmail = google.gmail({ version: 'v1', auth: getOAuth2Client(accessToken) });
  const res = await gmail.users.messages.list({ userId: 'me', q: args.query, maxResults: 5 });
  
  if (!res.data.messages) return [];
  
  return Promise.all(res.data.messages.map(async (msg) => {
    const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'minimal' });
    return detail.data.snippet;
  }));
}

/**
 * Extracts all text content from a Google Document.
 * 
 * @param accessToken User's Google auth token.
 * @param args Contains the Document ID.
 */
export async function getGoogleDocContent(accessToken: string, args: { documentId: string }) {
  const docs = google.docs({ version: 'v1', auth: getOAuth2Client(accessToken) });
  const res = await docs.documents.get({ documentId: args.documentId });
  
  let content = '';
  res.data.body?.content?.forEach(element => {
    element.paragraph?.elements?.forEach(part => {
      if (element.textRun?.content) content += element.textRun.content;
      // Also handle nested elements if necessary
      if (part.textRun?.content) content += part.textRun.content;
    });
  });
  
  return content;
}
