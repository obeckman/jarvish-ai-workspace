/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ActionBlock } from '@/frontend/features/jarvishAgent/components/Blocks/ActionBlock';

describe('ActionBlock', () => {
  it('fires the action label and enters loading state when clicked', () => {
    const onAction = vi.fn();

    render(<ActionBlock actionId="continue" label="Continue research" onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: /continue research/i }));

    expect(onAction).toHaveBeenCalledWith('Continue research');
    expect(screen.getByRole('button', { name: /continue research/i })).toBeDisabled();
  });

  it('respects disabled and external loading states', () => {
    const onAction = vi.fn();

    render(<ActionBlock actionId="continue" label="Continue research" disabled loading onAction={onAction} />);
    fireEvent.click(screen.getByRole('button', { name: /continue research/i }));

    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /continue research/i })).toBeDisabled();
  });
});
