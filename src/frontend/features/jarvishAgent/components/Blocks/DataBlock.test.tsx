/**
 * @vitest-environment jsdom
 */
import type React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DataBlock } from '@/frontend/features/jarvishAgent/components/Blocks/DataBlock';
import { DISPLAY_TYPE } from '@/shared/jarvish.constants';

vi.mock('recharts', () => ({
  BarChart: ({ children, data }: { children?: React.ReactNode; data: unknown[] }) => (
    <div data-testid="bar-chart" data-rows={data.length}>{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  LineChart: ({ children, data }: { children?: React.ReactNode; data: unknown[] }) => (
    <div data-testid="line-chart" data-rows={data.length}>{children}</div>
  ),
  Line: ({ dataKey }: { dataKey?: string }) => <div data-testid="line" data-key={dataKey} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

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

  it('renders chart data', () => {
    render(<DataBlock
      displayType={DISPLAY_TYPE.CHART}
      title="Scores"
      data={[{ name: 'A', value: 10 }]}
    />);

    expect(screen.getByText('Scores')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toHaveAttribute('data-rows', '1');
    expect(screen.getByTestId('bar')).toBeInTheDocument();
  });

  it('renders time-series chart data with inferred axes', () => {
    render(<DataBlock
      displayType={DISPLAY_TYPE.CHART}
      title="S&P 500"
      data={[
        { year: 2020, close: 3756.07 },
        { year: 2021, close: 4766.18 },
      ]}
    />);

    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toHaveAttribute('data-rows', '2');
    expect(screen.getByTestId('line')).toHaveAttribute('data-key', 'close');
  });

  it('handles empty or invalid chart data gracefully', () => {
    render(<DataBlock displayType={DISPLAY_TYPE.CHART} data={[['not', 'a', 'row']]} />);

    expect(screen.getByText('No data available for chart.')).toBeInTheDocument();
  });

  it('keeps rows with primitive and null cell values', () => {
    render(<DataBlock
      displayType={DISPLAY_TYPE.TABLE}
      data={[{ name: 'Standup', active: true, count: 1, note: null }]}
    />);

    expect(screen.getByDisplayValue('Standup')).toBeInTheDocument();
    expect(screen.getByDisplayValue('true')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('null')).toBeInTheDocument();
  });
});
