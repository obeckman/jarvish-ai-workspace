interface GoogleOAuthTokenResponse {
  access_token?: string;
  id_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleOAuthTokenClient {
  requestAccessToken(): void;
}

interface GoogleOAuthTokenClientConfig {
  client_id: string;
  scope: string;
  prompt?: string;
  callback: (tokenResponse: GoogleOAuthTokenResponse) => void;
}

interface GoogleCredentialResponse {
  credential?: string;
}

interface GooglePromptMomentNotification {
  isNotDisplayed(): boolean;
  isSkippedMoment(): boolean;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: GoogleOAuthTokenClientConfig): GoogleOAuthTokenClient;
      };
      id?: {
        initialize(config: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
          auto_select?: boolean;
        }): void;
        prompt(callback?: (notification: GooglePromptMomentNotification) => void): void;
        disableAutoSelect(): void;
      };
    };
  };
}
