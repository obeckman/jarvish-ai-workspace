export const QUERY_KEYS = {
  USER_PROFILE: ['hidingLag', 'userProfile'],
} as const;

// How long after a write the client keeps reading from the primary.
// Must cover the replica's worst-case lag (the demo server lags 3s).
export const RYOW_WINDOW_MS = 5000;
