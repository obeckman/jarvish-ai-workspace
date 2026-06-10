/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DraftBlock } from '@/frontend/features/jarvishAgent/components/Blocks/DraftBlock';

describe('DraftBlock', () => {
  it('renders draft metadata and opens the side panel affordance', () => {
    const onClick = vi.fn();

    render(<DraftBlock
      title="CV Draft"
      content="This is a long draft for the reviewer path section."
      onClick={onClick}
    />);

    expect(screen.getByText('CV Draft')).toBeInTheDocument();
    expect(screen.getByText('This is a long draft for the reviewer path section....')).toBeInTheDocument();
    fireEvent.click(screen.getByText('See Side Panel'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
