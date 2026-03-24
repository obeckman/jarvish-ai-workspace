import { google } from 'googleapis';
import 'dotenv/config';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/documents.readonly'
];

// In-memory token storage (for prototype/demo purposes)
let globalTokens: any = null;

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

export async function setTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  globalTokens = tokens;
  oauth2Client.setCredentials(tokens);
  return tokens;
}

export async function getAuthorizedClient() {
  if (!globalTokens) {
    throw new Error('Not authenticated with Google. Please login.');
  }
  oauth2Client.setCredentials(globalTokens);
  return oauth2Client;
}

export function isGoogleAuthenticated() {
  return !!globalTokens;
}
