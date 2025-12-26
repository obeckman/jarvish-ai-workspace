// Your Component
import React from 'react';
import { useHeavyWorker } from './useHeavyWorker'
import { myExpensiveFunction } from './heavyLogic'

const MyComponent = () => {
    // We pass the types to the hook so it knows what data goes in and what result comes out
    const { result, loading, error, runCalculation } = useHeavyWorker<typeof myExpensiveFunction>();
    const [inputVal, setInputVal] = React.useState(30);

    return (
        <div>
            <h1>Worker Thread Demo</h1>
            <input
                type="number"
                value={inputVal}
                onChange={(e) => setInputVal(Number(e.target.value))}
            />

            <button
                onClick={() => runCalculation([1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 0])}
                disabled={loading}
            >
                {loading ? 'Processing on Background Thread...' : 'Calculate Fibonacci'}
            </button>

            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {result !== null && <h2>Result: {result}</h2>}
        </div>
    );
}