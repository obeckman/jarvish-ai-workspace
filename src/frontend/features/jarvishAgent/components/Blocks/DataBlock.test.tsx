/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataBlock } from '@/frontend/features/jarvishAgent/components/Blocks/DataBlock';
import { DISPLAY_TYPE } from '@/shared/jarvish.constants';

describe('DataBlock', () => {
  it('renders editable table data and reports changed cells to the agent', () => {
    const onAction = vi.fn();

    render(<DataBlock
      displayType={DISPLAY_TYPE.TABLE}
      title="Meetings"
      data={[{ name: 'Standup', value: 30 }]}
      onAction={onAction}
    />);

    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByText('name')).toBeInTheDocument();
    const input = screen.getByDisplayValue('Standup');
    fireEvent.change(input, { target: { value: 'Planning' } });
    fireEvent.blur(input);

    expect(onAction).toHaveBeenCalledWith(expect.stringContaining("column 'name' changed from 'Standup' to 'Planning'"));
  });

  it('does not report unchanged table cells', () => {
    const onAction = vi.fn();

    render(<DataBlock
      displayType={DISPLAY_TYPE.TABLE}
      data={[{ name: 'Standup' }]}
      onAction={onAction}
    />);

    fireEvent.blur(screen.getByDisplayValue('Standup'));

    expect(onAction).not.toHaveBeenCalled();
  });

  it('handles empty or non-row table data gracefully', () => {
    render(<DataBlock displayType={DISPLAY_TYPE.TABLE} data={{ invalid: true }} />);

    expect(screen.getByText('No data available for table.')).toBeInTheDocument();
  });
});
