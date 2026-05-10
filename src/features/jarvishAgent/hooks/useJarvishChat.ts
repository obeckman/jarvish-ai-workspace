import { useCallback, useRef, useReducer } from 'react';
import { 
  Message, 
  Attachment, 
  GetSessionHistoryResponseSchema, 
  AgentEventsSubscriptionResponseSchema, 
  MessageContent 
} from '@/features/jarvishAgent/types';
import { 
  
  GQL_SUBSCRIPTIONS, 
  EVENT_TYPES, 
  UI_STRINGS,
  GQL_QUERIES,
  STAGES
} from '@/features/jarvishAgent/constants';
import {
  ROLES, 
  AGENT_STATUS, 
  API_ENDPOINTS ,
  AgentStatus
} from '@/shared/jarvish.constants.ts'

import { parseAgentMessageContent } from '../utils/parser';
import { 
  AgentChatSubscriptionVariables, 
  GetSessionHistoryQueryVariables 
} from '../gql/graphql';

// --- Reducer Definitions ---

interface ChatState {
  messages: Message[];
  input: string;
  status: AgentStatus;
  statusMessage: string | null;
  statusLogs: string[];
  currentStage: number;
  attachments: Attachment[];
  errorMessage: string | null;
  isReasoningVisible: boolean;
  lastSentQuery: string;
}

type ChatAction =
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_LAST_MESSAGE'; payload: { id: string; content: MessageContent } }
  | { type: 'SET_INPUT'; payload: string }
  | { type: 'SET_STATUS'; payload: AgentStatus }
  | { type: 'SET_STATUS_MESSAGE'; payload: string | null }
  | { type: 'ADD_STATUS_LOG'; payload: string }
  | { type: 'SET_STATUS_LOGS'; payload: string[] }
  | { type: 'SET_CURRENT_STAGE'; payload: number }
  | { type: 'SET_ATTACHMENTS'; payload: Attachment[] }
  | { type: 'ADD_ATTACHMENT'; payload: Attachment }
  | { type: 'REMOVE_ATTACHMENT'; payload: number }
  | { type: 'SET_ERROR_MESSAGE'; payload: string | null }
  | { type: 'SET_REASONING_VISIBLE'; payload: boolean }
  | { type: 'SET_LAST_SENT_QUERY'; payload: string }
  | { type: 'RESET_CHAT' };

const initialChatState: ChatState = {
  messages: [{
    id: '1',
    role: ROLES.AGENT,
    content: UI_STRINGS.INITIAL_GREETING,
    timestamp: Date.now(),
  }],
  input: UI_STRINGS.DEFAULT_INPUT,
  status: AGENT_STATUS.IDLE,
  statusMessage: null,
  statusLogs: [],
  currentStage: 0,
  attachments: [],
  errorMessage: null,
  isReasoningVisible: false,
  lastSentQuery: '',
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_LAST_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m => 
          m.id === action.payload.id ? { ...m, content: action.payload.content } : m
        ),
      };
    case 'SET_INPUT':
      return { ...state, input: action.payload };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_STATUS_MESSAGE':
      return { ...state, statusMessage: action.payload };
    case 'ADD_STATUS_LOG':
      return { ...state, statusLogs: [...state.statusLogs, action.payload] };
    case 'SET_STATUS_LOGS':
      return { ...state, statusLogs: action.payload };
    case 'SET_CURRENT_STAGE':
      return { ...state, currentStage: action.payload };
    case 'SET_ATTACHMENTS':
      return { ...state, attachments: action.payload };
    case 'ADD_ATTACHMENT':
      return { ...state, attachments: [...state.attachments, action.payload] };
    case 'REMOVE_ATTACHMENT':
      return { ...state, attachments: state.attachments.filter((_, i) => i !== action.payload) };
    case 'SET_ERROR_MESSAGE':
      return { ...state, errorMessage: action.payload };
    case 'SET_REASONING_VISIBLE':
      return { ...state, isReasoningVisible: action.payload };
    case 'SET_LAST_SENT_QUERY':
      return { ...state, lastSentQuery: action.payload };
    case 'RESET_CHAT':
      return { ...initialChatState };
    default:
      return state;
  }
}

