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

  it('parses stringified agent code blocks before rendering', async () => {
    const content = JSON.stringify([
      { type: BLOCK_TYPES.TEXT, content: "Here's a React component:" },
      {
        type: BLOCK_TYPES.CODE,
        language: 'jsx',
        content: "import React from 'react';\n\nexport default function Hoverable() {\n  return <button>Hover me</button>;\n}",
      },
    ]);

    render(<ChatMessage message={{
      id: 'agent-2',
      role: ROLES.AGENT,
      type: BLOCK_TYPES.TEXT,
      content,
      timestamp: 3,
    }} />);

    expect(await screen.findByText("Here's a React component:")).toBeInTheDocument();
    expect(await screen.findByText('jsx')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    expect(screen.queryByText(content)).not.toBeInTheDocument();
  });

  it('renders legacy unfenced agent code as a code block', async () => {
    const content = `Here is a component:
import React from 'react';

const Hoverable = () => {
  return <button>Hover me</button>;
};

export default Hoverable;
Explanation:
It changes visually on hover.`;

    render(<ChatMessage message={{
      id: 'agent-3',
      role: ROLES.AGENT,
      type: BLOCK_TYPES.TEXT,
      content,
      timestamp: 4,
    }} />);

    expect(await screen.findByText('Here is a component:')).toBeInTheDocument();
    expect(await screen.findByText('jsx')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    expect(await screen.findByText(/Explanation:/)).toBeInTheDocument();
    expect(screen.queryByText(content)).not.toBeInTheDocument();
  });
});
