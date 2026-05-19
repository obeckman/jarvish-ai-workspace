import React, { useCallback, useRef, useReducer } from 'react';
import {
  Message,
  GetSessionHistoryResponseSchema,
  AgentEventsSubscriptionResponseSchema,
} from '@/features/jarvishAgent/types';
import {

  GQL_SUBSCRIPTIONS,
  EVENT_TYPES,
  UI_STRINGS,
  GQL_QUERIES,
  STAGES,
  STATE_ACTIONS,
  INITIAL_CHAT_STATE
} from '@/features/jarvishAgent/constants';
import {
  ROLES,
  AGENT_STATUS,
  API_ENDPOINTS,
  BLOCK_TYPES
} from '@/shared/jarvish.constants.ts'

import { parseAgentMessageContent } from '../../utils/parser';
import {
  AgentChatSubscriptionVariables,
  GetSessionHistoryQueryVariables
} from '@/features/jarvishAgent/graphql/__generated__/graphql';


import { chatReducer } from './state';
// --- Reducer Definitions ---


export const useJarvishChat = (
  currentSessionId: string | null,
  googleToken: string | null,
  checkAndRefreshToken?: () => Promise<string | null>
) => {
  const [state, dispatch] = useReducer(chatReducer, INITIAL_CHAT_STATE);

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  const loadSessionHistory = useCallback(async (sessionId: string) => {
    try {
      dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.THINKING });
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

        const history: Message[] = []
        validatedResponse.getSessionHistory.forEach((message, i: number) => {
          // to do - current qwery is only "role" "content" not alligned with 

          console.log(`[loadSessionHistory] Mapping history message:`, message);

          const newContentArray = parseAgentMessageContent(String(message.content));
          console.log(`[loadSessionHistory] Parsed Assistant Message Content:`, newContentArray);
          newContentArray.forEach(newContentMessage => {
            history.push({
              id: `hist-${i}-${Math.random()}`,
              timestamp: Date.now(),
              ...newContentMessage,
              role: message.role,
            } as Message);

          })
        });

        dispatch({ type: STATE_ACTIONS.SET_MESSAGES, payload: history.length > 0 ? history : [] });
      }

    } catch (e) {
      console.error('Failed to load history:', e);
      dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: "Failed to load conversation history." });
    } finally {
      dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.IDLE });
    }
  }, []);

  const cancelRequest = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.IDLE });

    const completedSteps = state.statusLogs.filter(log => !log.includes('thinking')).join('\n');
    const recoveryNote = `\n\n[RECOVERY: Interrupted at Stage ${state.currentStage}. \nProgress made:\n${completedSteps}\n\nPlease resume from the next step.]`;
    dispatch({ type: STATE_ACTIONS.SET_INPUT, payload: state.lastSentQuery + recoveryNote });
    dispatch({ type: STATE_ACTIONS.SET_CURRENT_STAGE, payload: 0 });
    dispatch({ type: STATE_ACTIONS.SET_ATTACHMENTS, payload: [] });

    dispatch({ type: STATE_ACTIONS.SET_STATUS_MESSAGE, payload: 'Request stopped. Progress saved to editor.' });
    setTimeout(() => dispatch({ type: STATE_ACTIONS.SET_STATUS_MESSAGE, payload: null }), 3000);

  }, [state.currentStage, state.lastSentQuery, state.statusLogs]);

  const processStreamLines = React.useCallback((assistantMsgId: string, lines: string[]) => {
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.replace('data: ', '').trim();
      if (!jsonStr) continue;

      try {
        //format BE might send JSON wrapped in markdown code blocks, we need to strip those before parsing
        const result = JSON.parse(jsonStr, (key, value) => {
          if (key === 'type' && typeof value === 'string') {
            return value.toLowerCase();
          }
          return value;
        });

        // We validate the incoming event against our Zod schema to ensure it has the expected structure and types.
        const validatedEvent = AgentEventsSubscriptionResponseSchema.parse(result.data);
        const data = validatedEvent.agentEvents;
        console.log(`processStreamLines : [SSE Event Received] Type: ${data.type} | Content: ${data.content}`, data);

        // If the event doesn't match our expected schema, we skip processing it to avoid runtime errors. 
        if (!data) continue;

        if (data.type.toLowerCase() === EVENT_TYPES.STATUS) {
          // Status events are simple text updates about what the agent is doing (e.g., "Searching for information", "Analyzing data", etc.).
          dispatch({ type: STATE_ACTIONS.SET_STATUS_MESSAGE, payload: data.content });
          dispatch({ type: STATE_ACTIONS.ADD_STATUS_LOG, payload: data.content });

          if (data.stage) {
            dispatch({ type: STATE_ACTIONS.SET_CURRENT_STAGE, payload: data.stage });
          }
        } else if (data.type.toLowerCase() === EVENT_TYPES.REASONING) {
          // Reasoning events contain the agent's internal thought process, which can be helpful for debugging or for users who want more transparency.
          dispatch({
            type: STATE_ACTIONS.ADD_MESSAGE, payload: {
              id: `reason-content-${Date.now()}-${Math.random()}`,
              type: BLOCK_TYPES.REASONING,
              role: ROLES.REASONING,
              content: data.content,
              timestamp: Date.now()
            }
          });
        } else if (data.type.toLowerCase() === EVENT_TYPES.MESSAGE) {
          // Message events contain the actual content that the agent wants to communicate to the user.
          const newContentArray = parseAgentMessageContent(data.content);
          console.log(`processStreamLines : [Parsed Assistant Message Content]:`, newContentArray);
          newContentArray.forEach(newContentMessage => {
            dispatch({
              type: STATE_ACTIONS.ADD_MESSAGE, payload: {
                id: assistantMsgId,
                timestamp: Date.now(),
                ...newContentMessage,
                role: ROLES.AGENT,
              }
            });
          });
          dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.RESPONDING });
        } else if (data.type === EVENT_TYPES.ERROR) {
          // Error events indicate that something went wrong during the agent's processing. The content typically contains an error message that can be displayed to the user.
          dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: `Agent Error: ${data.content}` });
        }
      } catch (e) {
        dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: `Failed to parse SSE JSON: ${jsonStr}` });
        console.warn('processStreamLines : Failed to parse SSE JSON:', jsonStr);
      }
    }
  }, [])

  const startSendUserMessageSetUX = useCallback((queryToSend: string, overrideQuery?: string) => {
    dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: null });
    dispatch({ type: STATE_ACTIONS.SET_LAST_SENT_QUERY, payload: queryToSend });
    dispatch({ type: STATE_ACTIONS.SET_STATUS_LOGS, payload: [] });
    dispatch({ type: STATE_ACTIONS.SET_REASONING_VISIBLE, payload: true });

    const userMessageBlock: Message = {
      type: BLOCK_TYPES.TEXT,
      id: Date.now().toString(),
      role: ROLES.USER,
      content: queryToSend,
      timestamp: Date.now()
    };

    dispatch({ type: STATE_ACTIONS.ADD_MESSAGE, payload: userMessageBlock });
    if (!overrideQuery) dispatch({ type: STATE_ACTIONS.SET_INPUT, payload: '' });
    dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.THINKING });
    dispatch({ type: STATE_ACTIONS.SET_CURRENT_STAGE, payload: STAGES.PREPARE });
  }, []);

  const endSendUserMessageSetUX = useCallback(() => {
    dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.IDLE });
    dispatch({ type: STATE_ACTIONS.SET_STATUS_MESSAGE, payload: null });
    dispatch({ type: STATE_ACTIONS.SET_CURRENT_STAGE, payload: 0 });
    dispatch({ type: STATE_ACTIONS.SET_ATTACHMENTS, payload: [] });
    dispatch({ type: STATE_ACTIONS.SET_REASONING_VISIBLE, payload: false });
  }, []);

  const getSendUserMessageHeaders = useCallback(async (): Promise<HeadersInit> => {
    let activeToken = googleToken;
    if (checkAndRefreshToken) {
      const refreshed = await checkAndRefreshToken();
      if (refreshed) activeToken = refreshed;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',// Tells the server we are sending JSON data
      'Accept': 'text/event-stream' // Keep the connection open and stream data to the client
    };
    if (activeToken) headers['x-google-token'] = activeToken;// Safely attaches an authentication token if the user is logged in
    return headers;
  }, [googleToken, checkAndRefreshToken])

  const sendUserMessage = useCallback(async (sessionId: string, overrideQuery?: string) => {

    const queryToSend = overrideQuery || state.input;
    if (!queryToSend.trim() || state.status !== AGENT_STATUS.IDLE) return;

    startSendUserMessageSetUX(queryToSend);

    abortControllerRef.current = new AbortController();
    const sendUserMessageHeaders = await getSendUserMessageHeaders();

    try {

      const response = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: sendUserMessageHeaders,
        signal: abortControllerRef.current.signal,// the app can triggers this signal to instantly kill the network request.
        body: JSON.stringify({
          //Contains the standard GraphQL structure: query (the schema name) and variables
          query: GQL_SUBSCRIPTIONS.AGENT_CHAT,
          variables: {
            query: queryToSend,
            history: state.messages.map(m => ({
              //Grabs the chat history from the state, maps the roles strictly to what the backend expects
              role: m.role === ROLES.USER ? ROLES.USER : ROLES.ASSISTANT,
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            })),
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

      // The backend sends a stream of events (SSE), so we read it incrementally
      // we grab a reader that allows us to read incoming chunks of data sequentially.
      const reader = response.body.getReader();
      readerRef.current = reader;
      // We use a TextDecoder to convert the binary stream into text
      const decoder = new TextDecoder();

      const assistantMsgId = (Date.now() + 1).toString();

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break; // The server closed the stream, we are finished!

        buffer += decoder.decode(value, { stream: true });
        // SSE streams split data by newlines
        const lines = buffer.split('\n');
        // Save incomplete lines for the next loop iteration
        // If the server cut off mid-sentence, that last line is incomplete. 
        // The code extracts it and saves it back into the buffer so it can be completed when the next network chunk arrives. 
        // The remaining complete lines are now ready to be parsed and displayed on your screen.

        buffer = lines.pop() || '';
        processStreamLines(assistantMsgId, lines);

      }
      if (buffer.trim()) {
        processStreamLines(assistantMsgId, [buffer]);
      }

      endSendUserMessageSetUX();
    } catch (error: any) {

      if (error instanceof Error && error.name === 'AbortError') return;

      dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.ERROR });
      dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: error instanceof Error ? error.message : 'An unexpected error occurred' });
    } finally {
      abortControllerRef.current = null;
      readerRef.current = null;
    }
  }, [googleToken, state.input, state.messages, state.attachments, state.status, checkAndRefreshToken]);

  const addAttachment = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: UI_STRINGS.FILE_LARGE_ERROR });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      dispatch({
        type: STATE_ACTIONS.ADD_ATTACHMENT, payload: {
          name: file.name,
          data: base64,
          mimeType: file.type
        }
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    dispatch({ type: STATE_ACTIONS.REMOVE_ATTACHMENT, payload: index });
  }, []);

  const clearMessages = useCallback(() => {
    dispatch({ type: STATE_ACTIONS.RESET_CHAT });
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

    setInput: (value: string) => dispatch({ type: STATE_ACTIONS.SET_INPUT, payload: value }),
    setMessages: (newMessages: Message[]) => dispatch({ type: STATE_ACTIONS.SET_MESSAGES, payload: newMessages }),
    setErrorMessage: (message: string | null) => dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: message }),
    setIsReasoningVisible: (value: boolean) => dispatch({ type: STATE_ACTIONS.SET_REASONING_VISIBLE, payload: value }),

    sendMessage: sendUserMessage,
    cancelRequest,
    addAttachment,
    removeAttachment,
    clearMessages,
    loadSessionHistory
  };
};
