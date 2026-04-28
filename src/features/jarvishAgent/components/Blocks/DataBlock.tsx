import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import styles from '../../jarvish-agent.module.scss';

interface DataBlockProps {
  displayType: 'table' | 'chart';
  title?: string;
  data: any[];
}

export const DataBlock: React.FC<DataBlockProps> = React.memo(({ displayType, title, data }) => {
  console.log(`[DataBlock] Rendering ${displayType}:`, { title, dataLength: data?.length, data });

  if (displayType === 'table') {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return <div className={styles.dataBlock}>No data available for table.</div>;
    }
    const headers = Object.keys(data[0]);

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
              {data.map((row, i) => (
                <tr key={i}>
                  {headers.map(h => <td key={h}>{String(row[h])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
