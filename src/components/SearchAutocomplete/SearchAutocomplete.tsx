import React, { useState, useEffect, useRef } from 'react'

// UTILITY: Generic Debounce Hook
// Why? Decouples timing logic from fetching logic.
function useDebounce(value, delay) {
    //on mount we return our value , on next renders we Debounce it for delay time span
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set a timer to update the value after the delay
        const handler = setTimeout(() => {
            // lets set our debouncedValue, no new value in the past delay time span
            setDebouncedValue(value);
        }, delay);


        return () => {
            // CLEANUP: onunmount or if value or delay change ,clear old Timeout.
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

const timeoutDuration = 5000;

// CORE ARCHITECTURE: The Search Hook
export function useSearch(query) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 1. BUZZWORD: Debouncing
    // We only trigger the effect when 'debouncedQuery' changes, not every keystroke.
    // Standard wait time is 300-500ms.
    const debouncedQuery = useDebounce(query, 500);

    // Ref to cache results (Optional optimization, good for "Architect" points)
    // Prevents re-fetching if user types 'A' -> 'AB' -> back to 'A'.
    const cache = useRef({});

    useEffect(() => {// every time we changed debouncedQuery lets fetch the data 
        // Edge case: Empty query should clear results immediately.
        if (!debouncedQuery) {
            setData(null);
            return;
        }

        // Cache Hit Strategy, if we have the API response already let return it 
        if (cache.current[debouncedQuery]) {
            setData(cache.current[debouncedQuery]);
            return;
        }

        // 2. BUZZWORD: AbortController & Promise Cancellation
        // Native browser API to cancel network requests. think of this as remote controller 
        const controller = new AbortController();
        const combinedSignal = AbortSignal.any([
            controller.signal,// we use the signal to attach controller to the API
            AbortSignal.timeout(timeoutDuration) // setting a timeout
        ]);

        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch(
                    `https://api.example.com/search?q=${debouncedQuery}`,
                    { signal: combinedSignal, } // Pass signal to fetch, This signal aborts if userController aborts OR if the timeout fires
                );

                if (!response.ok) throw new Error('Network error');

                const result = await response.json();

                // 3. BUZZWORD: Race Conditions Handled
                // Even if this request finishes, if the component unmounted
                // or a new request started, the 'cleanup' logic below would have
                // triggered, aborting this fetch. We won't reach this line if aborted.

                cache.current[debouncedQuery] = result; // Write to cache
                setData(result);
            } catch (err) {
                // specific handling for AbortError
                if (err.name === 'AbortError') {
                    console.log('Fetch aborted');
                    // Do NOT set error state here. Abortion is a valid flow, not an error.
                    return;
                }
                setError(err.message);
            } finally {
                // Only turn off loading if the request wasn't aborted
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        // CLEANUP FUNCTION
        // The magic of React. Before this effect runs again (due to query change)
        // or the component unmounts, this function runs.
        return () => {
            controller.abort(); // Cancels the previous in-flight request.
        };

    }, [debouncedQuery]); // Only re-run when the DEBOUNCED value changes not when query changed 

    return { data, loading, error };
}