export const useJarvishChat = (
  currentSessionId: string | null, 
  googleToken: string | null,
  checkAndRefreshToken?: () => Promise<string | null>
) => {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  const loadSessionHistory = useCallback(async (sessionId: string) => {
    try {
      dispatch({ type: 'SET_STATUS', payload: AGENT_STATUS.THINKING });
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: GQL_QUERIES.GET_SESSION_HISTORY,
          variables: { sessionId } as GetSessionHistoryQueryVariables
        })
      });
      const result = await res.json();
      const validatedResponse = GetSessionHistoryResponseSchema.parse(result.data);
      if (validatedResponse.getSessionHistory) {
        const history = validatedResponse.getSessionHistory.map((m, i: number) => {
         // to do - current qwery is only "role" "content" not alligned with 
         console.log(`[loadSessionHistory] Mapping history message:`, m); 
         const content = parseAgentMessageContent(String(m.content));
          
          return {
            id: `hist-${i}`,
            role: m.role,
            type: m.type,
            content: content,
            timestamp: Date.now()
          } as Message;
        });
        dispatch({ type: 'SET_MESSAGES', payload: history.length > 0 ? history : [{
          id: '1',
          role: ROLES.AGENT,
          content: UI_STRINGS.INITIAL_GREETING,
          timestamp: Date.now(),
        }] });
      }
    } catch (e) {
      console.error('Failed to load history:', e);
      dispatch({ type: 'SET_ERROR_MESSAGE', payload: "Failed to load conversation history." });
    } finally {
      dispatch({ type: 'SET_STATUS', payload: AGENT_STATUS.IDLE });
    }
  }, []);

  const cancelRequest = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      dispatch({ type: 'SET_STATUS', payload: AGENT_STATUS.IDLE });
      
      const completedSteps = state.statusLogs.filter(log => !log.includes('thinking')).join('\n');
      const recoveryNote = `\n\n[RECOVERY: Interrupted at Stage ${state.currentStage}. \nProgress made:\n${completedSteps}\n\nPlease resume from the next step.]`;
      dispatch({ type: 'SET_INPUT', payload: state.lastSentQuery + recoveryNote });
      
      dispatch({ type: 'SET_STATUS_MESSAGE', payload: 'Request stopped. Progress saved to editor.' });
      dispatch({ type: 'SET_CURRENT_STAGE', payload: 0 });
      dispatch({ type: 'SET_ATTACHMENTS', payload: [] }); 
      setTimeout(() => dispatch({ type: 'SET_STATUS_MESSAGE', payload: null }), 3000);
    }
  }, [state.currentStage, state.lastSentQuery, state.statusLogs]);

  const sendMessage = useCallback(async (sessionId: string, overrideQuery?: string) => {
    const queryToSend = overrideQuery || state.input;
    if (!queryToSend.trim() || state.status !== AGENT_STATUS.IDLE) return;

    dispatch({ type: 'SET_ERROR_MESSAGE', payload: null });
    dispatch({ type: 'SET_LAST_SENT_QUERY', payload: queryToSend });
    dispatch({ type: 'SET_STATUS_LOGS', payload: [] });
    dispatch({ type: 'SET_REASONING_VISIBLE', payload: true });
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      role: ROLES.USER, 
      content: queryToSend, 
      timestamp: Date.now() 
    };
    
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    if (!overrideQuery) dispatch({ type: 'SET_INPUT', payload: '' });
    dispatch({ type: 'SET_STATUS', payload: AGENT_STATUS.THINKING });
    dispatch({ type: 'SET_CURRENT_STAGE', payload: STAGES.PREPARE });

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
            query: queryToSend,
            history: state.messages.map(m => ({ 
              role: m.role === ROLES.USER ? ROLES.USER : ROLES.ASSISTANT, 
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            })).slice(-10),
            attachments: state.attachments.map(a => ({
              name: a.name,
              data: a.data,
              mimeType: a.mimeType
            })),
            sessionId
          } as AgentChatSubscriptionVariables
        }),
      });

      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      if (!response.body) throw new Error('No response body received from server');
      
      const reader = response.body.getReader();
      readerRef.current = reader; 
      const decoder = new TextDecoder();
      
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
            const validatedEvent = AgentEventsSubscriptionResponseSchema.parse(result.data);
            const data = validatedEvent.agentEvents;
            console.log(`[SSE Event Received] Type: ${data.type} | Content: ${data.content}`, data);
            if (!data) continue;

            if (data.type === EVENT_TYPES.STATUS) {
              dispatch({ type: 'SET_STATUS_MESSAGE', payload: data.content });
              dispatch({ type: 'ADD_STATUS_LOG', payload: data.content });
              
              if (data.stage) {
                dispatch({ type: 'SET_CURRENT_STAGE', payload: data.stage });
              }
            } else if (data.type === EVENT_TYPES.REASONING) {
              dispatch({ type: 'ADD_MESSAGE', payload: {
                id: `reason-content-${Date.now()}-${Math.random()}`,
                role: ROLES.REASONING,
                content: data.content,
                timestamp: Date.now()
              } });
            } else if (data.type === EVENT_TYPES.MESSAGE) {
              const newContent = parseAgentMessageContent(data.content);
              console.log(`[Parsed Assistant Message Content]:`, newContent); 
              dispatch({ type: 'ADD_MESSAGE', payload: {
                id: assistantMsgId,
                role: ROLES.AGENT,
                content: newContent,
                timestamp: Date.now()
              } });
              
              dispatch({ type: 'SET_STATUS', payload: AGENT_STATUS.RESPONDING });
            } else if (data.type === EVENT_TYPES.ERROR) {
              dispatch({ type: 'SET_ERROR_MESSAGE', payload: `Agent Error: ${data.content}` });
            }
          } catch (e) {
            console.warn('Failed to parse SSE JSON:', jsonStr);
          }
        }
      }
      dispatch({ type: 'SET_STATUS', payload: AGENT_STATUS.IDLE });
      dispatch({ type: 'SET_STATUS_MESSAGE', payload: null });
      dispatch({ type: 'SET_CURRENT_STAGE', payload: 0 });
      dispatch({ type: 'SET_ATTACHMENTS', payload: [] }); 
      dispatch({ type: 'SET_REASONING_VISIBLE', payload: false });
      readerRef.current = null;
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      dispatch({ type: 'SET_STATUS', payload: AGENT_STATUS.ERROR });
      dispatch({ type: 'SET_ERROR_MESSAGE', payload: error instanceof Error ? error.message : 'An unexpected error occurred' });
    } finally {
      abortControllerRef.current = null;
    }
  }, [googleToken, state.input, state.messages, state.attachments, state.status, checkAndRefreshToken]);

  const addAttachment = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      dispatch({ type: 'SET_ERROR_MESSAGE', payload: UI_STRINGS.FILE_LARGE_ERROR });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      dispatch({ type: 'ADD_ATTACHMENT', payload: {
        name: file.name,
        data: base64,
        mimeType: file.type
      } });
    };
    reader.readAsDataURL(file);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_ATTACHMENT', payload: index });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'RESET_CHAT' });
  }, []);

  return {
    messages: state.messages,
    input: state.input,
    status: state.status,
    statusMessage: state.statusMessage,
    statusLogs: state.statusLogs,
    currentStage: state.currentStage,
    attachments: state.attachments,
    errorMessage: state.errorMessage,
    isReasoningVisible: state.isReasoningVisible,
    lastSentQuery: state.lastSentQuery,

    setInput: (value: string) => dispatch({ type: 'SET_INPUT', payload: value }),
    setMessages: (newMessages: Message[]) => dispatch({ type: 'SET_MESSAGES', payload: newMessages }),
    setErrorMessage: (message: string | null) => dispatch({ type: 'SET_ERROR_MESSAGE', payload: message }),
    setIsReasoningVisible: (value: boolean) => dispatch({ type: 'SET_REASONING_VISIBLE', payload: value }),

    sendMessage,
    cancelRequest,
    addAttachment,
    removeAttachment,
    clearMessages,
    loadSessionHistory
  };
};
