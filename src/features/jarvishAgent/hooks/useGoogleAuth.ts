import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS } from "@/shared/jarvish.constants";

export const useGoogleAuth = () => {
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN));
  const [expiresAt, setExpiresAt] = useState<number | null>(
    Number(localStorage.getItem('google_token_expires_at')) || null
  );
  const [clientId, setClientId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // ... (fetchConfig effect)

  const loginWithGoogle = useCallback((isSilent = false): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      setAuthError(null);
      if (!clientId) {
        reject("Google Client ID not set.");
        return;
      }

      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/documents.readonly',
          prompt: isSilent ? 'none' : 'select_account',
          callback: (tokenResponse: any) => {
            if (tokenResponse.access_token) {
              const expiry = Date.now() + (tokenResponse.expires_in * 1000);
              localStorage.setItem(STORAGE_KEYS.GOOGLE_TOKEN, tokenResponse.access_token);
              localStorage.setItem('google_token_expires_at', String(expiry));
              setGoogleToken(tokenResponse.access_token);
              setExpiresAt(expiry);
              resolve(tokenResponse.access_token);
            } else if (tokenResponse.error) {
              if (isSilent && tokenResponse.error === 'immediate_failed') {
                setGoogleToken(null);
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

  /**
   * checkAndRefreshToken
   * 
   * Checks if token is about to expire (within 5 mins) and attempts silent refresh.
   */
  const checkAndRefreshToken = useCallback(async () => {
    if (!googleToken || !expiresAt) return null;

    const buffer = 5 * 60 * 1000; // 5 minutes
    if (Date.now() + buffer < expiresAt) {
      return googleToken; // Still valid
    }

    console.log('[Auth] Token near expiration, attempting silent refresh...');
    try {
      const newToken = await loginWithGoogle(true);
      return newToken;
    } catch (e) {
      console.error("[Auth] Silent refresh failed:", e);
      return null;
    }
  }, [googleToken, expiresAt, loginWithGoogle]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_TOKEN);
    localStorage.removeItem('google_token_expires_at');
    setGoogleToken(null);
    setExpiresAt(null);
    setAuthError(null);
  }, []);

  // One Tap Support
  useEffect(() => {
    if (googleToken || !clientId) return;

    const handleOneTapResponse = (response: any) => {
      if (response.credential) {
        loginWithGoogle();
      }
    };

    const initOneTap = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleOneTapResponse,
          auto_select: true,
        });
        (window as any).google.accounts.id.prompt();
      }
    };

    const timer = setTimeout(initOneTap, 1000);
    return () => clearTimeout(timer);
  }, [googleToken, clientId, loginWithGoogle]);

  return {
    googleToken,
    clientId,
    authError,
    loginWithGoogle,
    logout,
    setAuthError,
    checkAndRefreshToken
  };
};
