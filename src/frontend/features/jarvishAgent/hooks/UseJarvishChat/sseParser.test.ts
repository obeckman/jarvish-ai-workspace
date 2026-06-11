import { describe, expect, it } from 'vitest';

import { SseParser } from './sseParser';

describe('SseParser', () => {
  it('emits data payloads at SSE event boundaries', () => {
    const parser = new SseParser();

    expect(parser.push('event: message\ndata: first\nid: 1\n\n')).toEqual(['first']);
    expect(parser.push('data: second\r\n\r\n')).toEqual(['second']);
    expect(parser.flush()).toEqual([]);
  });

  it('joins multiline data fields and ignores comments and other fields', () => {
    const parser = new SseParser();

    const messages = parser.push([
      ': heartbeat',
      'event: next',
      'retry: 1000',
      'data: {',
      'data:   "ok": true',
      'data: }',
      '',
      '',
    ].join('\n'));

    expect(messages).toEqual(['{\n  "ok": true\n}']);
  });

  it('preserves incomplete lines across chunks and flushes the final event', () => {
    const parser = new SseParser();

    expect(parser.push('data: hel')).toEqual([]);
    expect(parser.push('lo\n\ndata: tail')).toEqual(['hello']);
    expect(parser.flush()).toEqual(['tail']);
  });
});
