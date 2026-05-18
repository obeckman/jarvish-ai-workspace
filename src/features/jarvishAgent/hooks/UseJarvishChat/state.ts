import {
  STATE_ACTIONS,
  INITIAL_CHAT_STATE
} from '@/features/jarvishAgent/constants';

import * as jarvishAgentTypes from '@/features/jarvishAgent/types';

export const chatReducer = (state: jarvishAgentTypes.ChatState, action: jarvishAgentTypes.ChatAction): jarvishAgentTypes.ChatState => {
  switch (action.type) {
    case STATE_ACTIONS.SET_MESSAGES:
      return { ...state, messages: action.payload };
    case STATE_ACTIONS.ADD_MESSAGE:
      return { ...state, messages: [...state.messages, action.payload] };
    case STATE_ACTIONS.UPDATE_LAST_MESSAGE:
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.id ? { ...m, content: action.payload.content } : m
        ),
      };
    case STATE_ACTIONS.SET_INPUT:
      return { ...state, input: action.payload };
    case STATE_ACTIONS.SET_STATUS:
      return { ...state, status: action.payload };
    case STATE_ACTIONS.SET_STATUS_MESSAGE:
      return { ...state, statusMessage: action.payload };
    case STATE_ACTIONS.ADD_STATUS_LOG:
      return { ...state, statusLogs: [...state.statusLogs, action.payload] };
    case STATE_ACTIONS.SET_STATUS_LOGS:
      return { ...state, statusLogs: action.payload };
    case STATE_ACTIONS.SET_CURRENT_STAGE:
      return { ...state, currentStage: action.payload };
    case STATE_ACTIONS.SET_ATTACHMENTS:
      return { ...state, attachments: action.payload };
    case STATE_ACTIONS.ADD_ATTACHMENT:
      return { ...state, attachments: [...state.attachments, action.payload] };
    case STATE_ACTIONS.REMOVE_ATTACHMENT:
      return { ...state, attachments: state.attachments.filter((_, i) => i !== action.payload) };
    case STATE_ACTIONS.SET_ERROR_MESSAGE:
      return { ...state, errorMessage: action.payload };
    case STATE_ACTIONS.SET_REASONING_VISIBLE:
      return { ...state, isReasoningVisible: action.payload };
    case STATE_ACTIONS.SET_LAST_SENT_QUERY:
      return { ...state, lastSentQuery: action.payload };
    case STATE_ACTIONS.RESET_CHAT:
      return { ...INITIAL_CHAT_STATE };
    default:
      return state;
  }
}
