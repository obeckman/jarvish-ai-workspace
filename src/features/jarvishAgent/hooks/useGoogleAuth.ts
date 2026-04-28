import { useState, useCallback, useEffect } from 'react';
import { STORAGE_KEYS, API_ENDPOINTS } from '@/features/jarvishAgent/constants';

export const useGoogleAuth = () => {
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN));
  const [clientId, setClientId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(API_ENDPOINTS.CONFIG);
        const data = await res.json();
        if (data.googleClientId) {
          setClientId(data.googleClientId);
        }
      } catch (e) {
        console.error('Failed to fetch server config:', e);
      }
    };
    fetchConfig();
  }, []);

  const loginWithGoogle = useCallback(() => {
    setAuthError(null);
    if (!clientId) {
      return setAuthError('Google Client ID not loaded from server.');
    }

    if (!(window as any).google) {
      return setAuthError('Google Identity Services SDK not loaded.');
    }
    
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/documents.readonly',
        callback: (tokenResponse: any) => {
          if (tokenResponse.access_token) {
            localStorage.setItem(STORAGE_KEYS.GOOGLE_TOKEN, tokenResponse.access_token);
            setGoogleToken(tokenResponse.access_token);
          } else if (tokenResponse.error) {
            setAuthError(`Google Auth Error: ${tokenResponse.error_description || tokenResponse.error}`);
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      setAuthError(`Failed to initialize Google Login: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [clientId]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.GOOGLE_TOKEN);
    setGoogleToken(null);
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
