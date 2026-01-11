
export type TimeSeriesWidgetDataPoint = {
    timestamp: number;
    value: number;
};
export interface TimeSeriesWidgetProps {
    data: TimeSeriesWidgetDataPoint[];
    className?: string;
    width?: string | number;
    height?: string | number;
    
}