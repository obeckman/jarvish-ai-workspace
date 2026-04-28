import { useState, useCallback, useRef, useEffect } from 'react';
import { Message, AgentStatus, Attachment } from '@/features/jarvishAgent/types';
import { 
  MESSAGE_ROLES, 
  AGENT_STATUS, 
  API_ENDPOINTS, 
  GQL_SUBSCRIPTIONS, 
  EVENT_TYPES, 
  UI_STRINGS,
  GQL_QUERIES,
  STAGES
} from '@/features/jarvishAgent/constants';

export const useJarvishChat = (
  currentSessionId: string | null, 
  googleToken: string | null,
  checkAndRefreshToken?: () => Promise<string | null>
) => {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1',
    role: MESSAGE_ROLES.AGENT,
    content: UI_STRINGS.INITIAL_GREETING,
    timestamp: Date.now(),
  }]);
  const [input, setInput] = useState<string>(UI_STRINGS.DEFAULT_INPUT);
  const [status, setStatus] = useState<AgentStatus>(AGENT_STATUS.IDLE);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusLogs, setStatusLogs] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReasoningVisible, setIsReasoningVisible] = useState(false);
  const [lastSentQuery, setLastSentQuery] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

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
        setMessages(history.length > 0 ? history : [{
          id: '1',
          role: MESSAGE_ROLES.AGENT,
          content: UI_STRINGS.INITIAL_GREETING,
          timestamp: Date.now(),
        }]);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
      setErrorMessage("Failed to load conversation history.");
    } finally {
      setStatus(AGENT_STATUS.IDLE);
    }
  }, []);

  const cancelRequest = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus(AGENT_STATUS.IDLE);
      
      const completedSteps = statusLogs.filter(log => !log.includes('thinking')).join('\n');
      const recoveryNote = `\n\n[RECOVERY: Interrupted at Stage ${currentStage}. \nProgress made:\n${completedSteps}\n\nPlease resume from the next step.]`;
      setInput(lastSentQuery + recoveryNote);
      
      setStatusMessage('Request stopped. Progress saved to editor.');
      setCurrentStage(0);
      setAttachments([]); 
      setTimeout(() => setStatusMessage(null), 3000);
    }
  }, [currentStage, lastSentQuery, statusLogs]);

  const sendMessage = useCallback(async (sessionId: string) => {
    if (!input.trim() || status !== AGENT_STATUS.IDLE) return;

    setErrorMessage(null);
    setLastSentQuery(input);
    setStatusLogs([]);
    setIsReasoningVisible(true);
    const userMsg: Message = { id: Date.now().toString(), role: MESSAGE_ROLES.USER, content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setStatus(AGENT_STATUS.THINKING);
    setCurrentStage(STAGES.PREPARE);

    abortControllerRef.current = new AbortController();

    try {
      let activeToken = googleToken;
      if (checkAndRefreshToken) {
        const refreshed = await checkAndRefreshToken();
        if (refreshed) activeToken = refreshed;
      }

      const headers: any = { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      };
      if (activeToken) headers['x-google-token'] = activeToken;

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
              
              setMessages(prev => [...prev, {
                id: `reason-${Date.now()}-${Math.random()}`,
                role: MESSAGE_ROLES.REASONING,
                content: data.content,
                timestamp: Date.now()
              }]);

              if (data.stage !== undefined) setCurrentStage(data.stage);
            } else if (data.type === EVENT_TYPES.REASONING) {
              setMessages(prev => [...prev, {
                id: `reason-content-${Date.now()}-${Math.random()}`,
                role: MESSAGE_ROLES.REASONING,
                content: data.content,
                timestamp: Date.now()
              }]);
            } else if (data.type === EVENT_TYPES.MESSAGE) {
              setStatusMessage(null); 
              
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
      setAttachments([]); 
      setIsReasoningVisible(false);
      readerRef.current = null;
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      setStatus(AGENT_STATUS.ERROR);
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      setMessages(prev => prev.filter(m => m.content !== ''));
    } finally {
      abortControllerRef.current = null;
    }
  }, [input, status, googleToken, messages, attachments]);

  const addAttachment = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(UI_STRINGS.FILE_LARGE_ERROR);
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
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([{
      id: '1',
      role: MESSAGE_ROLES.AGENT,
      content: UI_STRINGS.INITIAL_GREETING,
      timestamp: Date.now(),
    }]);
    setErrorMessage(null);
    setStatusLogs([]);
  }, []);

  return {
    messages,
    setMessages,
    input,
    setInput,
    status,
    statusMessage,
    statusLogs,
    currentStage,
    attachments,
    errorMessage,
    setErrorMessage,
    isReasoningVisible,
    setIsReasoningVisible,
    sendMessage,
    cancelRequest,
    addAttachment,
    removeAttachment,
    clearMessages,
    loadSessionHistory
  };
};
