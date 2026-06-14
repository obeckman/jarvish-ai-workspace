/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodeBlock } from '@/frontend/features/jarvishAgent/components/Blocks/CodeBlock';

describe('Jarvish CodeBlock', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders code with language metadata and copy control', async () => {
    render(<CodeBlock language="jsx" content="export default function App() { return <div />; }" />);

    expect(screen.getByText('jsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    expect(screen.getByText(/export default function App/)).toBeInTheDocument();
  });

  it('copies code through navigator.clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(<CodeBlock language="javascript" content="const value = 1;" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('const value = 1;'));
    expect(await screen.findByRole('button', { name: 'Copied code' })).toBeInTheDocument();
  });

  it('marks copy failures when clipboard write rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });

    render(<CodeBlock language="javascript" content="const value = 1;" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));

    expect(await screen.findByRole('button', { name: 'Failed to copy code' })).toBeInTheDocument();
  });

  it('falls back to document.execCommand when clipboard API is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    render(<CodeBlock language="javascript" content="const value = 1;" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith('copy'));
    expect(await screen.findByRole('button', { name: 'Copied code' })).toBeInTheDocument();
  });

  it('uses the default highlighter language for unsupported labels', () => {
    render(<CodeBlock language="brainfuck" content="+++" />);

    expect(screen.getByText('brainfuck')).toBeInTheDocument();
    expect(screen.getByText('+++')).toBeInTheDocument();
  });
});
