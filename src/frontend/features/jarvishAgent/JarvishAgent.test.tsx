/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JarvishAgent } from '@/frontend/features/jarvishAgent/JarvishAgent';
import { AGENT_STATUS, BLOCK_TYPES, ROLES, STAGES } from '@/shared/jarvish.constants';

vi.mock('@/frontend/features/jarvishAgent/hooks/useGoogleAuth', () => ({
  useGoogleAuth: () => ({
    googleToken: 'google-token',
    googleIdToken: 'id-token',
    loginWithGoogle: vi.fn(),
    logout: vi.fn(),
    authError: null,
    setAuthError: vi.fn(),
    checkAndRefreshToken: vi.fn(async () => 'google-token'),
    checkAndRefreshIdToken: vi.fn(async () => 'id-token'),
  }),
}));

vi.mock('@/frontend/features/jarvishAgent/hooks/useJarvishSessions', () => ({
  useJarvishSessions: () => ({
    sessions: [
      {
        __typename: 'Session',
        id: 'session-1',
        title: 'Workspace smoke',
        createdAt: '2026-06-10T10:00:00.000Z',
        updatedAt: '2026-06-10T10:05:00.000Z',
        summary: null,
      },
    ],
    currentSessionId: 'session-1',
    setCurrentSessionId: vi.fn(),
    isFetchingSessions: false,
    hasMore: false,
    fetchSessions: vi.fn(),
    createNewSession: vi.fn(async () => 'session-2'),
    deleteSession: vi.fn(),
    triggerSummary: vi.fn(),
    isPolling: false,
  }),
}));

vi.mock('@/frontend/features/jarvishAgent/hooks/UseJarvishChat', () => ({
  useJarvishChat: () => ({
    messages: [
      {
        id: 'agent-1',
        role: ROLES.AGENT,
        type: BLOCK_TYPES.TEXT,
        content: [{ type: BLOCK_TYPES.TEXT, content: 'Jarvish workspace render check.' }],
        timestamp: 1,
      },
    ],
    input: '',
    setInput: vi.fn(),
    status: AGENT_STATUS.IDLE,
    statusMessage: null,
    statusLogs: [],
    confidenceSummary: null,
    currentStage: STAGES.PREPARE,
    attachments: [],
    errorMessage: null,
    setErrorMessage: vi.fn(),
    isReasoningVisible: false,
    setIsReasoningVisible: vi.fn(),
    sendMessage: vi.fn(async () => undefined),
    cancelRequest: vi.fn(),
    addAttachment: vi.fn(),
    removeAttachment: vi.fn(),
    clearMessages: vi.fn(),
    loadSessionHistory: vi.fn(),
  }),
}));

describe('JarvishAgent workspace', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
  });

  it('renders the assembled workspace with sidebar, header, messages, and composer', async () => {
    render(<JarvishAgent />);

    expect(screen.getByText('Research History')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Jarvish' })).toBeInTheDocument();
    expect(await screen.findByText('Jarvish workspace render check.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your research request...')).toBeInTheDocument();
  });
});
