import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from "@/shared/jarvish.constants";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
const GOOGLE_CLIENT_ID_ERROR = 'Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID in the client environment.';
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

export const useGoogleAuth = () => {
  const [googleToken, setGoogleToken] = useState<string | null>(() => getStoredGoogleAccessToken());
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(() => getStoredGoogleIdToken());
  const [googleIdTokenExpiresAt, setGoogleIdTokenExpiresAt] = useState<number | null>(
    Number(localStorage.getItem(STORAGE_KEYS.GOOGLE_ID_TOKEN_EXPIRES_AT)) || null
  );
  const [expiresAt, setExpiresAt] = useState<number | null>(
    getStoredGoogleAccessTokenExpiresAt()
  );
  const [clientId] = useState<string | null>(GOOGLE_CLIENT_ID || null);
  const [authError, setAuthError] = useState<string | null>(null);

  const requestIdToken = useCallback((isSilent = false): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      setAuthError(null);
      if (!clientId) {
        setAuthError(GOOGLE_CLIENT_ID_ERROR);
        reject(GOOGLE_CLIENT_ID_ERROR);
        return;
      }

      try {
        const google = window.google;
        if (!google?.accounts?.id) {
          throw new Error("Google Identity Services are not loaded.");
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) {
              storeGoogleIdToken(response.credential);
              setGoogleIdToken(response.credential);
              setGoogleIdTokenExpiresAt(getJwtExpiryMs(response.credential));
              resolve(response.credential);
              return;
            }

            if (isSilent) {
              setGoogleIdToken(null);
              resolve(null);
              return;
            }

            const errorMsg = 'Google Sign-In did not return an ID token.';
            setAuthError(errorMsg);
            reject(errorMsg);
          },
          auto_select: isSilent,
        });
        google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            if (isSilent) {
              resolve(null);
              return;
            }

            const errorMsg = 'Google Sign-In prompt was not completed.';
            setAuthError(errorMsg);
            reject(errorMsg);
          }
        });
      } catch (e) {
        const errorMsg = `Failed to initialize Google Login: ${e instanceof Error ? e.message : 'Unknown error'}`;
        setAuthError(errorMsg);
        reject(errorMsg);
      }
    });
  }, [clientId]);

  const requestAccessToken = useCallback((isSilent = false): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      setAuthError(null);
      if (!clientId) {
        setAuthError(GOOGLE_CLIENT_ID_ERROR);
        reject(GOOGLE_CLIENT_ID_ERROR);
        return;
      }

      try {
        const google = window.google;
        if (!google?.accounts?.oauth2) {
          throw new Error("Google Identity Services are not loaded.");
        }

        const client = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/documents.readonly',
          prompt: isSilent ? 'none' : 'select_account',
          callback: (tokenResponse) => {
            if (tokenResponse.access_token) {
              const expiry = Date.now() + ((tokenResponse.expires_in ?? 3600) * 1000);
              localStorage.setItem(STORAGE_KEYS.GOOGLE_TOKEN, tokenResponse.access_token);
              localStorage.setItem('google_token_expires_at', String(expiry));
              if (tokenResponse.id_token) {
                storeGoogleIdToken(tokenResponse.id_token);
                setGoogleIdToken(tokenResponse.id_token);
                setGoogleIdTokenExpiresAt(getJwtExpiryMs(tokenResponse.id_token));
              }
              setGoogleToken(tokenResponse.access_token);
              setExpiresAt(expiry);
              resolve(tokenResponse.access_token);
            } else if (tokenResponse.error) {
              if (isSilent && tokenResponse.error === 'immediate_failed') {
                clearGoogleAccessToken();
                setGoogleToken(null);
                setExpiresAt(null);
                resolve(null); // Silent refresh failed, not an error that needs to stop everything
              } else {
                const errorMsg = `Google Auth Error: ${tokenResponse.error_description || tokenResponse.error}`;
                setAuthError(errorMsg);
                reject(errorMsg);
              }
            }
          },
        });
        client.requestAccessToken();
      } catch (e) {
        const errorMsg = `Failed to initialize Google Login: ${e instanceof Error ? e.message : 'Unknown error'}`;
        setAuthError(errorMsg);
        reject(errorMsg);
      }
    });
  }, [clientId]);

  const loginWithGoogle = useCallback(async (isSilent = false): Promise<string | null> => {
    const idToken = await requestIdToken(isSilent);
    await requestAccessToken(isSilent);
    return idToken;
  }, [requestAccessToken, requestIdToken]);

  const checkAndRefreshIdToken = useCallback(async () => {
    const storedToken = googleIdToken || getStoredGoogleIdToken();
    const expiry = googleIdTokenExpiresAt || Number(localStorage.getItem(STORAGE_KEYS.GOOGLE_ID_TOKEN_EXPIRES_AT)) || null;

    if (storedToken && expiry && Date.now() + TOKEN_EXPIRY_BUFFER_MS < expiry) {
      return storedToken;
    }

    clearGoogleIdToken();
    setGoogleIdToken(null);
    setGoogleIdTokenExpiresAt(null);

    try {
      return await requestIdToken(true);
    } catch (e) {
      console.error("[Auth] ID token refresh failed:", e);
      return null;
    }
  }, [googleIdToken, googleIdTokenExpiresAt, requestIdToken]);

  /**
   * checkAndRefreshToken
   * 
   * Checks if token is about to expire (within 5 mins) and attempts silent refresh.
   */
  const checkAndRefreshToken = useCallback(async () => {
    if (!googleToken || !expiresAt) {
      clearGoogleAccessToken();
      setGoogleToken(null);
      setExpiresAt(null);
      return null;
    }

    if (Date.now() + TOKEN_EXPIRY_BUFFER_MS < expiresAt) {
      return googleToken; // Still valid
    }

    clearGoogleAccessToken();
    setGoogleToken(null);
    setExpiresAt(null);
    console.log('[Auth] Token near expiration, attempting silent refresh...');
    try {
      const newToken = await requestAccessToken(true);
      return newToken;
    } catch (e) {
      console.error("[Auth] Silent refresh failed:", e);
      return null;
    }
  }, [googleToken, expiresAt, requestAccessToken]);

  const logout = useCallback(() => {
    clearGoogleAccessToken();
    clearGoogleIdToken();
    window.google?.accounts.id?.disableAutoSelect();
    setGoogleToken(null);
    setGoogleIdToken(null);
    setGoogleIdTokenExpiresAt(null);
    setExpiresAt(null);
    setAuthError(null);
  }, []);

  // One Tap Support
  useEffect(() => {
    if (googleIdToken || !clientId) return;

    const handleOneTapResponse = (response: GoogleCredentialResponse) => {
      if (response.credential) {
        storeGoogleIdToken(response.credential);
        setGoogleIdToken(response.credential);
        setGoogleIdTokenExpiresAt(getJwtExpiryMs(response.credential));
        void requestAccessToken(true);
      }
    };

    const initOneTap = () => {
      const googleId = window.google?.accounts?.id;
      if (googleId) {
        googleId.initialize({
          client_id: clientId,
          callback: handleOneTapResponse,
          auto_select: true,
        });
        googleId.prompt();
      }
    };

    const timer = setTimeout(initOneTap, 1000);
    return () => clearTimeout(timer);
  }, [clientId, googleIdToken, requestAccessToken]);

  return {
    googleToken,
    googleIdToken,
    clientId,
    authError,
    loginWithGoogle,
    logout,
    setAuthError,
    checkAndRefreshToken,
    checkAndRefreshIdToken
  };
};

