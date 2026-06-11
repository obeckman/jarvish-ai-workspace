import React, { useCallback, useRef, useReducer } from 'react';
import {
  ChatState,
  Message,
} from '@/frontend/features/jarvishAgent/types';
import {

  GQL_SUBSCRIPTIONS,
  EVENT_TYPES,
  UI_STRINGS,
  GQL_QUERIES,
  STAGES,
  STATE_ACTIONS,
  INITIAL_CHAT_STATE
} from '@/frontend/features/jarvishAgent/constants';
import {
  ROLES,
  AGENT_STATUS,
  API_ENDPOINTS,
  BLOCK_TYPES
} from '@/shared/jarvish.constants.ts'

import { parseAgentMessageContent } from '../../utils/parser';
import { normalizeHistoryMessages } from '@/frontend/features/jarvishAgent/utils/messageNormalizer';
import {
  createAssistantMessageId,
  createReasoningMessageId,
  createUserMessageId,
} from '@/frontend/features/jarvishAgent/utils/messageIds';
import {
  AgentChatSubscriptionVariables,
  GetSessionHistoryQuery,
  GetSessionHistoryQueryVariables
} from '@/frontend/features/jarvishAgent/graphql/__generated__/graphql';
import { getGraphQLHeaders } from '@/frontend/features/jarvishAgent/utils/authHeaders';
import { clientLogger } from '@/frontend/utils/clientLogger';


import { chatReducer } from './state';
import { parseAgentEventPayload, type AgentEventMetadata } from '../../utils/eventMapper';
// --- Reducer Definitions ---

type GraphQLResponse<TData> = {
  data?: TData;
  errors?: Array<{ message?: string }>;
};

function getGraphQLErrorMessage(errors: GraphQLResponse<unknown>["errors"]): string {
  if (!errors?.length) {
    return 'Unknown GraphQL error';
  }

  return errors.map(error => error.message || 'GraphQL request failed').join('; ');
}

