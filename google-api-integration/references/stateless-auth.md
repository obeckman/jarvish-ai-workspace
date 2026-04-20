# Stateless Google API Architecture

This architecture enables backend access to Google APIs without storing long-lived secrets or managing complex OAuth2 state on the server.

## Overview

1.  **Frontend**: Uses Google Identity Services (GSI) SDK to perform an "Implicit Flow" and obtain a temporary `access_token`.
2.  **Request**: The client sends this token to the backend in a custom header (e.g., `x-google-token`).
3.  **Backend**: The server creates a transient `OAuth2` client using only this token and calls Google APIs directly.

## Frontend Implementation (React)

### 1. Load SDK in `index.html`
```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### 2. Request Token
```typescript
const client = window.google.accounts.oauth2.initTokenClient({
  client_id: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  scope: 'https://www.googleapis.com/auth/calendar.readonly ...',
  callback: (tokenResponse) => {
    if (tokenResponse.access_token) {
      // Use this token for backend calls
    }
  },
});
client.requestAccessToken();
```

## Backend Implementation (Node.js)

### 1. Create Transient Client
```typescript
import { google } from 'googleapis';

function getGoogleClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return oauth2Client;
}
```

### 2. Use in Agent Tools
Pass the `accessToken` from the request headers directly into your tool execution logic.