function getStoredGoogleAccessToken(): string | null {
  const token = localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN);
  const expiresAt = getStoredGoogleAccessTokenExpiresAt();

  if (!token || !expiresAt || Date.now() + TOKEN_EXPIRY_BUFFER_MS >= expiresAt) {
    clearGoogleAccessToken();
    return null;
  }

  return token;
}

function getStoredGoogleAccessTokenExpiresAt(): number | null {
  return Number(localStorage.getItem('google_token_expires_at')) || null;
}

function clearGoogleAccessToken(): void {
  localStorage.removeItem(STORAGE_KEYS.GOOGLE_TOKEN);
  localStorage.removeItem('google_token_expires_at');
}

function getStoredGoogleIdToken(): string | null {
  const token = localStorage.getItem(STORAGE_KEYS.GOOGLE_ID_TOKEN);
  const expiresAt = Number(localStorage.getItem(STORAGE_KEYS.GOOGLE_ID_TOKEN_EXPIRES_AT)) || getJwtExpiryMs(token);

  if (!token || !expiresAt || Date.now() + TOKEN_EXPIRY_BUFFER_MS >= expiresAt) {
    clearGoogleIdToken();
    return null;
  }

  return token;
}

function storeGoogleIdToken(token: string): void {
  const expiresAt = getJwtExpiryMs(token);
  localStorage.setItem(STORAGE_KEYS.GOOGLE_ID_TOKEN, token);
  if (expiresAt) {
    localStorage.setItem(STORAGE_KEYS.GOOGLE_ID_TOKEN_EXPIRES_AT, String(expiresAt));
  } else {
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_ID_TOKEN_EXPIRES_AT);
  }
}

function clearGoogleIdToken(): void {
  localStorage.removeItem(STORAGE_KEYS.GOOGLE_ID_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.GOOGLE_ID_TOKEN_EXPIRES_AT);
}

function getJwtExpiryMs(token: string | null): number | null {
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return null;
    }

    const normalizedPayload = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decodedPayload = JSON.parse(atob(normalizedPayload));
    return typeof decodedPayload.exp === 'number' ? decodedPayload.exp * 1000 : null;
  } catch {
    return null;
  }
}