export const useJarvishChat = (
  currentSessionId: string | null,
  idToken: string | null,
  googleToken: string | null,
  checkAndRefreshToken?: () => Promise<string | null>,
  checkAndRefreshIdToken?: () => Promise<string | null>
) => {
  const [state, dispatch] = useReducer(chatReducer, INITIAL_CHAT_STATE);

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const stateRef = useRef<ChatState>(state);
  const reasoningMessageSequenceRef = useRef(0);

  React.useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadSessionHistory = useCallback(async (sessionId: string) => {
    const activeIdToken = checkAndRefreshIdToken ? await checkAndRefreshIdToken() : idToken;
    if (!activeIdToken) {
      dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: "Sign in to load conversation history." });
      return;
    }

    try {
      dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.THINKING });
      const res = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: getGraphQLHeaders(activeIdToken),
        body: JSON.stringify({
          query: GQL_QUERIES.GET_SESSION_HISTORY,
          variables: { sessionId } as GetSessionHistoryQueryVariables
        })
      });
      if (!res.ok) {
        throw new Error(`Failed to load session history: ${res.status}`);
      }

      const result = await res.json() as GraphQLResponse<GetSessionHistoryQuery>;

      if (result.errors?.length) {
        throw new Error(getGraphQLErrorMessage(result.errors));
      }

      if (result.data?.getSessionHistory) {
        const history = normalizeHistoryMessages(result.data.getSessionHistory);

        dispatch({ type: STATE_ACTIONS.SET_MESSAGES, payload: history.length > 0 ? history : [] });
      } else {
        dispatch({ type: STATE_ACTIONS.SET_MESSAGES, payload: [] });
      }

    } catch (e) {
      clientLogger.error('Failed to load history:', e);
      dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: "Failed to load conversation history." });
    } finally {
      dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.IDLE });
    }
  }, [checkAndRefreshIdToken, idToken]);

  const cancelRequest = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.IDLE });

    const latestState = stateRef.current;
    const completedSteps = latestState.statusLogs.filter(log => !log.includes('thinking')).join('\n');
    const recoveryNote = `\n\n[RECOVERY: Interrupted at Stage ${latestState.currentStage}. \nProgress made:\n${completedSteps}\n\nPlease resume from the next step.]`;
    dispatch({ type: STATE_ACTIONS.SET_INPUT, payload: latestState.lastSentQuery + recoveryNote });
    dispatch({ type: STATE_ACTIONS.SET_CURRENT_STAGE, payload: 0 });
    dispatch({ type: STATE_ACTIONS.SET_ATTACHMENTS, payload: [] });
    dispatch({ type: STATE_ACTIONS.SET_CONFIDENCE_SUMMARY, payload: null });

    dispatch({ type: STATE_ACTIONS.SET_STATUS_MESSAGE, payload: 'Request stopped. Progress saved to editor.' });
    setTimeout(() => dispatch({ type: STATE_ACTIONS.SET_STATUS_MESSAGE, payload: null }), 3000);

  }, []);

  const recordConfidenceIfPresent = React.useCallback((metadata: AgentEventMetadata | null | undefined) => {
    if (!metadata) {
      return;
    }

    const { confidence, validationReason } = metadata;
    if (confidence === null || confidence === undefined) {
      return;
    }

    if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
      clientLogger.warn('Ignoring invalid confidence metadata:', metadata);
      return;
    }

    if (confidence < 0 || confidence > 100) {
      clientLogger.warn('Ignoring out-of-range confidence metadata:', metadata);
      return;
    }

    dispatch({
      type: STATE_ACTIONS.RECORD_CONFIDENCE_OBSERVATION,
      payload: {
        confidence,
        reason: validationReason?.trim() || null,
      },
    });
  }, []);

  const processStreamLines = React.useCallback((assistantMsgId: string, lines: string[]) => {
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.replace('data: ', '').trim();
      if (!jsonStr) continue;

      try {
        //format BE might send JSON wrapped in markdown code blocks, we need to strip those before parsing
        const result = JSON.parse(jsonStr);

        // We validate the incoming event against our Zod schema to ensure it has the expected structure and types.
        const data = parseAgentEventPayload(result.data);
        clientLogger.debug('processStreamLines : [SSE Event Received]', {
          type: data.type,
          data,
        });

        if (data.type === EVENT_TYPES.STATUS) {
          // Status events are simple text updates about what the agent is doing (e.g., "Searching for information", "Analyzing data", etc.).
          dispatch({ type: STATE_ACTIONS.SET_STATUS_MESSAGE, payload: data.content });
          dispatch({ type: STATE_ACTIONS.ADD_STATUS_LOG, payload: data.content });
          recordConfidenceIfPresent(data.metadata);

          if (data.stage !== null) {
            dispatch({ type: STATE_ACTIONS.SET_CURRENT_STAGE, payload: data.stage });
          } else {
            clientLogger.debug('Status event arrived without a stage; keeping current stage.');
          }
        } else if (data.type === EVENT_TYPES.REASONING) {
          // Reasoning events contain the agent's internal thought process, which can be helpful for debugging or for users who want more transparency.
          recordConfidenceIfPresent(data.metadata);
          const sequence = reasoningMessageSequenceRef.current;
          reasoningMessageSequenceRef.current += 1;
          dispatch({
            type: STATE_ACTIONS.ADD_MESSAGE, payload: {
              id: createReasoningMessageId(assistantMsgId, sequence),
              type: BLOCK_TYPES.REASONING,
              role: ROLES.REASONING,
              content: data.content,
              timestamp: Date.now()
            }
          });
        } else if (data.type === EVENT_TYPES.MESSAGE) {
          // Message events contain the actual content that the agent wants to communicate to the user.
          recordConfidenceIfPresent(data.metadata);
          const newContentArray = parseAgentMessageContent(data.content);
          clientLogger.debug('processStreamLines : [Parsed Assistant Message Content]:', newContentArray);
          dispatch({
            type: STATE_ACTIONS.ADD_MESSAGE, payload: {
              id: assistantMsgId,
              type: BLOCK_TYPES.TEXT,
              role: ROLES.AGENT,
              content: newContentArray,
              timestamp: Date.now(),
            }
          });
          dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.RESPONDING });
        } else if (data.type === EVENT_TYPES.ERROR) {
          // Error events indicate that something went wrong during the agent's processing. The content typically contains an error message that can be displayed to the user.
          recordConfidenceIfPresent(data.metadata);
          dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: `Agent Error: ${data.content}` });
        } else if (data.type === EVENT_TYPES.RETRY) {
          dispatch({ type: STATE_ACTIONS.SET_STATUS_MESSAGE, payload: data.content || 'Retrying request...' });
          dispatch({ type: STATE_ACTIONS.ADD_STATUS_LOG, payload: data.content || 'Retrying request...' });
        } else {
          dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: `Unsupported agent event type: ${data.type}` });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown parsing error';
        dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: `Failed to parse SSE event: ${message}` });
        clientLogger.warn('processStreamLines : Failed to parse SSE JSON:', { jsonStr, error: e });
      }
    }
  }, [recordConfidenceIfPresent])

  const startSendUserMessageSetUX = useCallback((queryToSend: string, overrideQuery?: string) => {
    dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: null });
    dispatch({ type: STATE_ACTIONS.SET_LAST_SENT_QUERY, payload: queryToSend });
    dispatch({ type: STATE_ACTIONS.SET_STATUS_LOGS, payload: [] });
    dispatch({ type: STATE_ACTIONS.SET_CONFIDENCE_SUMMARY, payload: null });
    dispatch({ type: STATE_ACTIONS.SET_REASONING_VISIBLE, payload: true });

    const userMessageTimestamp = Date.now();
    const userMessageBlock: Message = {
      type: BLOCK_TYPES.TEXT,
      id: createUserMessageId(userMessageTimestamp),
      role: ROLES.USER,
      content: queryToSend,
      timestamp: userMessageTimestamp
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
    const activeIdToken = checkAndRefreshIdToken ? await checkAndRefreshIdToken() : idToken;
    if (!activeIdToken) {
      throw new Error('Sign in to send messages.');
    }

    let activeToken = googleToken;
    if (checkAndRefreshToken) {
      const refreshed = await checkAndRefreshToken();
      if (refreshed) activeToken = refreshed;
    }

    const headers = getGraphQLHeaders(activeIdToken, {
      'Accept': 'text/event-stream' // Keep the connection open and stream data to the client
    }) as Record<string, string>;
    if (activeToken) headers['x-google-token'] = activeToken;// Safely attaches an authentication token if the user is logged in
    return headers;
  }, [checkAndRefreshIdToken, checkAndRefreshToken, googleToken, idToken])

  const sendUserMessage = useCallback(async (sessionId: string, overrideQuery?: string) => {

    const latestState = stateRef.current;
    const queryToSend = overrideQuery || latestState.input;
    if (!queryToSend.trim() || latestState.status !== AGENT_STATUS.IDLE) return;

    startSendUserMessageSetUX(queryToSend);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    reasoningMessageSequenceRef.current = 0;
    let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const sendUserMessageHeaders = await getSendUserMessageHeaders();

      const response = await fetch(API_ENDPOINTS.GRAPHQL, {
        method: 'POST',
        headers: sendUserMessageHeaders,
        signal: abortController.signal,// the app can triggers this signal to instantly kill the network request.
        body: JSON.stringify({
          //Contains the standard GraphQL structure: query (the schema name) and variables
          query: GQL_SUBSCRIPTIONS.AGENT_CHAT,
          variables: {
            query: queryToSend,
            history: latestState.messages.map(m => ({
              //Grabs the chat history from the state, maps the roles strictly to what the backend expects
              role: m.role === ROLES.USER ? ROLES.USER : ROLES.ASSISTANT,
              content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
            })),
            attachments: latestState.attachments.map(a => ({
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
      activeReader = reader;
      readerRef.current = reader;
      // We use a TextDecoder to convert the binary stream into text
      const decoder = new TextDecoder();

      const assistantMsgId = createAssistantMessageId(Date.now());

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
    } catch (error: unknown) {

      if (error instanceof Error && error.name === 'AbortError') return;

      dispatch({ type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.ERROR });
      dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: error instanceof Error ? error.message : 'An unexpected error occurred' });
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      if (readerRef.current === activeReader) {
        readerRef.current = null;
      }
    }
  }, [endSendUserMessageSetUX, getSendUserMessageHeaders, processStreamLines, startSendUserMessageSetUX]);

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
    confidenceSummary: state.confidenceSummary,
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
