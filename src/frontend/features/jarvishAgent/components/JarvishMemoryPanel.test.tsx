/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JarvishMemoryPanel } from '@/frontend/features/jarvishAgent/components/JarvishMemoryPanel';

const mocks = vi.hoisted(() => ({
  useJarvishMemory: vi.fn(),
}));

vi.mock('@/frontend/features/jarvishAgent/hooks/useJarvishMemory', () => ({
  useJarvishMemory: mocks.useJarvishMemory,
}));

describe('JarvishMemoryPanel', () => {
  it('renders the empty memory state', () => {
    mocks.useJarvishMemory.mockReturnValue({
      facts: [],
      isFetching: false,
      fetchFacts: vi.fn(),
      deleteFact: vi.fn(),
    });

    render(<JarvishMemoryPanel idToken="id-token" />);

    expect(screen.getByText('Jarvish Memory')).toBeInTheDocument();
    expect(screen.getByText("Jarvish hasn't learned any specific facts about you yet.")).toBeInTheDocument();
  });

  it('refreshes and deletes facts', () => {
    const fetchFacts = vi.fn();
    const deleteFact = vi.fn();
    mocks.useJarvishMemory.mockReturnValue({
      facts: [{
        id: 'fact-1',
        sessionId: null,
        fact: 'User prefers concise answers',
        category: 'preference',
        confidence: 95,
        createdAt: '2026-06-10',
      }],
      isFetching: false,
      fetchFacts,
      deleteFact,
    });

    render(<JarvishMemoryPanel idToken="id-token" />);
    expect(screen.getByText('PREFERENCE')).toBeInTheDocument();
    expect(screen.getByText('User prefers concise answers')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '' }));
    fireEvent.click(screen.getByTitle('Forget this fact'));

    expect(fetchFacts).toHaveBeenCalledTimes(1);
    expect(deleteFact).toHaveBeenCalledWith('fact-1');
  });
});
