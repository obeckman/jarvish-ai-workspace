import React from 'react';
import { useResilientFetch } from './RetryMechanism';
import './RetryMechanism.css';

const failedUrl = 'https://api.example.com/unstable-endpoint';
const successUrl = 'https://jsonplaceholder.typicode.com/todos/1';
export const RetryMechanismDemo = () => {
    const [url, setUrl] = React.useState<string | undefined>(undefined);
    const { results, isError, isLoading } = useResilientFetch({
        url,
        data: null,
        method: 'GET',
        options: {
            maxRetryCount: 3,
            initialRetryDelay: 1000,
            incrementedDelay: 2000,

        }
    });
    return <div className="retry-mechanism-demo">
        RetryMechanismDemo
        <button onClick={() => {
            setUrl(successUrl);
        }}>
            Switch to Success URL
        </button>
        <button onClick={() => {
            setUrl(failedUrl);
        }}>
            Switch to Failed URL
        </button>
        {(isLoading) && <p className="loading-dots">Loading</p>}
        {isError && <p style={{ color: 'red' }}>Error: An error occurred while fetching data.</p>}
        {results && <pre>{JSON.stringify(results, null, 2)}</pre>}
    </div>

}