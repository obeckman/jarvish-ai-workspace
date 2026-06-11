import React, { useCallback, useRef, useReducer } from 'react';
import {
  ChatState,
  Message,
} from '@/frontend/features/jarvishAgent/types';
import {
  UI_STRINGS,
  STAGES,
  STATE_ACTIONS,
  INITIAL_CHAT_STATE,
} from '@/frontend/features/jarvishAgent/constants';
import {
  ROLES,
  AGENT_STATUS,
  BLOCK_TYPES,
} from '@/shared/jarvish.constants.ts';

import { normalizeHistoryMessages } from '@/frontend/features/jarvishAgent/utils/messageNormalizer';
import {
  createAssistantMessageId,
  createUserMessageId,
} from '@/frontend/features/jarvishAgent/utils/messageIds';
import { clientLogger } from '@/frontend/utils/clientLogger';

import { chatReducer } from './state';
import { mapSseMessagesToChatActions } from './agentEventActions';
import { encodeAttachment, isAttachmentTooLarge } from './attachmentEncoder';
import { fetchSessionHistory, streamAgentChat } from './transportClient';

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
      const historyMessages = await fetchSessionHistory(sessionId, activeIdToken);
      const history = normalizeHistoryMessages(historyMessages);
      dispatch({ type: STATE_ACTIONS.SET_MESSAGES, payload: history.length > 0 ? history : [] });

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

  const processSseMessages = React.useCallback((assistantMsgId: string, messages: string[]) => {
    const { actions, nextReasoningSequence } = mapSseMessagesToChatActions(
      assistantMsgId,
      messages,
      reasoningMessageSequenceRef.current,
    );

    reasoningMessageSequenceRef.current = nextReasoningSequence;
    actions.forEach(action => dispatch(action));
  }, []);

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

  const getActiveTokens = useCallback(async (): Promise<{ idToken: string; googleToken: string | null }> => {
    const activeIdToken = checkAndRefreshIdToken ? await checkAndRefreshIdToken() : idToken;
    if (!activeIdToken) {
      throw new Error('Sign in to send messages.');
    }

    let activeToken = googleToken;
    if (checkAndRefreshToken) {
      const refreshed = await checkAndRefreshToken();
      if (refreshed) activeToken = refreshed;
    }

    return { idToken: activeIdToken, googleToken: activeToken };
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
      const activeTokens = await getActiveTokens();
      const assistantMsgId = createAssistantMessageId(Date.now());

      await streamAgentChat({
        ...activeTokens,
        signal: abortController.signal,
        variables: {
          query: queryToSend,
          history: latestState.messages.map(m => ({
            role: m.role === ROLES.USER ? ROLES.USER : ROLES.ASSISTANT,
            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
          })),
          attachments: latestState.attachments.map(a => ({
            name: a.name,
            data: a.data,
            mimeType: a.mimeType
          })),
          sessionId
        },
        onReader: (reader) => {
          activeReader = reader;
          readerRef.current = reader;
        },
        onMessages: (messages) => processSseMessages(assistantMsgId, messages),
      });

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
  }, [endSendUserMessageSetUX, getActiveTokens, processSseMessages, startSendUserMessageSetUX]);

  const addAttachment = useCallback((file: File) => {
    if (isAttachmentTooLarge(file)) {
      dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: UI_STRINGS.FILE_LARGE_ERROR });
      return;
    }

    void encodeAttachment(file)
      .then(attachment => {
        dispatch({ type: STATE_ACTIONS.ADD_ATTACHMENT, payload: attachment });
      })
      .catch(error => {
        clientLogger.error('Failed to encode attachment:', error);
        dispatch({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: 'Failed to read attachment.' });
      });
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
