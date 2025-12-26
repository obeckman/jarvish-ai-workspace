import { useEffect, useRef, useState, useCallback } from 'react';
import { WorkerRequest, WorkerResponse } from './types';

export const useHeavyWorker = <HEAVY_METHOD extends (...args: any) => any>() => {
    const workerRef = useRef<Worker | null>(null);
    const [result, setResult] = useState<ReturnType<HEAVY_METHOD> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // 1. Initialization
        // We use "import.meta.url" so the bundler knows how to resolve the path relative to THIS file.
        workerRef.current = new Worker(
            new URL('./heavy.worker.ts', import.meta.url),
            { type: 'module' }
        );

        // 2. Set up the Listener (Incoming from Worker)
        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse<ReturnType<HEAVY_METHOD>>>) => {
            const data = event.data;
            if (data.type === 'SUCCESS') {
                setResult(data?.payload); // Type casting based on context
                setLoading(false);
            } else if (data.type === 'ERROR') {
                setError(data.error);
                setLoading(false);
            }
        };

        // 3. Cleanup (CRITICAL)
        // If you don't terminate, the thread stays alive eating memory even after the component unmounts.
        return () => {
            workerRef.current?.terminate();
        };
    }, []);

    // 4. The Trigger (Outgoing to Worker)
    const runCalculation = useCallback((data: Parameters<HEAVY_METHOD>[0]) => {
        setLoading(true);
        setError(null);

        const message = {
            type: 'CALCULATE',
            payload: data
        };

        workerRef.current?.postMessage(message);
    }, []);

    return { result, loading, error, runCalculation };
};