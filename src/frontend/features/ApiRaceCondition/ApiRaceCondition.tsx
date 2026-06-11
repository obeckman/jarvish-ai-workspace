import React from 'react';
import { clientLogger } from '@/frontend/utils/clientLogger';
//import {} from './types';
//import './Tabs.css';




export const TabsApiRaceConditionDemo = () => {
    const requestRef = React.useRef<AbortController | null>(null);
    const ContentCache = React.useRef<{[key: string]: React.ReactNode}>({});
    const fetchRef = React.useRef<string | null>(null);
    const [currentContent, setCurrentContent] = React.useState<React.ReactNode | null>(null);
    const tabClick = React.useCallback((apiKey: string)=> {
        if(fetchRef.current === apiKey) {
            return;
        }
        if(ContentCache.current[apiKey]) {
            setCurrentContent(ContentCache.current[apiKey]);
            return;
        }
        if(requestRef.current) {
            requestRef.current.abort();
        }
        const controller = new AbortController();
        requestRef.current = controller;
        fetchRef.current = apiKey;
        const rendomizeTimeOut = Math.random() * 2000 + 500;
        setTimeout(() => {
        fetch(`https://jsonplaceholder.typicode.com/posts/${apiKey.slice(-1)}`, {signal: controller.signal})
            .then((response) => response.json())
            .then((data) => {
                const content = (<div className="tab-content">
                    <h1>Content for {apiKey}</h1>
                    <h2>{data.title}</h2>
                    <p>{data.body}</p>
                </div>);
                ContentCache.current[apiKey] = content;
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

      
