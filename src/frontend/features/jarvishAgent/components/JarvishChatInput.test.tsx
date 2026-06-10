/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JarvishChatInput } from '@/frontend/features/jarvishAgent/components/JarvishChatInput';
import { AGENT_STATUS } from '@/shared/jarvish.constants';

const baseProps = {
  input: 'check calendar',
  setInput: vi.fn(),
  status: AGENT_STATUS.IDLE,
  statusLogs: [] as string[],
  showAllLogs: false,
  setShowAllLogs: vi.fn(),
  attachments: [],
  onFileUpload: vi.fn(),
  onRemoveAttachment: vi.fn(),
  onSendMessage: vi.fn(),
  onCancelRequest: vi.fn(),
  onClearInput: vi.fn(),
};

describe('JarvishChatInput', () => {
  it('updates input and sends on Enter without Shift', () => {
    const props = { ...baseProps, setInput: vi.fn(), onSendMessage: vi.fn() };

    render(<JarvishChatInput {...props} />);
    fireEvent.change(screen.getByPlaceholderText('Type your research request...'), {
      target: { value: 'new query' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Type your research request...'), {
      key: 'Enter',
      shiftKey: false,
    });

    expect(props.setInput).toHaveBeenCalledWith('new query');
    expect(props.onSendMessage).toHaveBeenCalledTimes(1);
  });

  it('does not send on Shift+Enter', () => {
    const props = { ...baseProps, onSendMessage: vi.fn() };

    render(<JarvishChatInput {...props} />);
    fireEvent.keyDown(screen.getByPlaceholderText('Type your research request...'), {
      key: 'Enter',
      shiftKey: true,
    });

    expect(props.onSendMessage).not.toHaveBeenCalled();
  });

  it('renders attachments, removes them, and toggles logs', () => {
    const props = {
      ...baseProps,
      statusLogs: ['Preparing', 'Calling tool'],
      attachments: [{ name: 'brief.pdf', data: 'base64', mimeType: 'application/pdf' }],
      setShowAllLogs: vi.fn(),
      onRemoveAttachment: vi.fn(),
    };

    render(<JarvishChatInput {...props} />);
    expect(screen.getByText('Calling tool')).toBeInTheDocument();
    expect(screen.getByText('brief.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Show Full Execution Log'));
    fireEvent.click(screen.getByTitle('Remove attachment'));

    expect(props.setShowAllLogs).toHaveBeenCalledWith(true);
    expect(props.onRemoveAttachment).toHaveBeenCalledWith(0);
  });

  it('shows stop control while busy', () => {
    const props = {
      ...baseProps,
      status: AGENT_STATUS.THINKING,
      onCancelRequest: vi.fn(),
    };

    render(<JarvishChatInput {...props} />);
    fireEvent.click(screen.getByTitle('Stop Research'));

    expect(props.onCancelRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText('Type your research request...')).toBeDisabled();
  });
});
