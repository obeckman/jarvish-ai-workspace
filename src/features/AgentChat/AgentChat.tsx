import React, { useState, useCallback, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, LogIn, LogOut } from 'lucide-react';
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 className={styles.title} style={{ marginBottom: 0 }}>
          <Bot className={styles.icon} />
          Jarvish: Workspace Agent
        </h2>
        
        {googleToken ? (
          <button onClick={logout} className={styles.button} style={{ background: '#ef4444' }}>
            <LogOut size={16} /> Logout
          </button>
        ) : (
          <button onClick={loginWithGoogle} className={styles.button} style={{ background: '#4285F4' }}>
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
            <Sparkles size={14} style={{ marginRight: '4px' }} />
            Synthesized Context (Thought Trace)
          </h4>
          <p>{synthesizedContext}</p>
        </div>
      )}

      <div className={styles.responseArea}>
        {response ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{response}</div>
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
        <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '1rem', textAlign: 'center' }}>
          💡 Login with Google to unlock access to your Gmail, Calendar, and Docs.
        </p>
      )}
    </div>
  );
};
