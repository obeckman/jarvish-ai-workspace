/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JarvishHeader } from '@/frontend/features/jarvishAgent/components/JarvishHeader';

const baseProps = {
  currentSessionId: 'session-1',
  showFullConversation: false,
  setShowFullConversation: vi.fn(),
  googleToken: null as string | null,
  onLogin: vi.fn(),
  onLogout: vi.fn(),
  onResetUI: vi.fn(),
  viewMode: 'chat' as const,
  setViewMode: vi.fn(),
};

describe('JarvishHeader', () => {
  it('connects and disconnects Google auth from the header badge', () => {
    const loginProps = { ...baseProps, onLogin: vi.fn() };
    const { rerender } = render(<JarvishHeader {...loginProps} />);

    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(loginProps.onLogin).toHaveBeenCalledTimes(1);

    const logoutProps = {
      ...baseProps,
      googleToken: 'token',
      onLogout: vi.fn(),
    };
    rerender(<JarvishHeader {...logoutProps} />);

    fireEvent.click(screen.getByRole('button', { name: /connected/i }));
    expect(logoutProps.onLogout).toHaveBeenCalledTimes(1);
  });

  it('switches between memory, summary, and chat views', () => {
    const props = {
      ...baseProps,
      setViewMode: vi.fn(),
      setShowFullConversation: vi.fn(),
    };

    render(<JarvishHeader {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /memory/i }));
    fireEvent.click(screen.getByRole('button', { name: /summary/i }));
    fireEvent.click(screen.getByRole('button', { name: /^chat$/i }));

    expect(props.setViewMode).toHaveBeenNthCalledWith(1, 'memory');
    expect(props.setViewMode).toHaveBeenNthCalledWith(2, 'chat');
    expect(props.setShowFullConversation).toHaveBeenNthCalledWith(1, false);
    expect(props.setViewMode).toHaveBeenNthCalledWith(3, 'chat');
    expect(props.setShowFullConversation).toHaveBeenNthCalledWith(2, true);
  });

  it('does not render session-specific view toggles before a session exists', () => {
    render(<JarvishHeader {...baseProps} currentSessionId={null} />);

    expect(screen.queryByRole('button', { name: /summary/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^chat$/i })).not.toBeInTheDocument();
  });

  it('resets the Jarvish UI from the reset button', () => {
    const props = { ...baseProps, onResetUI: vi.fn() };

    render(<JarvishHeader {...props} />);
    fireEvent.click(screen.getByTitle('Reset Chat UI'));

    expect(props.onResetUI).toHaveBeenCalledTimes(1);
  });
});
