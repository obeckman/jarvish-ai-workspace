/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChatMessage } from '@/frontend/features/jarvishAgent/components/Blocks/ChatMessage';
import { BLOCK_TYPES, ROLES } from '@/shared/jarvish.constants';

describe('Jarvish ChatMessage', () => {
  it('renders user messages as authored by the user', () => {
    render(<ChatMessage message={{
      id: 'user-1',
      role: ROLES.USER,
      type: BLOCK_TYPES.TEXT,
      content: 'Can you check my calendar?',
      timestamp: 1,
    }} />);

    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('Can you check my calendar?')).toBeInTheDocument();
  });

  it('renders agent text blocks through the block renderer', async () => {
    render(<ChatMessage message={{
      id: 'agent-1',
      role: ROLES.AGENT,
      type: BLOCK_TYPES.TEXT,
      content: [{ type: BLOCK_TYPES.TEXT, content: 'You have one meeting today.' }],
      timestamp: 2,
    }} />);

    expect(screen.getByText('Jarvish')).toBeInTheDocument();
    expect(await screen.findByText('You have one meeting today.')).toBeInTheDocument();
  });
});
