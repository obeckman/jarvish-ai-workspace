/*
#5 The Silent Interval - "Stale Closure

Hello. I'm ready. Let's get straight to the point. We are looking for engineers who understand the memory model of the tools they use, not just how to copy-paste from documentation.
Here is the "Stale Closure" assessment.

1. The Interview Question
"The Silent Interval"
"I need you to write a custom React hook called usePolling. It takes two arguments: a callback function and a delay in numbers.
Here is the constraint: The consumer of this hook will be passing a callback that references a rapidly changing state variable (e.g., a high-frequency stock ticker or a live chat counter).
Requirement: The interval must remain stable. You strictly cannot destroy and recreate the setInterval timer every time the state updates. However, when the timer ticks, it must execute the callback with the absolute latest state value.
How do you solve this contradiction?"

*/
import React from 'react';
import {} from './types';
import './TheSilentInterval.css';

export const useSilentInterval = <T,>(callback: () => T, delay: number) => {
    const savedCallback = React.useRef<() => T>();
    const delayRef = React.useRef<number>(delay);
    const [callbackValue, setCallbackValue] = React.useState<T|null>(null);

    React.useEffect(() => {
        delayRef.current = delay;
    }, [delay]);
    
    React.useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    React.useEffect(() => {
        function tick() {
            if (savedCallback.current) {
                setCallbackValue(savedCallback.current());
            }
        }
        if (delayRef.current !== null) {
            let id = setInterval(tick, delayRef.current);
            return () => clearInterval(id);
        }
    }, []);

    return callbackValue;
};

