import React from 'react';
import { clientLogger } from '@/frontend/utils/clientLogger';
//import {} from './types';
//import './Tabs.css';




export const TabsApiRaceConditionDemo = () => {
    const abortControllerRef = React.useRef<AbortController | null>(null);
    const ContentCache = React.useRef<Map<string, React.ReactNode>>(new Map());
    const fetchRef = React.useRef<string | null>(null);
    
    const [currentContent, setCurrentContent] = React.useState<React.ReactNode | null>(null);
    
    const tabClick = React.useCallback((apiKey: string)=> {
        // If the same tab is clicked again, do nothing
        if(fetchRef.current === apiKey) {
            return;
        }

        // If the content for this tab is already cached, use it
        if(ContentCache.current.has(apiKey)) {
            setCurrentContent(ContentCache.current.get(apiKey) || null);
            return;
        }

        // If there's an ongoing fetch, abort it
        if(abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Start a new fetch for the clicked tab
        abortControllerRef.current = new AbortController();;
        fetchRef.current = apiKey;
        const rendomizeTimeOut = Math.random() * 2000 + 500;
        setTimeout(() => {
        fetch(`https://jsonplaceholder.typicode.com/posts/${apiKey.slice(-1)}`, {signal: abortControllerRef.current?.signal})
            .then((response) => response.json())
            .then((data) => {
                const content = (<div className="tab-content">
                    <h1>Content for {apiKey}</h1>
                    <h2>{data.title}</h2>
                    <p>{data.body}</p>
                </div>);
                ContentCache.current.set(apiKey, content);
                if(fetchRef.current !== apiKey) {
                    return;
                }
                setCurrentContent(content);
            })
            .catch((error) => {
                if (error.name === 'AbortError') {
                    clientLogger.debug('Fetch aborted');
                } else {
                    console.error('Fetch error:', error);
                }
            }).finally(() => {
                if(fetchRef.current === apiKey) {
                    fetchRef.current = null;
                }
            })
        }, rendomizeTimeOut);
    },[])

    return (
    
        <div className="tabs-container">
            {[{apiKey: 'tab1', label: 'Tab 1'}, {apiKey: 'tab2', label: 'Tab 2'}, {apiKey: 'tab3', label: 'Tab 3'}].map((tab) => (
                <div key={tab.apiKey} className="tab" onClick={()=>tabClick(tab.apiKey)}>
                    {tab.label}
                </div>
            ))}
            {currentContent ?? null }
            
        </div>
    
  )
}

      
