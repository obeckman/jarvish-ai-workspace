import { useState, useCallback, useRef, useEffect } from 'react';
import parse from 'partial-json-parser';
import { z } from 'zod';
import { Message, AgentStatus, Attachment, GetSessionHistoryResponseSchema, AgentEventsSubscriptionResponseSchema, AgentEventDataSchema, AgentMessageBlockSchema, MessageContent } from '@/features/jarvishAgent/types';
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
  | { type: 'SET_STATUS_LOGS'; payload: string[] } // New: Set all status logs
  | { type: 'SET_CURRENT_STAGE'; payload: number }
  | { type: 'SET_ATTACHMENTS'; payload: Attachment[] }
  | { type: 'ADD_ATTACHMENT'; payload: Attachment }
  | { type: 'REMOVE_ATTACHMENT'; payload: number } // payload is index
  | { type: 'SET_ERROR_MESSAGE'; payload: string | null }
  | { type: 'SET_REASONING_VISIBLE'; payload: boolean }
  | { type: 'SET_LAST_SENT_QUERY'; payload: string }
  | { type: 'RESET_CHAT' };

const initialChatState: ChatState = {
  messages: [{
    id: '1',
    role: MESSAGE_ROLES.AGENT,
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
          variables: { sessionId }
        })
      });
      const result = await res.json();
      // Validate the GraphQL response using Zod
      const validatedResponse = GetSessionHistoryResponseSchema.parse(result.data);
      if (validatedResponse.getSessionHistory) {
        const history = result.data.getSessionHistory.map((m: any, i: number) => {
          let content: MessageContent = m.content;
          try {
            const parsed = parse(m.content);
            if (Array.isArray(parsed)) {
              content = parsed.map((block: any) => {
                try {
                  return AgentMessageBlockSchema.parse(block);
                } catch (blockParseError) {
                  console.warn('Failed to parse historical block, keeping raw:', blockParseError, block);
                  return block;
                }
              });
            }
          } catch (e) {
            // Keep content as string if parsing fails
          }
          return {
            id: `hist-${i}`,
            role: m.role,
            content: content,
            timestamp: Date.now()
          };
        });
        dispatch({ type: 'SET_MESSAGES', payload: history.length > 0 ? history : [{
          id: '1',
          role: MESSAGE_ROLES.AGENT,
          content: UI_STRINGS.INITIAL_GREETING,
          timestamp: Date.now(),
        }] });
      }
    } catch (e) {
      console.error('Failed to load history:', e);
      dispatch({ type: 'SET_ERROR_MESSAGE', payload: "Failed to load conversation history." });
    } finally {
      dispatch({ type: 'SET_STATUS', payload: AGENT_STATUS.IDLE });
  }, [dispatch]);

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
  }, [dispatch, state.currentStage, state.lastSentQuery, state.statusLogs]);

  const sendMessage = useCallback(async (sessionId: string) => {
    if (!state.input.trim() || state.status !== AGENT_STATUS.IDLE) return;

    dispatch({ type: 'SET_ERROR_MESSAGE', payload: null });
    dispatch({ type: 'SET_LAST_SENT_QUERY', payload: state.input });
    dispatch({ type: 'SET_STATUS_LOGS', payload: [] });
    dispatch({ type: 'SET_REASONING_VISIBLE', payload: true });
    const userMsg: Message = { id: Date.now().toString(), role: MESSAGE_ROLES.USER, content: state.input, timestamp: Date.now() };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    dispatch({ type: 'SET_INPUT', payload: '' });
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
            query: state.input,
            history: state.messages.map(m => ({ 
              role: m.role === MESSAGE_ROLES.USER ? 'user' : 'assistant', 
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            })).slice(-10),
            attachments: state.attachments.map(a => ({
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
            // Validate the SSE event data using Zod
            const validatedEvent = AgentEventsSubscriptionResponseSchema.parse(result.data);
            const data = validatedEvent.agentEvents;
            if (!data) continue;

            if (data.type === EVENT_TYPES.STATUS) {
              dispatch({ type: 'SET_STATUS_MESSAGE', payload: data.content });
              dispatch({ type: 'ADD_STATUS_LOG', payload: data.content });
              
              dispatch({ type: 'ADD_MESSAGE', payload: {
                id: `reason-${Date.now()}-${Math.random()}`,
                role: MESSAGE_ROLES.REASONING,
                content: data.content,
                timestamp: Date.now()
              } });

              if (data.stage !== undefined) dispatch({ type: 'SET_CURRENT_STAGE', payload: data.stage });
            } else if (data.type === EVENT_TYPES.REASONING) {
              dispatch({ type: 'ADD_MESSAGE', payload: {
                id: `reason-content-${Date.now()}-${Math.random()}`,
                role: MESSAGE_ROLES.REASONING,
                content: data.content,
                timestamp: Date.now()
              } });
            } else if (data.type === EVENT_TYPES.MESSAGE) {
              dispatch({ type: 'SET_STATUS_MESSAGE', payload: null }); 
              
              assistantMessageContent += data.content;
              
              let newContent: MessageContent = assistantMessageContent;
              try {
                // Attempt to parse the full accumulated content as structured blocks
                const parsedBlocks = parse(assistantMessageContent);
                if (Array.isArray(parsedBlocks)) { // If it parses as an array of blocks
                  // Validate against the schema for robust parsing
                  newContent = parsedBlocks.map((block: any) => {
                    try {
                      return AgentMessageBlockSchema.parse(block);
                    } catch (blockParseError) {
                      console.warn('Failed to parse individual block from stream, keeping raw:', blockParseError, block);
                      return block; // Fallback to raw if individual block parsing fails
                    }
                  });
                }
              } catch (e) {
                // If it's not valid JSON yet, or not an array, keep it as string
              }

              dispatch({ type: 'UPDATE_LAST_MESSAGE', payload: { id: assistantMsgId, content: newContent } });
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
      // We don't have a direct equivalent for setMessages(prev => prev.filter(m => m.content !== ''));
      // This part might need a specific action if removing empty messages is a regular operation.
      // For now, I will omit it as it filters only empty messages.
    } finally {
      abortControllerRef.current = null;
    }
  }, [dispatch, googleToken, state.input, state.messages, state.attachments, state.status]);

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
  }, [dispatch]);

  const removeAttachment = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_ATTACHMENT', payload: index });
  }, [dispatch]);

  const clearMessages = useCallback(() => {
    dispatch({ type: 'RESET_CHAT' });
  }, [dispatch]);

  return {
    // State values
    messages: state.messages,
    input: state.input,
    status: state.status,
    statusMessage: state.statusMessage,
    statusLogs: state.statusLogs,
    currentStage: state.currentStage,
    attachments: state.attachments,
    errorMessage: state.errorMessage,
    isReasoningVisible: state.isReasoningVisible,
    lastSentQuery: state.lastSentQuery, // Expose lastSentQuery

    // Actions (or functions that dispatch actions)
    setInput: (value: string) => dispatch({ type: 'SET_INPUT', payload: value }),
    setMessages: (newMessages: Message[]) => dispatch({ type: 'SET_MESSAGES', payload: newMessages }), // For loadSessionHistory's initial set
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
