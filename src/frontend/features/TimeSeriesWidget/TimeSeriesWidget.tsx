/**
 #15. The "Third-Party Widget" Integration

I. The Interview Question
"I have a legacy, vanilla JavaScript charting library called LegacyChart. It takes a DOM node to mount, and it has an .update(data) method to animate transitions. 
Please build a React component TimeSeriesWidget that takes a stream of live data props and renders this chart."

The Deception: This sounds like a simple useEffect wrapper task. The hidden complexity is Reconciliation Bypass. If you simply re-run the initialization logic every time the data changes, 
the chart will flash, reset its internal state (zoom level, tooltips), and leak memory. 
If you let React touch the DOM inside the chart's container, the application will crash.

 */
import React from 'react';
import { clientLogger } from '@/frontend/utils/clientLogger';
import { TimeSeriesWidgetProps, TimeSeriesWidgetDataPoint } from './types';
import './TimeSeriesWidget.css';


const LegacyChart = (domElement: HTMLDivElement) => {
    clientLogger.debug('Chart created');

    domElement.innerHTML = "Legacy Chart Mounted";
    return {
        update: (data: Array<{ timestamp: number; value: number }>) => {
            domElement.innerHTML = `Legacy Chart updated with:  ${JSON.stringify(data)}`;
        },
        destroy: () => {
            clientLogger.debug('Chart destroyed');
        }
    }
}
type LegacyChartInstance = ReturnType<typeof LegacyChart>;

const TimeSeriesWidget = React.memo(({ data, width = '100%', height = '100%', className }: TimeSeriesWidgetProps) => {

    const chartRef = React.useRef<HTMLDivElement>(null);
    const legacyChartInstance = React.useRef<LegacyChartInstance | null>(null);

    React.useEffect(() => {
        if (chartRef.current && !legacyChartInstance.current) {
            legacyChartInstance.current = LegacyChart(chartRef.current);
        }
        return () => {
            if (legacyChartInstance.current) {
                legacyChartInstance.current.destroy();
                legacyChartInstance.current = null;
            }
        };
    }, []);
    
    React.useEffect(() => {
        if (!legacyChartInstance.current) {
           return
        }
        if (legacyChartInstance.current) {
            legacyChartInstance.current.update(data);
        }
    }, [data]);

    return (
        <div className={`time-series-widget-container ${className || ''}`}
            style={{ width, height }}>
            {!legacyChartInstance.current && <div>Loading chart...</div>}
            <div className="time-series-widget" ref={chartRef}/>
        </div>
    );
});

export const TimeSeriesWidgetDemo = () => {
    const [data, setData] = React.useState<TimeSeriesWidgetDataPoint[]>([]);
    
    React.useEffect(() => {
        const interval = setInterval(() => {
            const newData = Array.from({ length: Math.random() * 50 }, (_, i) => ({ timestamp: Date.now() + i * 1000, value: Math.random() * 100 }))
            setData(newData);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div>
            <h2>Time Series Widget Demo</h2>
            <TimeSeriesWidget width="400px" height="600px" data={data} />
        </div>
    )
};
