import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import styles from '../../jarvish-agent.module.scss';
import { DISPLAY_TYPE } from '@/shared/jarvish.constants';

interface DataBlockProps {
  displayType: (typeof DISPLAY_TYPE)[keyof typeof DISPLAY_TYPE];
  title?: string;
  data: any[];
  onAction?: (label: string) => void;
}

export const DataBlock: React.FC<DataBlockProps> = React.memo(({ displayType, title, data, onAction }) => {
  const [tableData, setTableData] = useState<any[]>(data);

  useEffect(() => {
    setTableData(data);
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

  if (!data || !Array.isArray(data) || data.length === 0) {
    return <div className={styles.dataBlock}>No data available for chart.</div>;
  }

  return (
    <div className={styles.dataBlock}>
      {title && <h4 className={styles.dataTitle}>{title}</h4>}
      <div className={styles.chartWrapper} style={{ height: '300px' }}>
        <BarChart width={600} height={300} data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
          <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
          <Tooltip 
            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#38bdf8' }}
          />
          <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </div>
    </div>
  );
});

DataBlock.displayName = 'DataBlock';
