import {
  AGENT_STATUS,
  BLOCK_TYPES,
  ROLES,
} from '@/shared/jarvish.constants.ts';
import {
  EVENT_TYPES,
  STATE_ACTIONS,
} from '@/frontend/features/jarvishAgent/constants';
import type { ChatAction } from '@/frontend/features/jarvishAgent/types';
import {
  createReasoningMessageId,
} from '@/frontend/features/jarvishAgent/utils/messageIds';
import { parseAgentMessageContent } from '@/frontend/features/jarvishAgent/utils/parser';
import { clientLogger } from '@/frontend/utils/clientLogger';
import { parseAgentEventPayload, type AgentEventMetadata } from '../../utils/eventMapper';

export type AgentEventActionMapping = {
  actions: ChatAction[];
  nextReasoningSequence: number;
};

export function mapSseMessagesToChatActions(
  assistantMsgId: string,
  messages: string[],
  reasoningSequence: number,
): AgentEventActionMapping {
  const actions: ChatAction[] = [];
  let nextReasoningSequence = reasoningSequence;

  for (const message of messages) {
    const jsonStr = message.trim();
    if (!jsonStr || jsonStr === '[DONE]') {
      continue;
    }

    try {
      const result = JSON.parse(jsonStr);
      const data = parseAgentEventPayload(result.data);

      clientLogger.debug('processSseMessages : [SSE Event Received]', {
        type: data.type,
        data,
      });

      actions.push(...mapConfidenceActions(data.metadata));

      if (data.type === EVENT_TYPES.STATUS) {
        actions.push(
          { type: STATE_ACTIONS.SET_STATUS_MESSAGE, payload: data.content },
          { type: STATE_ACTIONS.ADD_STATUS_LOG, payload: data.content },
        );

        if (data.stage !== null) {
          actions.push({ type: STATE_ACTIONS.SET_CURRENT_STAGE, payload: data.stage });
        } else {
          clientLogger.debug('Status event arrived without a stage; keeping current stage.');
        }
      } else if (data.type === EVENT_TYPES.REASONING) {
        actions.push({
          type: STATE_ACTIONS.ADD_MESSAGE,
          payload: {
            id: createReasoningMessageId(assistantMsgId, nextReasoningSequence),
            type: BLOCK_TYPES.REASONING,
            role: ROLES.REASONING,
            content: data.content,
            timestamp: Date.now(),
          },
        });
        nextReasoningSequence += 1;
      } else if (data.type === EVENT_TYPES.MESSAGE) {
        const newContentArray = parseAgentMessageContent(data.content);
        clientLogger.debug('processSseMessages : [Parsed Assistant Message Content]:', newContentArray);

        actions.push(
          {
            type: STATE_ACTIONS.ADD_MESSAGE,
            payload: {
              id: assistantMsgId,
              type: BLOCK_TYPES.TEXT,
              role: ROLES.AGENT,
              content: newContentArray,
              timestamp: Date.now(),
            },
          },
          { type: STATE_ACTIONS.SET_STATUS, payload: AGENT_STATUS.RESPONDING },
        );
      } else if (data.type === EVENT_TYPES.ERROR) {
        actions.push({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: `Agent Error: ${data.content}` });
      } else if (data.type === EVENT_TYPES.RETRY) {
        const retryMessage = data.content || 'Retrying request...';
        actions.push(
          { type: STATE_ACTIONS.SET_STATUS_MESSAGE, payload: retryMessage },
          { type: STATE_ACTIONS.ADD_STATUS_LOG, payload: retryMessage },
        );
      } else {
        actions.push({ type: STATE_ACTIONS.SET_ERROR_MESSAGE, payload: `Unsupported agent event type: ${data.type}` });
      }
    } catch (e) {
      const parseMessage = e instanceof Error ? e.message : 'Unknown parsing error';
      actions.push({
        type: STATE_ACTIONS.SET_ERROR_MESSAGE,
        payload: `Failed to parse SSE event: ${parseMessage}`,
      });
      clientLogger.warn('processSseMessages : Failed to parse SSE JSON:', { jsonStr, error: e });
    }
  }

  return { actions, nextReasoningSequence };
}

function mapConfidenceActions(metadata: AgentEventMetadata | null | undefined): ChatAction[] {
  if (!metadata) {
    return [];
  }

  const { confidence, validationReason } = metadata;
  if (confidence === null || confidence === undefined) {
    return [];
  }

  if (typeof confidence !== 'number' || !Number.isFinite(confidence)) {
    clientLogger.warn('Ignoring invalid confidence metadata:', metadata);
    return [];
  }

  if (confidence < 0 || confidence > 100) {
    clientLogger.warn('Ignoring out-of-range confidence metadata:', metadata);
    return [];
  }

  return [{
    type: STATE_ACTIONS.RECORD_CONFIDENCE_OBSERVATION,
    payload: {
      confidence,
      reason: validationReason?.trim() || null,
    },
  }];
}
