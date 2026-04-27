import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, LogIn, LogOut, AlertCircle, Pencil, Square, List, ChevronUp, ChevronDown, Paperclip, X, Plus, History } from 'lucide-react';
import cn from 'classnames';
import styles from './jarvish-agent.module.scss';
import { Message, AgentStatus } from './types';

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'agent',
  content: 'Hello! I am Jarvish, your personal agent. How can I help you today?',
  timestamp: Date.now(),
};

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export const JarvishAgent: React.FC = () => {
  const [input, setInput] = useState('תמשיך את המחקר על זכיות הבניה של המבנים הטמפלרים בנחלה שלי');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [lastSentQuery, setLastSentQuery] = useState<string>('');
  const [attachments, setAttachments] = useState<{name: string, data: string, mimeType: string}[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('google_access_token'));
  const [clientId, setClientId] = useState<string | null>(null);
  
  // Session State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(localStorage.getItem('jarvish_session_id'));

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const cancelRequest = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('idle');
      
      const completedSteps = statusLogs.filter(log => !log.includes('thinking')).join('\n');
      const recoveryNote = `\n\n[RECOVERY: Interrupted at Stage ${currentStage}. \nProgress made:\n${completedSteps}\n\nPlease resume from the next step.]`;
      setInput(lastSentQuery + recoveryNote);
      
      setStatusMessage('Request stopped. Progress saved to editor.');
      setCurrentStage(0);
      setRetryCountdown(null);
      setAttachments([]); 
      setTimeout(() => setStatusMessage(null), 3000);
    }
  }, [currentStage, lastSentQuery, statusLogs]);

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, []);

  // --- Session Management ---

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { getSessions { id title createdAt updatedAt } }`
        })
      });
      const result = await res.json();
      if (result.data?.getSessions) {
        setSessions(result.data.getSessions);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    }
  }, []);

  const loadSessionHistory = useCallback(async (sessionId: string) => {
    try {
      setStatus('thinking');
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query($sessionId: String!) { getSessionHistory(sessionId: $sessionId) { role content } }`,
          variables: { sessionId }
        })
      });
      const result = await res.json();
      if (result.data?.getSessionHistory) {
        const history = result.data.getSessionHistory.map((m: any, i: number) => ({
          id: `hist-${i}`,
          role: m.role,
          content: m.content,
          timestamp: Date.now()
        }));
        setMessages(history.length > 0 ? history : [INITIAL_MESSAGE]);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
      setErrorMessage("Failed to load conversation history.");
    } finally {
      setStatus('idle');
    }
  }, []);

  const createNewSession = useCallback(async () => {
    const id = `session-${Date.now()}`;
    const title = `New Research ${new Date().toLocaleDateString()}`;
    try {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation($id: String!, $title: String!) { createSession(id: $id, title: $title) { id title } }`,
          variables: { id, title }
        })
      });
      const result = await res.json();
      if (result.data?.createSession) {
        const newSession = result.data.createSession;
        setSessions(prev => [newSession, ...prev]);
        selectSession(newSession.id);
      }
    } catch (e) {
      console.error('Failed to create session:', e);
    }
  }, []);

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    localStorage.setItem('jarvish_session_id', id);
    setMessages([INITIAL_MESSAGE]);
    loadSessionHistory(id);
    setErrorMessage(null);
    setStatusLogs([]);
  }, [loadSessionHistory]);

  const deleteSession = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
      await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation($id: String!) { deleteSession(id: $id) }`,
          variables: { id }
        })
      });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
        localStorage.removeItem('jarvish_session_id');
        setMessages([INITIAL_MESSAGE]);
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  }, [currentSessionId]);

  // --- Initial Data Fetch ---
  useEffect(() => {
    fetchSessions();
    if (currentSessionId) {
      loadSessionHistory(currentSessionId);
    }
  }, []); // Run once on mount

  // --- Standard Logic ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("File too large. Max 10MB per file.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          data: base64,
          mimeType: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom, errorMessage]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/config');
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

  // Step 2: Automatic "Regular Identification" (One Tap)
  useEffect(() => {
    if (googleToken || !clientId) return;

    const handleOneTapResponse = (response: any) => {
      console.log('One Tap response received');
      if (response.credential) {
        loginWithGoogle();
      }
    };

    const initOneTap = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleOneTapResponse,
          auto_select: true, // Seamless identification
        });
        (window as any).google.accounts.id.prompt();
      }
    };

    // Small delay to ensure SDK is fully ready
    const timer = setTimeout(initOneTap, 1000);
    return () => clearTimeout(timer);
  }, [googleToken, clientId]);

  const loginWithGoogle = useCallback(() => {
    setErrorMessage(null);
    if (!clientId) {
      return setErrorMessage('Google Client ID not loaded from server.');
    }

    if (!(window as any).google) {
      return setErrorMessage('Google Identity Services SDK not loaded.');
    }
    
    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
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
  }, [clientId]);

  const logout = useCallback(() => {
    localStorage.removeItem('google_access_token');
    setGoogleToken(null);
    setErrorMessage(null);
  }, []);

  const sendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || status !== 'idle') return;

    // Auto-create session if none active
    let sessionId = currentSessionId;
    if (!sessionId) {
      const id = `session-${Date.now()}`;
      const title = input.substring(0, 30) + (input.length > 30 ? '...' : '');
      try {
        const res = await fetch('/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `mutation($id: String!, $title: String!) { createSession(id: $id, title: $title) { id title } }`,
            variables: { id, title }
          })
        });
        const result = await res.json();
        if (result.data?.createSession) {
          sessionId = result.data.createSession.id;
          setCurrentSessionId(sessionId);
          localStorage.setItem('jarvish_session_id', sessionId!);
          setSessions(prev => [result.data.createSession, ...prev]);
        }
      } catch (e) {
        console.error("Session auto-creation failed", e);
      }
    }

    setErrorMessage(null);
    setLastSentQuery(input);
    setStatusLogs([]);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus('thinking');
    setCurrentStage(1);

    abortControllerRef.current = new AbortController();

    try {
      const headers: any = { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      };
      if (googleToken) headers['x-google-token'] = googleToken;

      const subscriptionQuery = `
        subscription AgentChat($query: String!, $history: [MessageInput!]!, $attachments: [AttachmentInput!], $sessionId: String) {
          agentEvents(query: $query, history: $history, attachments: $attachments, sessionId: $sessionId) {
            type
            content
            stage
          }
        }
      `;

      const response = await fetch('/graphql', {
        method: 'POST',
        headers,
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          query: subscriptionQuery,
          variables: {
            query: input,
            history: messages.map(m => ({ 
              role: m.role === 'user' ? 'user' : 'assistant', 
              content: m.content 
            })).slice(-10),
            attachments: attachments.map(a => ({
              name: a.name,
              data: a.data,
              mimeType: a.mimeType
            })),
            sessionId
          }
        }),
      });

      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      if (!response.body) throw new Error('No response body received from server');
      
      const reader = response.body.getReader();
      readerRef.current = reader; 
      const decoder = new TextDecoder();
      let assistantMessageContent = '';
      
      const assistantMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'agent', content: '', timestamp: Date.now() }]);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.replace('data: ', '').trim();
          if (!jsonStr) continue;

          try {
            const result = JSON.parse(jsonStr);
            const data = result.data?.agentEvents;
            if (!data) continue;

            if (data.type === 'STATUS') {
              setStatusMessage(data.content);
              setStatusLogs(prev => [...prev, data.content]);
              if (data.stage !== undefined) setCurrentStage(data.stage);
            } else if (data.type === 'MESSAGE') {
              setStatusMessage(null); 
              assistantMessageContent += data.content;
              setStatus('responding');
              setMessages(prev => prev.map(m => 
                m.id === assistantMsgId ? { ...m, content: assistantMessageContent } : m
              ));
            } else if (data.type === 'ERROR') {
              setErrorMessage(`Agent Error: ${data.content}`);
            }
          } catch (e) {
            console.warn('Failed to parse SSE JSON:', jsonStr);
          }
        }
      }
      setStatus('idle');
      setStatusMessage(null);
      setCurrentStage(0);
      setRetryCountdown(null);
      setAttachments([]); 
      readerRef.current = null;
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      setMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      abortControllerRef.current = null;
    }
  }, [input, status, googleToken, messages, currentSessionId, attachments]);

  return (
    <div className={styles.layout}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} color="#64748b" />
            <h3>Past Research</h3>
          </div>
          <button onClick={createNewSession} className={styles.newChatBtn}>
            <Plus size={16} /> New Chat
          </button>
        </div>
        
        <div className={styles.sessionList}>
          {sessions.map(s => (
            <button 
              key={s.id} 
              onClick={() => selectSession(s.id)}
              className={cn(styles.sessionItem, { [styles.active]: currentSessionId === s.id })}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className={styles.sessionTitle}>{s.title}</span>
                <Trash2 size={12} className={styles.deleteIcon} onClick={(e) => deleteSession(s.id, e)} />
              </div>
              <span className={styles.sessionDate}>{new Date(s.updatedAt).toLocaleDateString()}</span>
            </button>
          ))}
          {sessions.length === 0 && (
            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '2rem' }}>
              No history found.
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CHAT */}
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
            <button onClick={() => { setMessages([INITIAL_MESSAGE]); setErrorMessage(null); setStatusLogs([]); }} className={styles.button} title="Reset Chat UI"><Trash2 size={16} /></button>
          </div>
        </header>

        <div className={styles.messages}>
          {status !== 'idle' && (
            <div className={styles.stageTracker}>
              {[
                { id: 1, label: 'Prepare' },
                { id: 2, label: 'Research' },
                { id: 3, label: 'Synthesize' },
                { id: 4, label: 'Finalize' }
              ].map((stage) => (
                <div key={stage.id} className={cn(styles.stage, { 
                  [styles.active]: currentStage === stage.id,
                  [styles.completed]: currentStage > stage.id 
                })}>
                  <div className={styles.dot} />
                  <span>{stage.label}</span>
                </div>
              ))}
            </div>
          )}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 className={styles.loading} size={18} />
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {statusMessage || 'Jarvish is processing...'}
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {statusLogs.length > 0 && (
          <div className={cn(styles.logViewer, { [styles.expanded]: showAllLogs })}>
            <div className={styles.logHeader}>
              <span className={styles.latestLog}>
                {statusLogs[statusLogs.length - 1]}
              </span>
              <button type="button" onClick={() => setShowAllLogs(!showAllLogs)} className={styles.logToggleButton}>
                {showAllLogs ? <ChevronDown size={14} /> : <List size={14} />}
              </button>
            </div>
            {showAllLogs && (
              <div className={styles.logList}>
                {statusLogs.map((log, i) => (
                  <div key={i} className={styles.logItem}>
                    <span className={styles.logTime}>Step {i+1}</span>
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <footer className={styles.footer}>
          {attachments.length > 0 && (
            <div className={styles.attachmentPreview}>
              {attachments.map((file, i) => (
                <div key={i} className={styles.attachmentTag}>
                  <span className={styles.attachmentName}>{file.name}</span>
                  <button type="button" onClick={() => removeAttachment(i)} className={styles.removeBtn}><X size={10} /></button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={sendMessage} className={styles.inputGroup}>
            <button type="button" onClick={() => fileInputRef.current?.click()} className={cn(styles.button, styles.attachButton)} disabled={status !== 'idle'}>
              <Paperclip size={18} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png,.docx,.txt" />
            <textarea
              ref={textareaRef}
              rows={1}
              className={styles.textarea}
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={status === 'thinking'}
            />
            {status !== 'idle' ? (
              <button type="button" onClick={cancelRequest} className={cn(styles.button, styles.stopButton)} title="Stop generation">
                <Square size={18} fill="currentColor" />
              </button>
            ) : (
              <button type="submit" className={styles.button} disabled={!input.trim()}>
                <Send size={18} />
              </button>
            )}
          </form>
        </footer>
      </div>
    </div>
  );
};

export default JarvishAgent;
