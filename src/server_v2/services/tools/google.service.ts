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
  try {
    const calendar = google.calendar({ version: 'v3', auth: getOAuth2Client(accessToken) });
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: args.maxResults || 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items || [];
  } catch (error: any) {
    console.error(`[Google Service Error] listCalendarEvents failed:`, error.message);
    if (error.code === 401 || error.status === 401) {
      return "ERROR: Google authentication has expired or is invalid. Please log out and log in again to refresh your access.";
    }
    return `ERROR: Failed to access Google Calendar: ${error.message}`;
  }
}

/**
 * Searches for relevant Gmail messages and returns their snippets.
 * 
 * @param accessToken User's Google auth token.
 * @param args Contains the search query.
 */
export async function searchGmailMessages(accessToken: string, args: { query: string }) {
  try {
    const gmail = google.gmail({ version: 'v1', auth: getOAuth2Client(accessToken) });
    const res = await gmail.users.messages.list({ userId: 'me', q: args.query, maxResults: 5 });
    
    if (!res.data.messages) return [];
    
    return Promise.all(res.data.messages.map(async (msg) => {
      const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'minimal' });
      return {
        id: msg.id,
        snippet: detail.data.snippet,
        threadId: detail.data.threadId
      };
    }));
  } catch (error: any) {
    console.error(`[Google Service Error] searchGmailMessages failed:`, error.message);
    if (error.code === 401 || error.status === 401) {
      return "ERROR: Google authentication has expired or is invalid. Please log out and log in again to refresh your access.";
    }
    return `ERROR: Failed to search Gmail: ${error.message}`;
  }
}

/**
 * Extracts all text content from a Google Document.
 * 
 * @param accessToken User's Google auth token.
 * @param args Contains the Document ID.
 */
export async function getGoogleDocContent(accessToken: string, args: { documentId: string }) {
  try {
    const docs = google.docs({ version: 'v1', auth: getOAuth2Client(accessToken) });
    const res = await docs.documents.get({ documentId: args.documentId });
    
    let content = '';
    res.data.body?.content?.forEach(element => {
      element.paragraph?.elements?.forEach(part => {
        if (part.textRun?.content) content += part.textRun.content;
      });
    });
    
    return content;
  } catch (error: any) {
    console.error(`[Google Service Error] getGoogleDocContent failed:`, error.message);
    if (error.code === 401 || error.status === 401) {
      return "ERROR: Google authentication has expired or is invalid. Please log out and log in again to refresh your access.";
    }
    return `ERROR: Failed to access Google Doc: ${error.message}`;
  }
}

/**
 * Appends or replaces text in a Google Document.
 */
export async function updateGoogleDoc(accessToken: string, args: { documentId: string, content: string, append?: boolean }) {
  try {
    const docs = google.docs({ version: 'v1', auth: getOAuth2Client(accessToken) });
    
    const requests: any[] = [];
    if (!args.append) {
      // For simplicity, we just append in this implementation, 
      // but in a full version we might replace or insert at specific indices.
    }
    
    requests.push({
      insertText: {
        text: args.content,
        endOfSegmentLocation: {}
      }
    });

    await docs.documents.batchUpdate({
      documentId: args.documentId,
      requestBody: { requests }
    });

    return `Successfully updated Google Doc: ${args.documentId}`;
  } catch (error: any) {
    console.error(`[Google Service Error] updateGoogleDoc failed:`, error.message);
    return `ERROR: Failed to update Google Doc: ${error.message}`;
  }
}
