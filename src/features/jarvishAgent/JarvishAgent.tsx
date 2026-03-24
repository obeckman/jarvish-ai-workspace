import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, LogIn, LogOut, AlertCircle } from 'lucide-react';
import cn from 'classnames';
import styles from './jarvish-agent.module.scss';
import { Message, AgentStatus } from './types';

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'agent',
  content: 'Hello! I am Jarvish, your personal agent. How can I help you today?',
  timestamp: Date.now(),
};

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

export const JarvishAgent: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('google_access_token'));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom, errorMessage]);

  const loginWithGoogle = useCallback(() => {
    setErrorMessage(null);
    if (!(window as any).google) {
      return setErrorMessage('Google Identity Services SDK not loaded. Check index.html script tag.');
    }
    
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/documents.readonly',
        callback: (tokenResponse: any) => {
          if (tokenResponse.access_token) {
            localStorage.setItem('google_access_token', tokenResponse.access_token);
            setGoogleToken(tokenResponse.access_token);
          } else if (tokenResponse.error) {
            setErrorMessage(`Google Auth Error: ${tokenResponse.error_description || tokenResponse.error}`);
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      setErrorMessage(`Failed to initialize Google Login: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('google_access_token');
    setGoogleToken(null);
    setErrorMessage(null);
  }, []);

  const sendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== 'idle') return;

    setErrorMessage(null);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus('thinking');

    try {
      const headers: any = { 'Content-Type': 'application/json' };
      if (googleToken) headers['x-google-token'] = googleToken;

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: input }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      if (!response.body) throw new Error('No response body received from server');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessageContent = '';
      
      const assistantMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'agent', content: '', timestamp: Date.now() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'message') {
              assistantMessageContent += data.content;
              setStatus('responding');
              setMessages(prev => prev.map(m => 
                m.id === assistantMsgId ? { ...m, content: assistantMessageContent } : m
              ));
            } else if (data.type === 'error') {
              setErrorMessage(`Agent Error: ${data.content}`);
            }
          } catch (e) {
            console.warn('Failed to parse NDJSON line:', line);
          }
        }
      }
      setStatus('idle');
    } catch (error) {
      console.error('Agent error:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      // Clean up empty assistant messages on error
      setMessages(prev => prev.filter(m => m.content !== ''));
    }
  }, [input, status, googleToken]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={24} />
          <h2>Jarvish Agent</h2>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          {googleToken ? (
            <button onClick={logout} className={styles.button} title="Logout Google" style={{ color: '#10b981' }}><LogOut size={16} /></button>
          ) : (
            <button onClick={loginWithGoogle} className={styles.button} title="Login Google"><LogIn size={16} /></button>
          )}
          <button onClick={() => { setMessages([INITIAL_MESSAGE]); setErrorMessage(null); }} className={styles.button} title="Clear Chat"><Trash2 size={16} /></button>
        </div>
      </header>

      <div className={styles.messages}>
        {messages.map((msg) => (
          <div key={msg.id} className={cn(styles.message, { [styles.user]: msg.role === 'user', [styles.agent]: msg.role === 'agent' })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
              <strong style={{ fontSize: '0.7rem' }}>{msg.role === 'user' ? 'You' : 'Jarvish'}</strong>
            </div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
          </div>
        ))}
        
        {errorMessage && (
          <div className={cn(styles.message, styles.agent)} style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#b91c1c' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '4px' }}>
               <AlertCircle size={14} /> System Error
             </div>
             {errorMessage}
          </div>
        )}
        
        {status === 'thinking' && !errorMessage && (
          <div className={cn(styles.message, styles.agent)}>
            <Loader2 className={styles.loading} size={18} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className={styles.footer}>
        <form onSubmit={sendMessage} className={styles.inputGroup}>
          <input
            type="text"
            className={styles.input}
            placeholder={googleToken ? "Ask about your Gmail/Calendar..." : "Type a message..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== 'idle'}
          />
          <button type="submit" className={styles.button} disabled={!input.trim() || status !== 'idle'}>
            {status === 'thinking' ? <Loader2 className={styles.loading} size={18} /> : <Send size={18} />}
          </button>
        </form>
        {!googleToken && status === 'idle' && !errorMessage && (
          <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '8px', textAlign: 'center' }}>
            💡 Tip: Login with Google to enable Gmail and Calendar features.
          </div>
        )}
      </footer>
    </div>
  );
};

export default JarvishAgent;
