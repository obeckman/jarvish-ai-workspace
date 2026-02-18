/*
#13 - The "API Aggregator" - Parallel Execution and Data Normalization

We’re building a high-traffic User Dashboard. To render this page, you need to aggregate data from three microservices: fetchUser(), fetchPosts(), and fetchAnalytics().
The Interview Question
"Design a React component that fetches data from these three sources simultaneously. Ensure the UI remains functional even if the 'Analytics' service is down, and explain how you would prevent the component from re-rendering three separate times as each request completes."

 */
import React from 'react';

export const fetchDataFromApis = async (apiEndpoint: string, onError: (error: string) => void): Promise<any> => {
        const abortToken = new AbortController();
        const Request = fetch(apiEndpoint,{ signal: abortToken.signal }).then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch from ${apiEndpoint}: ${response.statusText}`);
            }
            return response.json();
        })
        Request.catch(error => {
            if (error.name === 'AbortError') {
                console.log(`Fetch aborted for ${apiEndpoint}`);
            } else {
                console.error(`Fetch error for ${apiEndpoint}:`, error);
                onError(`API error - ${apiEndpoint}: ${error.message}`);
            }

        });
        return {abortToken, Request};
    
}
export const APIAggregator = () => {
    
    const [resultsFromApis, setResultsFromApis] = React.useState<any[]>([]);
    const [error, setError] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState<boolean>(false);

    React.useEffect(() => {
        let isMounted = true;
        const apiEndpoints = [
            { name: 'post1', url: 'https://jsonplaceholder.typicode.com/posts/1' },
            { name: 'post2', url: 'https://jsonplaceholder.typicode.com/posts/2' },
            { name: 'post3', url: 'https://jsonplaceholder.typicode.com/posts/3' },
        ];
        setIsLoading(true);
        setError(null);

        Promise.allSettled(
            apiEndpoints.map(endpoint => fetchDataFromApis(endpoint.url, setError).then(res => res.Request))
        ).then(results => {
            if (!isMounted) return;
            setResultsFromApis((prev) =>{
                const newResults = results.map((result, index) => {
                    if (result.status === 'fulfilled') {
                        return { [apiEndpoints[index].name]: result.value };
                    }
                    return { [apiEndpoints[index].name]: null };
                });
                return {...prev, newResults};
            }); 
            setIsLoading(false);  

        }).catch(err => {
            if (!isMounted) return;
            setError(err.message);
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
        }
         
    }, []);

    return (
        <div>   API Aggregator Component
            {isLoading && <p>Loading...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            {!isLoading && (
                <pre>{JSON.stringify(resultsFromApis, null, 2)}</pre>
            )}
        </div>
    );
}   