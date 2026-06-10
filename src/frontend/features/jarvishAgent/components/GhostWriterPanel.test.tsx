/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GhostWriterPanel } from '@/frontend/features/jarvishAgent/components/GhostWriterPanel';

describe('GhostWriterPanel', () => {
  it('renders nothing when hidden', () => {
    const { container } = render(<GhostWriterPanel
      content="Draft"
      isVisible={false}
      onAction={vi.fn()}
      onClose={vi.fn()}
    />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders draft content and dispatches editing actions', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();

    render(<GhostWriterPanel
      title="Reviewer Path"
      content="A concise reviewer path."
      isVisible
      onAction={onAction}
      onClose={onClose}
    />);

    expect(screen.getByText('Reviewer Path')).toBeInTheDocument();
    expect(screen.getByText('A concise reviewer path.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /professional/i }));
    fireEvent.click(screen.getByRole('button', { name: /shorten/i }));
    fireEvent.click(screen.getByRole('button', { name: /add table/i }));
    fireEvent.click(screen.getByRole('button', { name: /enhance/i }));
    fireEvent.click(screen.getByRole('button', { name: '×' }));

    expect(onAction).toHaveBeenNthCalledWith(1, 'Make more professional');
    expect(onAction).toHaveBeenNthCalledWith(2, 'Shorten');
    expect(onAction).toHaveBeenNthCalledWith(3, 'Add Table');
    expect(onAction).toHaveBeenNthCalledWith(4, 'Enhance with examples');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
