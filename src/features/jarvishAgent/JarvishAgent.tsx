import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, LogIn, LogOut, AlertCircle, Pencil, Square, List, ChevronUp, ChevronDown, Paperclip, X, Plus, History, BrainCircuit } from 'lucide-react';
import cn from 'classnames';
import styles from './jarvish-agent.module.scss';
import { Message, AgentStatus } from './types';
import { 
  STORAGE_KEYS, 
  API_ENDPOINTS, 
  MESSAGE_ROLES, 
  AGENT_STATUS, 
  EVENT_TYPES, 
  UI_STRINGS, 
  GQL_QUERIES, 
  GQL_MUTATIONS, 
  GQL_SUBSCRIPTIONS 
} from './constants';

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: MESSAGE_ROLES.AGENT,
  content: UI_STRINGS.INITIAL_GREETING,
  timestamp: Date.now(),
};

interface SessionSummary {
  summaryTitle: string;
  userMessage: string;
  aiAnswer: string;
}

interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  summary?: SessionSummary;
}

export const JarvishAgent: React.FC = () => {
  const [input, setInput] = useState(UI_STRINGS.DEFAULT_INPUT);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [status, setStatus] = useState<AgentStatus>(AGENT_STATUS.IDLE);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [lastSentQuery, setLastSentQuery] = useState<string>('');
  const [attachments, setAttachments] = useState<{name: string, data: string, mimeType: string}[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem(STORAGE_KEYS.GOOGLE_TOKEN));
  const [clientId, setClientId] = useState<string | null>(null);
  
  // Session State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showFullConversation, setShowFullConversation] = useState(true);
  const [isReasoningVisible, setIsReasoningVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingSessions, setIsFetchingSessions] = useState(false);

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

  const fetchSessions = useCallback(async (reset = false) => {
    if (isFetchingSessions) return;
    setIsFetchingSessions(true);
    
    const newOffset = reset ? 0 : offset;
    const limit = 10;
    
    try {
      const res = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query($limit: Int, $offset: Int, $search: String) { 
            getSessions(limit: $limit, offset: $offset, search: $search) { 
              id title createdAt updatedAt summary { summaryTitle userMessage aiAnswer } 
            } 
          }`,
          variables: { limit, offset: newOffset, search: searchTerm || null }
        })
      });
      const result = await res.json();
      if (result.data?.getSessions) {
        const fetched = result.data.getSessions;
        setSessions(prev => reset ? fetched : [...prev, ...fetched]);
        setOffset(newOffset + fetched.length);
        setHasMore(fetched.length === limit);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      setIsFetchingSessions(false);
    }
  }, [offset, searchTerm, isFetchingSessions]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadSessionHistory = useCallback(async (sessionId: string) => {
    try {
      setStatus(AGENT_STATUS.THINKING);
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_QUERIES.GET_SESSION_HISTORY,
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
      setStatus(AGENT_STATUS.IDLE);
    }
  }, []);

  const pollingIntervalRef = useRef<any>(null);

  const startPollingSummary = useCallback((sessionId: string) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(API_ENDPOINTS.GRAPHQL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: GQL_QUERIES.GET_SESSION_SUMMARY,
            variables: { sessionId }
          })
        });
        const result = await res.json();
        if (result.data?.getSessionSummary) {
          setSessions(prev => prev.map(s => 
            s.id === sessionId ? { ...s, summary: result.data.getSessionSummary } : s
          ));
          clearInterval(pollingIntervalRef.current);
        }
      } catch (e) {
        console.error("Polling summary failed", e);
      }
    }, 3000);
  }, []);

  const selectSession = useCallback((id: string) => {
    setCurrentSessionId(id);
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, id);
    setMessages([INITIAL_MESSAGE]);
    loadSessionHistory(id);
    setErrorMessage(null);
    setStatusLogs([]);

    // Always show summary view first when selecting from history
    const session = sessions.find(s => s.id === id);
    setShowFullConversation(false);
    
    if (session && !session.summary) {
      startPollingSummary(id);
    }
  }, [loadSessionHistory, sessions, startPollingSummary]);

  const createNewSession = useCallback(async () => {
    const id = `session-${Date.now()}`;
    const title = `${UI_STRINGS.NEW_RESEARCH_PREFIX} ${new Date().toLocaleDateString()}`;
    try {
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_MUTATIONS.CREATE_SESSION,
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
  }, [selectSession]);

  const deleteSession = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(UI_STRINGS.DELETE_CONFIRMATION)) return;
    try {
      await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_MUTATIONS.DELETE_SESSION,
          variables: { id }
        })
      });
      setSessions(prev => prev.filter(s => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(null);
        localStorage.removeItem(STORAGE_KEYS.SESSION_ID);
        setMessages([INITIAL_MESSAGE]);
      }
    } catch (e) {
      console.error('Failed to delete session:', e);
    }
  }, [currentSessionId]);

  // --- Initial Data Fetch ---
  useEffect(() => {
    fetchSessions();
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []); // Run once on mount

  const copyToInput = useCallback((text: string) => {
    setInput(text);
    textareaRef.current?.focus();
  }, []);

  const triggerSummary = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Calling getSessionSummary on BE triggers async generation if missing
      await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_QUERIES.GET_SESSION_SUMMARY,
          variables: { sessionId }
        })
      });
      startPollingSummary(sessionId);
    } catch (e) {
      console.error("Failed to trigger summary:", e);
    }
  }, [startPollingSummary]);

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

  const clearInput = useCallback(() => {
    setInput('');
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const sendMessage = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || status !== AGENT_STATUS.IDLE) return;

    // Auto-create session if none active
    let sessionId = currentSessionId;
    if (!sessionId) {
      const id = `session-${Date.now()}`;
      const title = input.substring(0, 30) + (input.length > 30 ? '...' : '');
      try {
        const res = await fetch(API_ENDPOINTS.GRAPHQL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: GQL_MUTATIONS.CREATE_SESSION,
            variables: { id, title }
          })
        });
        const result = await res.json();
        if (result.data?.createSession) {
          sessionId = result.data.createSession.id;
          setCurrentSessionId(sessionId);
          localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId!);
          setSessions(prev => [result.data.createSession, ...prev]);
        }
      } catch (e) {
        console.error("Session auto-creation failed", e);
      }
    }

    setErrorMessage(null);
    setLastSentQuery(input);
    setStatusLogs([]);
    setIsReasoningVisible(true); // Show reasoning while active
    const userMsg: Message = { id: Date.now().toString(), role: MESSAGE_ROLES.USER, content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus(AGENT_STATUS.THINKING);
    setCurrentStage(1);

    abortControllerRef.current = new AbortController();

    try {
      const headers: any = { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      };
      if (googleToken) headers['x-google-token'] = googleToken;

      const response = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers,
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          query: GQL_SUBSCRIPTIONS.AGENT_CHAT,
          variables: {
            query: input,
            history: messages.map(m => ({ 
              role: m.role === MESSAGE_ROLES.USER ? 'user' : 'assistant', 
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

            if (data.type === EVENT_TYPES.STATUS) {
              setStatusMessage(data.content);
              setStatusLogs(prev => [...prev, data.content]);
              
              // Also add as reasoning message
              setMessages(prev => [...prev, {
                id: `reason-${Date.now()}-${Math.random()}`,
                role: MESSAGE_ROLES.REASONING,
                content: data.content,
                timestamp: Date.now()
              }]);

              if (data.stage !== undefined) setCurrentStage(data.stage);
            } else if (data.type === EVENT_TYPES.REASONING) {
              // Add larger intermediate content (like research results) as reasoning
              setMessages(prev => [...prev, {
                id: `reason-content-${Date.now()}-${Math.random()}`,
                role: MESSAGE_ROLES.REASONING,
                content: data.content,
                timestamp: Date.now()
              }]);
            } else if (data.type === EVENT_TYPES.MESSAGE) {
              setStatusMessage(null); 
              
              // Ensure assistant message placeholder exists
              setMessages(prev => {
                const existing = prev.find(m => m.id === assistantMsgId);
                if (!existing) {
                  return [...prev, { id: assistantMsgId, role: MESSAGE_ROLES.AGENT, content: data.content, timestamp: Date.now() }];
                }
                return prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + data.content } : m);
              });

              assistantMessageContent += data.content;
              setStatus(AGENT_STATUS.RESPONDING);
            } else if (data.type === EVENT_TYPES.ERROR) {
              setErrorMessage(`Agent Error: ${data.content}`);
            }
          } catch (e) {
            console.warn('Failed to parse SSE JSON:', jsonStr);
          }
        }
      }
      setStatus(AGENT_STATUS.IDLE);
      setStatusMessage(null);
      setCurrentStage(0);
      setRetryCountdown(null);
      setAttachments([]); 
      setShowAllLogs(false); 
      setIsReasoningVisible(false); // Collapse reasoning after finished
      readerRef.current = null;
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      setStatus(AGENT_STATUS.ERROR);
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
          
          <div className={styles.searchWrapper}>
            <input 
              type="text" 
              placeholder="Search history..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className={styles.clearSearch}>
                <X size={12} />
              </button>
            )}
          </div>
        </div>
        
        <div className={styles.sessionList}>
          {sessions.map(s => (
            <div 
              key={s.id} 
              onClick={() => selectSession(s.id)}
              className={cn(styles.sessionItem, { [styles.active]: currentSessionId === s.id })}
            >
              <div className={styles.sessionItemHeader}>
                <span className={styles.sessionTitle}>{s.summary?.summaryTitle || s.title}</span>
                <Trash2 size={12} className={styles.deleteIcon} onClick={(e) => deleteSession(s.id, e)} />
              </div>
              
              {s.summary ? (
                <div className={styles.summaryContent}>
                  <p><strong>User:</strong> {s.summary.userMessage.substring(0, 50)}...</p>
                  <p><strong>AI:</strong> {s.summary.aiAnswer.substring(0, 50)}...</p>
                </div>
              ) : (
                <div className={styles.summaryActions}>
                  {currentSessionId === s.id && pollingIntervalRef.current ? (
                    <div className={styles.summaryLoading}>
                      <Loader2 size={10} className={styles.spin} /> Generating...
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => triggerSummary(s.id, e)} 
                      className={styles.summarizeBtn}
                    >
                      <History size={10} /> Summarize
                    </button>
                  )}
                </div>
              )}
              
              <span className={styles.sessionDate}>{new Date(s.updatedAt).toLocaleDateString()}</span>
            </div>
          ))}
          
          {hasMore && (
            <button 
              onClick={() => fetchSessions(false)} 
              className={styles.loadMoreBtn}
              disabled={isFetchingSessions}
            >
              {isFetchingSessions ? <Loader2 size={14} className={styles.spin} /> : "Load More"}
            </button>
          )}

          {sessions.length === 0 && !isFetchingSessions && (
            <div className={styles.emptyHistory}>
              No history found.
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CHAT */}
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.sidebarTitleWrapper}>
            <Bot size={24} />
            <div>
              <h2 className={styles.headerTitle}>Jarvish Agent</h2>
              {currentSessionId && (
                <button 
                  onClick={() => setShowFullConversation(!showFullConversation)} 
                  className={styles.viewToggle}
                >
                  {showFullConversation ? "Show Summary" : "Show Full Conversation"}
                </button>
              )}
            </div>
          </div>
          <div className={styles.headerActions}>
            {googleToken ? (
              <button onClick={logout} className={cn(styles.button, styles.logoutButton)} title="Logout Google"><LogOut size={16} /></button>
            ) : (
              <button onClick={loginWithGoogle} className={styles.button} title="Login Google"><LogIn size={16} /></button>
            )}
            <button onClick={() => { setMessages([INITIAL_MESSAGE]); setErrorMessage(null); setStatusLogs([]); }} className={styles.button} title="Reset Chat UI"><Trash2 size={16} /></button>
          </div>
        </header>

        <div className={styles.messages}>
          {!showFullConversation && currentSessionId ? (
            <div className={styles.summaryView}>
               {sessions.find(s => s.id === currentSessionId)?.summary ? (
                 <div className={styles.summaryCard}>
                    <h3>{sessions.find(s => s.id === currentSessionId)?.summary?.summaryTitle}</h3>
                    <div className={styles.summarySection}>
                      <strong>Original Request:</strong>
                      <p>{sessions.find(s => s.id === currentSessionId)?.summary?.userMessage}</p>
                      <button onClick={() => copyToInput(sessions.find(s => s.id === currentSessionId)?.summary?.userMessage || '')} className={styles.copyBtnInline}>
                        Copy to input
                      </button>
                    </div>
                    <div className={styles.summarySection}>
                      <strong>Key Findings:</strong>
                      <p>{sessions.find(s => s.id === currentSessionId)?.summary?.aiAnswer}</p>
                    </div>
                    <button onClick={() => setShowFullConversation(true)} className={styles.showFullBtn}>
                      View Full Conversation
                    </button>
                 </div>
               ) : (
                 <div className={styles.summaryPlaceholder}>
                    <div className={styles.placeholderCard}>
                      <History size={48} color="#94a3b8" />
                      <h3>Summary is being prepared</h3>
                      <p>Jarvish is analyzing this conversation to provide a concise overview. This will take just a few seconds.</p>
                      <div className={styles.pollingStatus}>
                        <Loader2 size={16} className={styles.spin} />
                        <span>Checking for summary...</span>
                      </div>
                      <button onClick={() => setShowFullConversation(true)} className={styles.showFullBtnSecondary}>
                        Skip to Full Conversation
                      </button>
                    </div>
                 </div>
               )}
            </div>
          ) : (
            <>
              {status !== AGENT_STATUS.IDLE && (
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

              {(() => {
                const elements: React.ReactNode[] = [];
                let reasoningGroup: Message[] = [];

                const flushReasoning = () => {
                  if (reasoningGroup.length > 0) {
                    const group = [...reasoningGroup];
                    const isCollapsed = !isReasoningVisible;
                    
                    elements.push(
                      <div key={`reason-group-${group[0].id}`} className={cn(styles.reasoningGroup, { [styles.collapsed]: isCollapsed })}>
                        <div className={styles.reasoningHeader} onClick={() => setIsReasoningVisible(!isReasoningVisible)}>
                          <BrainCircuit size={12} />
                          <span>{isCollapsed ? `Show Thought Process (${group.length} steps)` : 'Hide Thought Process'}</span>
                          {isCollapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </div>
                        {!isCollapsed && (
                          <div className={styles.reasoningSteps}>
                            {group.map(rm => (
                              <div key={rm.id} className={styles.reasoningStep}>
                                <div className={styles.dot} />
                                {rm.content}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                    reasoningGroup = [];
                  }
                };

                messages.forEach((msg) => {
                  const isUser = msg.role === MESSAGE_ROLES.USER;
                  const isAgent = msg.role === MESSAGE_ROLES.AGENT;
                  const isReasoning = msg.role === MESSAGE_ROLES.REASONING;

                  // When viewing history summary, don't show anything (it's handled by summaryView)
                  if (currentSessionId && !showFullConversation) return;

                  if (isReasoning) {
                    reasoningGroup.push(msg);
                  } else {
                    flushReasoning();
                    if (msg.content === '') return; // Skip empty tokens/messages

                    elements.push(
                      <div key={msg.id} className={cn(styles.message, { [styles.user]: isUser, [styles.agent]: isAgent })}>
                        <div className={styles.messageHeader}>
                          <div className={styles.messageSender}>
                            {isUser ? <User size={12} /> : <Bot size={12} />}
                            <strong className={styles.senderName}>{isUser ? 'You' : 'Jarvish'}</strong>
                          </div>
                          {isUser && (
                            <button 
                              onClick={() => copyToInput(msg.content)} 
                              className={styles.copyIconBtn}
                              title="Copy to prompt"
                            >
                              <Plus size={12} />
                            </button>
                          )}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      </div>
                    );
                  }
                });
                
                flushReasoning();
                return elements;
              })()}
            </>
          )}
          
          {errorMessage && (
            <div className={cn(styles.message, styles.agent, styles.errorMessageBlock)}>
               <div className={styles.errorTitle}>
                 <AlertCircle size={14} /> System Error
               </div>
               {errorMessage}
            </div>
          )}
          
          {status === AGENT_STATUS.THINKING && !errorMessage && (
            <div className={cn(styles.message, styles.agent)}>
              <div className={styles.messageSender}>
                <Loader2 className={styles.loading} size={18} />
                <span className={styles.thinkingText}>
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
              disabled={status === AGENT_STATUS.THINKING}
            />
            {input && status === AGENT_STATUS.IDLE && (
              <button 
                type="button" 
                onClick={clearInput} 
                className={cn(styles.button, styles.clearButton)}
                title="Clear input"
              >
                <X size={18} />
              </button>
            )}
            {status !== AGENT_STATUS.IDLE ? (
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
