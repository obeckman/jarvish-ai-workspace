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

  it('renders expanded logs and hides them on toggle', () => {
    const props = {
      ...baseProps,
      statusLogs: ['Preparing', 'Calling tool'],
      showAllLogs: true,
      setShowAllLogs: vi.fn(),
    };

    render(<JarvishChatInput {...props} />);

    expect(screen.getAllByText('Preparing')).toHaveLength(1);
    expect(screen.getAllByText('Calling tool')).toHaveLength(2);
    fireEvent.click(screen.getByTitle('Hide Logs'));

    expect(props.setShowAllLogs).toHaveBeenCalledWith(false);
  });

  it('uploads selected files and clears the native file input', () => {
    const props = { ...baseProps, onFileUpload: vi.fn() };
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });

    render(<JarvishChatInput {...props} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(props.onFileUpload).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('clears input through the clear control', () => {
    const props = { ...baseProps, onClearInput: vi.fn() };

    render(<JarvishChatInput {...props} />);
    fireEvent.click(screen.getByTitle('Clear Input'));

    expect(props.onClearInput).toHaveBeenCalledTimes(1);
  });

  it('disables send when input is blank', () => {
    render(<JarvishChatInput {...baseProps} input="   " />);

    expect(screen.getByTitle('Send Message')).toBeDisabled();
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
