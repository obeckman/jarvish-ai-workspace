/*
#22 Resilience & Error Handling" :The "Offline-First" Sync

"I want you to implement a custom hook called useReliableSubmit. 
It should accept an async submit function and data. When the user clicks submit, 
the UI should update immediately as if it succeeded. 
If the network is down or the request fails, 
it must eventually succeed, 
even if the user reloads the page or closes and re-opens the tab.

Constraint: You cannot use TanStack Query, Redux, or Apollo. Pure React and Native APIs only."
Why this is a trap: Most candidates hear "offline" and think "detect network status." 
They miss the core requirement: Persistence and Queue Management. 
They usually tie the submission logic to the component's lifecycle. 
If the component unmounts (user navigates away), the retry logic dies.

*/

import React, { useState } from 'react';
import './useReliableSubmit.css';
import { useReliableSubmitProps, ReliableSubmitManagerContextProps, SubmitParameterType } from './types';

import { submitFunctionMap, isKeyofSubmitFunction } from './submitFunctions';

export const ReliableSubmitMangerContext = React.createContext<ReliableSubmitManagerContextProps | null>(null);

const useIsOnline = () => {
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    React.useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    return isOnline;
}

export const ReliableSubmitManger = ({ children }: { children: React.ReactNode }) => {
    const isOnline = useIsOnline();

    const isProcessingRef = React.useRef(false);

    const getItemFromStorage = <T,>(key: string): T | null => {
        const savedData = localStorage.getItem(key);
        if (savedData) {
            const parsedData: T = JSON.parse(savedData);
            return parsedData;
        }
        return null;
    };

    const submit = async <T,>({ submitFunctionType, data }: SubmitParameterType<T>) => {
        try {
            localStorage.setItem(submitFunctionType, JSON.stringify(data));
            processItem(submitFunctionType);
        }
        catch (error) {
            console.error('Submit failed, will retry on next page load or user interaction.', error);
        }
    }

    const processItem = async <T,>(key: string) => {

        if (isKeyofSubmitFunction(key)) {
            if (isOnline === false) {
                console.error(`we are Offline, will retry later submitting - ${key}`);
                return;
            }

            const data = getItemFromStorage<T>(key);
            if (data) {
                try {
                    if (isProcessingRef.current) {
                        return;
                    }
                    isProcessingRef.current = true;
                    const result = await submitFunctionMap[key](data);
                    if (result.success) {
                        localStorage.removeItem(key);
                    }
                    else {
                        setTimeout(() => processItem(key), 1000);
                    }
                } catch (error) {
                    console.error(`Error processing item with key ${key}:`, error);
                    setTimeout(() => processItem(key), 1000);
                }
                finally {
                    isProcessingRef.current = false;

                }
            }
        }
    }

    React.useEffect(() => {
        // checking all stored submissions on context mount
        const possessStorage = () => {
            const storedKeys = Object.keys(localStorage);
            storedKeys.forEach(async (key) => {
                processItem(key);
            })
        }
        const timeoutId = setInterval(possessStorage, 1000);

        return () => clearInterval(timeoutId);
    }, []);

    const contextValue = React.useMemo(() => ({ getItemFromStorage, submit }), []);

    return <ReliableSubmitMangerContext.Provider value={contextValue} >
        {children}
    </ReliableSubmitMangerContext.Provider>
}

export const useReliableSubmit = <T,>({
    submitFunctionType,
    initialData
}: useReliableSubmitProps<T>) => {
    const [storedData, setStoredData] = useState<T | null>(null);
    const { getItemFromStorage, submit } = React.useContext(ReliableSubmitMangerContext)!;

    const submitFunctionTypeRef = React.useRef(submitFunctionType);
    React.useEffect(() => {
        submitFunctionTypeRef.current = submitFunctionType;
    }, [submitFunctionType]);

    React.useEffect(() => {
        const savedData = getItemFromStorage<T>(submitFunctionTypeRef.current);
        if (savedData) {
            setStoredData(savedData);
        }
        else {
            setStoredData(initialData);
        }
    }, []);

    const reliableSubmit = React.useMemo(() => (data: T) => {
        submit({
            submitFunctionType: submitFunctionTypeRef.current,
            data
        })
        setStoredData(data)
    }, []);

    return { reliableSubmit, storedData };
}


