import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS, API_ENDPOINTS } from '@/features/jarvishAgent/constants';

export const useGoogleAuth = () => {
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN));
  const [expiresAt, setExpiresAt] = useState<number | null>(
    Number(localStorage.getItem('google_token_expires_at')) || null
  );
  const [clientId, setClientId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // ... (fetchConfig effect)

  const loginWithGoogle = useCallback((isSilent = false) => {
    setAuthError(null);
    if (!clientId) return;

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
          } else if (tokenResponse.error) {
            if (isSilent && tokenResponse.error === 'immediate_failed') {
               // Silent refresh failed, user needs to re-interact
               setGoogleToken(null);
            } else {
              setAuthError(`Google Auth Error: ${tokenResponse.error_description || tokenResponse.error}`);
            }
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      setAuthError(`Failed to initialize Google Login: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
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
    loginWithGoogle(true);
    
    // Wait for the state to update (short polling for simplicity in hook)
    return new Promise<string | null>((resolve) => {
      let attempts = 0;
      const interval = setInterval(() => {
        const currentToken = localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN);
        const currentExpiry = Number(localStorage.getItem('google_token_expires_at'));
        if (currentExpiry > Date.now() + buffer) {
          clearInterval(interval);
          resolve(currentToken);
        }
        if (++attempts > 10) { // 2 seconds timeout
          clearInterval(interval);
          resolve(null);
        }
      }, 200);
    });
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
    setAuthError
  };
};
