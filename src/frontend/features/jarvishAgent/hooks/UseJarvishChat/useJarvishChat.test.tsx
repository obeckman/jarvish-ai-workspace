/**
 * @vitest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useJarvishChat } from '@/frontend/features/jarvishAgent/hooks/UseJarvishChat';
import { AGENT_STATUS, BLOCK_TYPES, ROLES, STAGES } from '@/shared/jarvish.constants';

describe('useJarvishChat', () => {
  const fetchMock = vi.fn();
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

  beforeEach(() => {
    fetchMock.mockReset();
    consoleError.mockClear();
    consoleWarn.mockClear();
    consoleLog.mockClear();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads persisted session history into normalized UI messages', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          getSessionHistory: [
            { type: 'message', role: ROLES.USER, content: 'hello' },
            { type: 'message', role: ROLES.AGENT, content: JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: 'hi' }]) },
          ],
        },
      }),
    });
    const { result } = renderHook(() => useJarvishChat('session-1', 'id-token', null));

    await act(async () => {
      await result.current.loadSessionHistory('session-1');
    });

    expect(result.current.status).toBe(AGENT_STATUS.IDLE);
    expect(result.current.messages).toEqual([
      expect.objectContaining({ role: ROLES.USER, content: 'hello' }),
      expect.objectContaining({ role: ROLES.AGENT, content: [{ type: BLOCK_TYPES.TEXT, content: 'hi' }] }),
    ]);
  });

  it('surfaces session-history GraphQL failures', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errors: [{ message: 'history unavailable' }] }),
    });
    const { result } = renderHook(() => useJarvishChat('session-1', 'id-token', null));

    await act(async () => {
      await result.current.loadSessionHistory('session-1');
    });

    expect(result.current.errorMessage).toBe('Failed to load conversation history.');
    expect(consoleError).toHaveBeenCalledWith('Failed to load history:', expect.any(Error));
  });

  it('streams status, reasoning, message, and confidence updates from GraphQL SSE', async () => {
    const checkAndRefreshToken = vi.fn().mockResolvedValue('fresh-token');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      body: createTextStream([
        sseLine({ type: 'STATUS', content: 'Researching', stage: STAGES.RESEARCH, metadata: { confidence: 80, validationReason: 'ok' } }),
        sseLine({ type: 'REASONING', content: 'Checking tools', stage: null, metadata: null }),
        sseLine({ type: 'MESSAGE', content: JSON.stringify([{ type: BLOCK_TYPES.TEXT, content: 'Done' }]), stage: null, metadata: { confidence: 95 } }),
      ]),
    });
    const { result } = renderHook(() => useJarvishChat('session-1', 'id-token', 'old-token', checkAndRefreshToken));

    await act(async () => {
      result.current.setInput('check calendar');
    });
    await waitFor(() => expect(result.current.input).toBe('check calendar'));

    await act(async () => {
      await result.current.sendMessage('session-1');
    });

    expect(fetchMock).toHaveBeenCalledWith('/graphql', expect.objectContaining({
      headers: expect.objectContaining({
        'x-google-token': 'fresh-token',
        Accept: 'text/event-stream',
      }),
    }));
    expect(result.current.status).toBe(AGENT_STATUS.IDLE);
    expect(result.current.statusLogs).toEqual(['Researching']);
    expect(result.current.confidenceSummary).toEqual({
      latest: 95,
      lowest: 80,
      reason: 'ok',
    });
    expect(result.current.messages).toEqual([
      expect.objectContaining({ role: ROLES.USER, content: 'check calendar' }),
      expect.objectContaining({ role: ROLES.REASONING, content: 'Checking tools' }),
      expect.objectContaining({ role: ROLES.AGENT, content: [{ type: BLOCK_TYPES.TEXT, content: 'Done' }] }),
    ]);
  });

  it('records parse errors for malformed SSE events', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      body: createTextStream(['data: {bad-json}\n']),
    });
    const { result } = renderHook(() => useJarvishChat('session-1', 'id-token', null));

    await act(async () => {
      result.current.setInput('broken stream');
    });
    await waitFor(() => expect(result.current.input).toBe('broken stream'));

    await act(async () => {
      await result.current.sendMessage('session-1');
    });

    expect(result.current.errorMessage).toContain('Failed to parse SSE event');
    expect(consoleWarn).toHaveBeenCalledWith('processStreamLines : Failed to parse SSE JSON:', expect.any(Object));
  });

  it('rejects oversized attachments before reading them', () => {
    const { result } = renderHook(() => useJarvishChat('session-1', 'id-token', null));
    const file = new File(['too large'], 'large.pdf', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });

    act(() => {
      result.current.addAttachment(file);
    });

    expect(result.current.errorMessage).toBe('File too large. Max 10MB per file.');
  });
});

function sseLine(agentEvents: unknown): string {
  return `data: ${JSON.stringify({ data: { agentEvents } })}\n`;
}

function createTextStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}
