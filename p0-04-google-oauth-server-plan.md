# P0-04: Google OAuth Server-Side Remediation Plan

## Summary

This document records a known P0 security issue in the current Google OAuth integration and the planned remediation. It is a plan only; the OAuth migration described here has not been implemented yet.

## Current Issue

- `src/frontend/features/jarvishAgent/hooks/useGoogleAuth.ts` stores Google access tokens and token expiry in `localStorage`.
- The frontend sends the Google access token to the backend in a custom `x-google-token` header on GraphQL/SSE requests.
- The legacy `src/frontend/features/AgentChat/AgentChat.tsx` path also stores `google_access_token` in `localStorage`.

## Risk

- Google access tokens stored in `localStorage` can be read by injected JavaScript after an XSS issue.
- Browser extensions and other client-side runtime surfaces can also increase exposure risk.
- Gmail, Docs, and Calendar access requires a stronger auth posture than browser-owned access-token storage.

## Decision

- Do not implement the OAuth migration in this change.
- Planned fix: move Google OAuth to a backend-owned authorization-code flow.
- The frontend should only know whether the Google account is connected or disconnected.
- The backend should store Google credentials and refresh tokens server-side, encrypted at rest.
- Google API calls should use server-resolved credentials for the authenticated user instead of a browser-supplied access token.

## Expected UX Effects

- The Google connect button redirects to, or opens, the Google consent flow.
- Connected state comes from a backend status endpoint rather than token presence in browser storage.
- Disconnect deletes server-side Google credentials for the authenticated user.
- If backend OAuth configuration is missing, the UI should show: `Google connection unavailable`.
- Agent requests should no longer expose Google access tokens in request headers.

## Backend And Config Effects

- Add server-only environment variables:
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_OAUTH_REDIRECT_URI`
  - `GOOGLE_TOKEN_ENCRYPTION_KEY`
- Add encrypted credential storage keyed by authenticated user ID.
- Remove `x-google-token` from frontend GraphQL/SSE requests.
- Remove `x-google-token` reads from backend GraphQL resolvers.
- Update Google tool execution to resolve and refresh Google credentials server-side before calling Gmail, Calendar, or Docs APIs.

## Google Cloud Setup

- Configure the OAuth consent screen in Google Cloud.
- Create an OAuth Client ID with application type `Web application`.
- Add authorized redirect URIs for local and production callbacks, for example:
  - `http://localhost:3000/api/google/oauth/callback`
  - `https://<production-domain>/api/google/oauth/callback`
- Enable the required APIs:
  - Gmail API
  - Google Calendar API
  - Google Docs API
- Add test users while the app is in testing mode.
- Note that Gmail scopes may require Google verification before the app can be used broadly by external users.

## Future Verification Criteria

- No Google access tokens are written to `localStorage`.
- No `x-google-token` header is sent by the frontend.
- OAuth state validation is covered by tests.
- Token encryption, decryption, and refresh behavior are covered by tests.
- README environment documentation includes the new server-side OAuth variables.
- README or docs include a privacy and scopes note for Google account connection.

## Done When Implemented

- The frontend no longer stores or transmits Google access tokens.
- The backend owns Google OAuth token exchange, storage, refresh, and revocation.
- Google API access still works for connected users.
- Missing OAuth backend configuration fails closed with a clear UI message.
