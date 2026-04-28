import React, { useState, useCallback } from 'react';
import { Bot, Send, Loader2, Sparkles, LogIn, LogOut } from 'lucide-react';
import cn from 'classnames';
import { useAgent } from '../../hooks/useAgent';
import styles from './AgentChat.module.scss';

// Note: You need to set this Client ID in your environment or here
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

export const AgentChat: React.FC = () => {
  const [query, setQuery] = useState('');
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('google_access_token'));
  const { response, synthesizedContext, status, error, askAgent } = useAgent();

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const loginWithGoogle = useCallback(() => {
    if (!(window as any).google) {
      alert('Google SDK not loaded yet. Please refresh.');
      return;
    }

    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/documents.readonly',
      callback: (tokenResponse: any) => {
        if (tokenResponse.access_token) {
          localStorage.setItem('google_access_token', tokenResponse.access_token);
          setGoogleToken(tokenResponse.access_token);
        }
      },
    });
    client.requestAccessToken();
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('google_access_token');
    setGoogleToken(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || status !== 'idle') return;
    
    // Pass the token if we have it
    await askAgent(query, googleToken || undefined);
    setQuery('');
  }, [query, status, askAgent, googleToken]);

  const isLoading = status !== 'idle';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <Bot className={styles.icon} />
          Jarvish: Workspace Agent
        </h2>
        
        {googleToken ? (
          <button onClick={logout} className={cn(styles.button, styles.logoutButton)}>
            <LogOut size={16} /> Logout
          </button>
        ) : (
          <button onClick={loginWithGoogle} className={cn(styles.button, styles.loginButton)}>
            <LogIn size={16} /> Login with Google
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className={styles.inputGroup}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={googleToken ? "Ask about your Gmail, Calendar or Docs..." : "Ask the agent something..."}
          className={styles.input}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className={styles.button}
          disabled={isLoading || !query.trim()}
        >
          {isLoading ? (
            <Loader2 className={styles.spinner} size={20} />
          ) : (
            <Send size={20} />
          )}
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>

      {synthesizedContext && (
        <div className={styles.thoughtTrace}>
          <h4>
            <Sparkles size={14} />
            Synthesized Context (Thought Trace)
          </h4>
          <p>{synthesizedContext}</p>
        </div>
      )}

      <div className={styles.responseArea}>
        {response ? (
          <div className={styles.responseText}>{response}</div>
        ) : (
          !isLoading && <div className={styles.placeholder}>
            {googleToken 
              ? "Try: 'What are my next calendar events?' or 'Search my emails for invoices'"
              : "Response will appear here..."}
          </div>
        )}
        
        {isLoading && status === 'thinking' && !response && (
          <div className={styles.placeholder}>Agent is thinking...</div>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {!googleToken && !isLoading && (
        <p className={styles.hint}>
          💡 Login with Google to unlock access to your Gmail, Calendar, and Docs.
        </p>
      )}
    </div>
  );
};
