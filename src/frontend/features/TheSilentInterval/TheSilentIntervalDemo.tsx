import React from 'react';
import {} from './types';
import './TheSilentInterval.css';
import { useSilentInterval } from './TheSilentInterval';

export const TheSilentIntervalDemo = () => {
    const [count, setCount] = React.useState(0);
    const latestCount = useSilentInterval(() => count, 1000);

    React.useEffect(() => {
        const id = setInterval(() => {
            setCount((c) => c + 1);
        }, 300);
        return () => clearInterval(id);
    }, []);
    return <div className="the-silent-interval-demo">
        <div>Current Count: {count}</div>
        <div>Latest Count from Silent Interval: {latestCount}</div>
    </div>;
}