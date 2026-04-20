/*
#17. The "Retry Mechanism"

Hello. I expect precision and robust engineering practices. We are not just making things work; we are building systems that survive production traffic.
Here is your interview scenario.

1. The Deceptive Interview Question
"Implement a custom hook, useResilientFetch, that fetches data from an endpoint. If the request fails, it should retry up to 3 times before giving up. To prevent server overload, the delay between retries must increase over time."
Why it is deceptive:
It sounds like a simple logic puzzle involving setTimeout. However, inside a React environment, this exposes three critical failures in average candidates:
Race Conditions: What happens if the url changes while a retry is pending?
Memory Leaks: What happens if the component unmounts during the 2nd retry wait period?
Thundering Herd: If 10,000 clients fail simultaneously, do they all retry at the exact same millisecond?

*/
import React from "react";
import { ResilientSettings, UseResilientFetchProps } from './types';
import './RetryMechanism.css';

const DEFAULT_FETCH_OPTIONS = {
    maxRetryCount: 0,
    initialRetryDelay: 1000,
    incrementedDelay: 2000,
} as const;

export const useResilientFetch = <T,>(props: Partial<UseResilientFetchProps<T>>) => {
    const {
        url = undefined,
        method = "GET",
        data = undefined,
        options = DEFAULT_FETCH_OPTIONS
    } = props;

    const resilientSettingsRef = React.useRef<ResilientSettings & { currentTryCount: number } | null>(null)
    const fetchInfoRef = React.useRef({ url, method, data });
    const timeoutRef = React.useRef<number | null>(null);
    const abortControllerRef = React.useRef<AbortController | null>(null);

    React.useEffect(() => {
        resilientSettingsRef.current = ({
            ...options,
            currentTryCount: 0,
        });
        fetchInfoRef.current = { url, method, data };
    }, [options, url, method, data]);

    const [results, setResults] = React.useState<T | null>(null);
    const [isError, setIsError] = React.useState<boolean>(false);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    const fetchData = React.useCallback(async () => {
        if (!fetchInfoRef.current || !resilientSettingsRef.current) return;
        if (!fetchInfoRef.current.url) {
            return
        }
        setIsLoading(true)
        setIsError(false);
        setResults(null);
        resilientSettingsRef.current.currentTryCount += 1;
        const abortToken = new AbortController();
        abortControllerRef.current = abortToken;
        try {
            const response = await fetch(fetchInfoRef.current.url, {
                method: fetchInfoRef.current.method,
                body: fetchInfoRef.current.data ? JSON.stringify(fetchInfoRef.current.data) : null,
                headers: {
                    'Content-Type': 'application/json'
                },
                signal: abortToken.signal
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setResults(data);
            setIsLoading(false);
        } catch (error) {
            
            if (resilientSettingsRef.current.currentTryCount < resilientSettingsRef.current.maxRetryCount) {
                const initialRetryDelay = resilientSettingsRef.current.initialRetryDelay;
                const incrementedDelay = resilientSettingsRef.current.incrementedDelay;
                const currentTryCount = resilientSettingsRef.current.currentTryCount;

                const delay = initialRetryDelay + (incrementedDelay * (currentTryCount - 1))
                const jitter = Math.random() * 200;
                timeoutRef.current = window.setTimeout(() => {
                    fetchData();
                }, delay + jitter)
            } else {
                setIsError(true);
                setIsLoading(false);
            }
        }


    }, [])

    React.useEffect(() => {
        fetchData();
        return () => {
            abortControllerRef.current?.abort();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }
    }, [fetchData, url, method, data,options.maxRetryCount,options.incrementedDelay,options.initialRetryDelay]);

    return { results, isError, isLoading };
}
