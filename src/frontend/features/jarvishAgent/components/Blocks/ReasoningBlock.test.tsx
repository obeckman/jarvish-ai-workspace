/**
 * @vitest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReasoningBlock } from '@/frontend/features/jarvishAgent/components/Blocks/ReasoningBlock';

describe('ReasoningBlock', () => {
  it('renders a titled reasoning details block', () => {
    render(<ReasoningBlock title="Calendar reasoning" content="Checked the calendar tool." />);

    expect(screen.getByText('Calendar reasoning')).toBeInTheDocument();
    expect(screen.getByText('Checked the calendar tool.')).toBeInTheDocument();
  });
});
