/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JarvishChatArea } from '@/frontend/features/jarvishAgent/components/JarvishChatArea';
import { AGENT_STATUS, BLOCK_TYPES, ROLES, STAGES } from '@/shared/jarvish.constants';

const session = {
  __typename: 'Session' as const,
  id: 'session-1',
  title: 'Calendar',
  createdAt: '2026-06-10T10:00:00.000Z',
  updatedAt: '2026-06-10T10:00:00.000Z',
  summary: {
    __typename: 'SessionSummary' as const,
    sessionId: 'session-1',
    summaryTitle: 'Meetings',
    userMessage: 'meetings today?',
    aiAnswer: 'You have one meeting.',
    createdAt: '2026-06-10T10:01:00.000Z',
  },
};

const baseProps = {
  messages: [],
  status: AGENT_STATUS.IDLE,
  statusMessage: null,
  confidenceSummary: null,
  errorMessage: null,
  currentStage: STAGES.PREPARE,
  isReasoningVisible: false,
  setIsReasoningVisible: vi.fn(),
  showFullConversation: true,
  setShowFullConversation: vi.fn(),
  currentSessionId: 'session-1',
  sessions: [session],
  onCopyToInput: vi.fn(),
  onSendMessage: vi.fn(async () => undefined),
};

describe('JarvishChatArea', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    Element.prototype.scrollTo = vi.fn();
  });

  it('renders summary mode and lets the user reuse or continue the research', () => {
    const props = {
      ...baseProps,
      showFullConversation: false,
      setShowFullConversation: vi.fn(),
      onCopyToInput: vi.fn(),
    };

    render(<JarvishChatArea {...props} />);

    expect(screen.getByText('Research Summary')).toBeInTheDocument();
    expect(screen.getByText('meetings today?')).toBeInTheDocument();
    expect(screen.getByText('You have one meeting.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reuse this query/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue research in chat/i }));

    expect(props.onCopyToInput).toHaveBeenCalledWith('meetings today?');
    expect(props.setShowFullConversation).toHaveBeenCalledWith(true);
  });

  it('renders no-session placeholder', () => {
    render(<JarvishChatArea {...baseProps} currentSessionId={null} />);

    expect(screen.getByText('Ready for Research')).toBeInTheDocument();
  });

  it('groups reasoning messages and toggles visibility', () => {
    const props = {
      ...baseProps,
      setIsReasoningVisible: vi.fn(),
      messages: [
        {
          id: 'reasoning-1',
          role: ROLES.REASONING,
          type: BLOCK_TYPES.REASONING,
          content: 'Checking calendar',
          timestamp: 1,
        },
        {
          id: 'agent-1',
          role: ROLES.AGENT,
          type: BLOCK_TYPES.TEXT,
          content: [{ type: BLOCK_TYPES.TEXT, content: 'Done.' }],
          timestamp: 2,
        },
      ],
    };

    render(<JarvishChatArea {...props} />);
    fireEvent.click(screen.getByText('Thought Process (1 steps)'));

    expect(props.setIsReasoningVisible).toHaveBeenCalledWith(true);
    expect(screen.getByText('Done.')).toBeInTheDocument();
  });

  it('shows active work, confidence, and error state', () => {
    render(<JarvishChatArea
      {...baseProps}
      status={AGENT_STATUS.THINKING}
      statusMessage="Calling Gemini"
      confidenceSummary={{ latest: 80, lowest: 55, reason: 'Tool output was thin' }}
      errorMessage="Gemini denied"
      currentStage={STAGES.RESEARCH}
    />);

    expect(screen.getByText('Calling Gemini')).toBeInTheDocument();
    expect(screen.getByText('Latest: 80%')).toBeInTheDocument();
    expect(screen.getByText('Lowest: 55%')).toBeInTheDocument();
    expect(screen.getByText('Reason: Tool output was thin')).toBeInTheDocument();
    expect(screen.getByText('Execution Error')).toBeInTheDocument();
    expect(screen.getByText('Gemini denied')).toBeInTheDocument();
  });
});
