import { describe, expect, it } from 'vitest';

import {
  AttachmentInputSchema,
  CreateSessionArgsSchema,
  GetSessionsArgsSchema,
  RESOLVER_INPUT_LIMITS,
  SessionIdArgsSchema,
  StartResearchArgsSchema,
  StreamAgentEventsInputSchema,
} from '@/backend/graphql/schemas/resolver.schema';
import { ROLES } from '@/shared/jarvish.constants';

describe('Jarvish GraphQL resolver boundary schemas', () => {
  it('normalizes nullable stream arrays to empty arrays', () => {
    expect(StreamAgentEventsInputSchema.parse({
      query: 'check my meetings',
      history: null,
      attachments: null,
      sessionId: null,
      googleToken: null,
    })).toEqual({
      query: 'check my meetings',
      history: [],
      attachments: [],
      sessionId: null,
      googleToken: null,
    });
  });

  it('accepts valid pagination and rejects unsafe bounds', () => {
    expect(GetSessionsArgsSchema.parse({
      limit: 10,
      offset: 0,
      search: 'calendar',
    })).toEqual({
      limit: 10,
      offset: 0,
      search: 'calendar',
    });

    expect(() => GetSessionsArgsSchema.parse({ limit: 0 })).toThrow();
    expect(() => GetSessionsArgsSchema.parse({ offset: -1 })).toThrow();
    expect(() => GetSessionsArgsSchema.parse({ search: 'x'.repeat(RESOLVER_INPUT_LIMITS.search + 1) })).toThrow();
  });

  it('requires non-empty identifiers and queries', () => {
    expect(() => SessionIdArgsSchema.parse({ sessionId: '' })).toThrow();
    expect(() => SessionIdArgsSchema.parse({ sessionId: 'x'.repeat(RESOLVER_INPUT_LIMITS.sessionId + 1) })).toThrow();
    expect(() => StreamAgentEventsInputSchema.parse({ query: '' })).toThrow();
    expect(() => StreamAgentEventsInputSchema.parse({ query: 'x'.repeat(RESOLVER_INPUT_LIMITS.query + 1) })).toThrow();
  });

  it('rejects client-provided ids when creating sessions', () => {
    expect(CreateSessionArgsSchema.parse({ title: 'Draft' })).toEqual({ title: 'Draft' });
    expect(() => CreateSessionArgsSchema.parse({ id: 'session-1', title: 'Draft' })).toThrow();
    expect(() => CreateSessionArgsSchema.parse({ title: 'x'.repeat(RESOLVER_INPUT_LIMITS.title + 1) })).toThrow();
  });

  it('allows only known message roles and bounded history content', () => {
    expect(StartResearchArgsSchema.parse({
      query: 'hello',
      history: [{ role: ROLES.USER, content: 'short message' }],
    })).toEqual({
      query: 'hello',
      history: [{ role: ROLES.USER, content: 'short message' }],
    });

    expect(() => StartResearchArgsSchema.parse({
      query: 'hello',
      history: [{ role: 'owner', content: 'short message' }],
    })).toThrow();

    expect(() => StartResearchArgsSchema.parse({
      query: 'hello',
      history: [{ role: ROLES.USER, content: 'x'.repeat(RESOLVER_INPUT_LIMITS.historyContent + 1) }],
    })).toThrow();

    expect(() => StartResearchArgsSchema.parse({
      query: 'hello',
      history: Array.from({ length: RESOLVER_INPUT_LIMITS.historyItems + 1 }, () => ({
        role: ROLES.USER,
        content: 'hello',
      })),
    })).toThrow();
  });

  it('rejects excessive aggregate history content', () => {
    expect(() => StreamAgentEventsInputSchema.parse({
      query: 'hello',
      history: Array.from({ length: 5 }, () => ({
        role: ROLES.USER,
        content: 'x'.repeat(Math.ceil(RESOLVER_INPUT_LIMITS.historyTotalContent / 5) + 1),
      })),
      attachments: [],
      sessionId: null,
      googleToken: null,
    })).toThrow();
  });

  it('validates attachment mime types and base64 payloads', () => {
    const attachment = {
      name: 'brief.pdf',
      data: Buffer.from('hello').toString('base64'),
      mimeType: 'application/pdf',
    };

    expect(AttachmentInputSchema.parse(attachment)).toEqual(attachment);
    expect(() => AttachmentInputSchema.parse({ ...attachment, mimeType: 'application/x-msdownload' })).toThrow();
    expect(() => AttachmentInputSchema.parse({ ...attachment, data: 'not base64!' })).toThrow();
    expect(() => AttachmentInputSchema.parse({ ...attachment, name: 'x'.repeat(RESOLVER_INPUT_LIMITS.attachmentName + 1) })).toThrow();
  });

  it('caps attachment count and total decoded request size', () => {
    const tinyAttachment = {
      name: 'note.txt',
      data: Buffer.from('ok').toString('base64'),
      mimeType: 'text/plain',
    };

    expect(() => StreamAgentEventsInputSchema.parse({
      query: 'hello',
      history: [],
      attachments: Array.from({ length: RESOLVER_INPUT_LIMITS.attachmentCount + 1 }, (_, index) => ({
        ...tinyAttachment,
        name: `note-${index}.txt`,
      })),
      sessionId: null,
      googleToken: null,
    })).toThrow();

    const largeAttachment = {
      name: 'chunk.txt',
      data: Buffer.alloc(RESOLVER_INPUT_LIMITS.attachmentBytes, 'a').toString('base64'),
      mimeType: 'text/plain',
    };

    expect(() => StreamAgentEventsInputSchema.parse({
      query: 'hello',
      history: [],
      attachments: [
        { ...largeAttachment, name: 'chunk-1.txt' },
        { ...largeAttachment, name: 'chunk-2.txt' },
        { ...tinyAttachment, name: 'extra.txt' },
      ],
      sessionId: null,
      googleToken: null,
    })).toThrow();
  });
});
