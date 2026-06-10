import { describe, expect, it } from 'vitest';
import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';

import {
  mapGraphMessageToGraphQLMessage,
  mapInputToLangChainMessages,
  shouldStreamMessageFromNode,
  stringifyMessageContent,
} from '@/backend/graphql/mappers/message.mapper';
import { BLOCK_TYPES, EVENT_TYPES, NODE_NAMES, ROLES } from '@/shared/jarvish.constants';

describe('Jarvish GraphQL message mapper', () => {
  it('maps imported chat history into LangChain message classes', () => {
    const messages = mapInputToLangChainMessages([
      { role: ROLES.USER, content: 'hello' },
      { role: ROLES.AGENT, content: 'hi' },
      { role: ROLES.TOOL, content: 'tool output' },
      { role: 'unknown', content: 'fallback' },
    ]);

    expect(messages[0]).toBeInstanceOf(HumanMessage);
    expect(messages[1]).toBeInstanceOf(AIMessage);
    expect(messages[2]).toBeInstanceOf(ToolMessage);
    expect(messages[3]).toBeInstanceOf(HumanMessage);
  });

  it('keeps user and supervisor messages user-facing in session history', () => {
    expect(mapGraphMessageToGraphQLMessage({
      type: ROLES.HUMAN,
      content: 'what meetings do I have today?',
    })).toEqual({
      type: EVENT_TYPES.MESSAGE,
      role: ROLES.USER,
      content: 'what meetings do I have today?',
    });

    expect(mapGraphMessageToGraphQLMessage({
      name: NODE_NAMES.SUPERVISOR,
      content: JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: 'You have one meeting.' }]),
    })).toEqual({
      type: EVENT_TYPES.MESSAGE,
      role: ROLES.AGENT,
      content: JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: 'You have one meeting.' }]),
    });
  });

  it('maps tool and worker messages to reasoning history with a safe fallback', () => {
    expect(mapGraphMessageToGraphQLMessage({
      type: ROLES.TOOL,
      content: '',
    })).toEqual({
      type: EVENT_TYPES.REASONING,
      role: ROLES.REASONING,
      content: 'Processing research step...',
    });

    expect(mapGraphMessageToGraphQLMessage({
      name: 'calendar_worker',
      content: 'calendar lookup',
    })).toEqual({
      type: EVENT_TYPES.REASONING,
      role: ROLES.REASONING,
      content: 'calendar lookup',
    });
  });

  it('stringifies multimodal LangChain content deterministically', () => {
    expect(stringifyMessageContent([
      { type: 'text', text: 'first' },
      { type: 'image_url', image_url: { url: 'https://example.test/image.png' } },
    ])).toBe('first\n{"type":"image_url","image_url":{"url":"https://example.test/image.png"}}');
  });

  it('streams only configured Jarvish node outputs', () => {
    expect(shouldStreamMessageFromNode(NODE_NAMES.SUPERVISOR)).toBe(true);
    expect(shouldStreamMessageFromNode(NODE_NAMES.ARCHIVE)).toBe(false);
  });
});
