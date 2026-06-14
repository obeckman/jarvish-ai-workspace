import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import styles from '../../jarvish-agent.module.scss';
import { DISPLAY_TYPE } from '@/shared/jarvish.constants';
import { DataBlockSchema } from '@/shared/jarvish.blocks';

type DataRow = Record<string, string | number | boolean | null>;

interface DataBlockProps {
  displayType: (typeof DISPLAY_TYPE)[keyof typeof DISPLAY_TYPE];
  title?: string;
  data: z.infer<typeof DataBlockSchema>['data'];
  onAction?: (label: string) => void;
}

export const DataBlock: React.FC<DataBlockProps> = React.memo(({ displayType, title, data, onAction }) => {
  const [tableData, setTableData] = useState<DataRow[]>(toDataRows(data));

  useEffect(() => {
    setTableData(toDataRows(data));
  }, [data]);

  const handleCellBlur = (rowIndex: number, column: string, newValue: string, oldValue: string) => {
    if (newValue === oldValue) return;

    const updatedData = [...tableData];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [column]: newValue };
    setTableData(updatedData);

    if (onAction) {
      const updateMessage = `[x-block-update] User updated '${title || DISPLAY_TYPE.TABLE}' data. Row ${rowIndex + 1}, column '${column}' changed from '${oldValue}' to '${newValue}'. Please recalculate the summary based on this new data.`;
      onAction(updateMessage);
    }
  };

  if (displayType === DISPLAY_TYPE.TABLE) {
    if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
      return <div className={styles.dataBlock}>No data available for table.</div>;
    }
    const headers = Object.keys(tableData[0]);

    return (
      <div className={styles.dataBlock}>
        {title && <h4 className={styles.dataTitle}>{title}</h4>}
        <div className={styles.tableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                {headers.map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, i) => (
                <tr key={i}>
                  {headers.map(h => (
                    <td key={`${i}-${h}`}>
                      <input 
                        type="text" 
                        defaultValue={String(row[h])}
                        onBlur={(e) => handleCellBlur(i, h, e.target.value, String(row[h]))}
                        className={styles.editableCell}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.editHint}>* Cells are editable. Changing a value updates the agent's context.</p>
      </div>
    );
  }

  const chartData = toDataRows(data);
  const chartKeys = inferChartKeys(chartData);

  if (chartData.length === 0 || !chartKeys) {
    return <div className={styles.dataBlock}>No data available for chart.</div>;
  }

  const chartProps = {
    width: 600,
    height: 300,
    data: chartData,
  };
  const axisAndTooltip = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
      <XAxis dataKey={chartKeys.xKey} stroke="rgba(255,255,255,0.5)" fontSize={12} />
      <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
      <Tooltip 
        contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
        itemStyle={{ color: '#38bdf8' }}
      />
    </>
  );

  const shouldRenderLine = chartData.length > 8 || /^(date|year|time|month|quarter)$/i.test(chartKeys.xKey);

  return (
    <div className={styles.dataBlock}>
      {title && <h4 className={styles.dataTitle}>{title}</h4>}
      <div className={styles.chartWrapper} style={{ height: '300px' }}>
        {shouldRenderLine ? (
          <LineChart {...chartProps}>
            {axisAndTooltip}
            <Line
              type="monotone"
              dataKey={chartKeys.yKey}
              stroke="#38bdf8"
              strokeWidth={2}
              dot={chartData.length <= 24}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        ) : (
          <BarChart {...chartProps}>
            {axisAndTooltip}
            <Bar dataKey={chartKeys.yKey} fill="#38bdf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </div>
    </div>
  );
});

DataBlock.displayName = 'DataBlock';

function toDataRows(data: z.infer<typeof DataBlockSchema>['data']): DataRow[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter((item): item is DataRow => isDataRow(item));
}

function isDataRow(value: unknown): value is DataRow {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(isDataCellValue);
}

function isDataCellValue(value: unknown): value is DataRow[string] {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function inferChartKeys(rows: DataRow[]): { xKey: string; yKey: string } | null {
  const firstRow = rows[0];
  if (!firstRow) {
    return null;
  }

  const keys = Object.keys(firstRow);
  const numericKeys = keys.filter((key) => rows.some((row) => typeof row[key] === 'number'));
  if (numericKeys.length === 0) {
    return null;
  }

  const preferredXKey = keys.find((key) => /^(name|label|date|year|time|month|quarter)$/i.test(key));
  const xKey = preferredXKey ?? keys.find((key) => !numericKeys.includes(key)) ?? keys[0];
  const yKey = numericKeys.find((key) => key !== xKey) ?? numericKeys[0];

  return xKey && yKey ? { xKey, yKey } : null;
}
