/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JarvishSidebar } from '@/frontend/features/jarvishAgent/components/JarvishSidebar';

const sessions = [
  {
    __typename: 'Session' as const,
    id: 'session-1',
    title: 'Calendar research',
    createdAt: '2026-06-10T10:00:00.000Z',
    updatedAt: '2026-06-10T10:05:00.000Z',
    summary: {
      __typename: 'SessionSummary' as const,
      sessionId: 'session-1',
      summaryTitle: 'Meeting summary',
      userMessage: 'meetings today?',
      aiAnswer: 'One meeting today.',
      createdAt: '2026-06-10T10:06:00.000Z',
    },
  },
  {
    __typename: 'Session' as const,
    id: 'session-2',
    title: 'Unsummarized',
    createdAt: '2026-06-10T11:00:00.000Z',
    updatedAt: '2026-06-10T11:05:00.000Z',
    summary: null,
  },
];

const baseProps = {
  sessions,
  currentSessionId: 'session-2',
  searchTerm: '',
  setSearchTerm: vi.fn(),
  onSelectSession: vi.fn(),
  onCreateSession: vi.fn(),
  onDeleteSession: vi.fn(),
  onTriggerSummary: vi.fn(),
  onLoadMore: vi.fn(),
  hasMore: true,
  isFetching: false,
  isPollingSummary: false,
};

describe('JarvishSidebar', () => {
  it('renders sessions, summaries, search, and load-more actions', () => {
    const props = {
      ...baseProps,
      setSearchTerm: vi.fn(),
      onCreateSession: vi.fn(),
      onLoadMore: vi.fn(),
    };

    render(<JarvishSidebar {...props} />);

    expect(screen.getByText('Research History')).toBeInTheDocument();
    expect(screen.getByText('Meeting summary')).toBeInTheDocument();
    expect(screen.getByText('One meeting today.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search sessions...'), {
      target: { value: 'meeting' },
    });
    fireEvent.click(screen.getByRole('button', { name: /new session/i }));
    fireEvent.click(screen.getByRole('button', { name: /load older sessions/i }));

    expect(props.setSearchTerm).toHaveBeenCalledWith('meeting');
    expect(props.onCreateSession).toHaveBeenCalledTimes(1);
    expect(props.onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('clears search and triggers summary/delete without selecting the session', () => {
    const props = {
      ...baseProps,
      searchTerm: 'calendar',
      setSearchTerm: vi.fn(),
      onTriggerSummary: vi.fn(),
      onDeleteSession: vi.fn(),
      onSelectSession: vi.fn(),
    };

    const { container } = render(<JarvishSidebar {...props} />);

    const clearSearchButton = container.querySelector('button[class*="clearSearch"]');
    expect(clearSearchButton).not.toBeNull();
    fireEvent.click(clearSearchButton as HTMLButtonElement);
    fireEvent.click(screen.getByRole('button', { name: /summarize/i }));
    const unsummarizedItem = screen.getByText('Unsummarized').closest('div[class*="sessionItem"]');
    expect(unsummarizedItem).not.toBeNull();
    const deleteButton = within(unsummarizedItem as HTMLElement).getAllByRole('button')[0];
    fireEvent.click(deleteButton);

    expect(props.setSearchTerm).toHaveBeenCalledWith('');
    expect(props.onTriggerSummary).toHaveBeenCalledWith('session-2', expect.any(Object));
    expect(props.onDeleteSession).toHaveBeenCalledWith('session-2', expect.any(Object));
    expect(props.onSelectSession).not.toHaveBeenCalled();
  });

  it('shows polling and empty states', () => {
    const { rerender } = render(<JarvishSidebar {...baseProps} isPollingSummary />);
    expect(screen.getByText('Generating Summary...')).toBeInTheDocument();

    rerender(<JarvishSidebar {...baseProps} sessions={[]} hasMore={false} />);
    expect(screen.getByText('No research sessions found.')).toBeInTheDocument();
  });
});
