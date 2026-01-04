import React from 'react';
import './useInfiniteVirtualizedScroll.css';
import { useState, useRef, useCallback } from 'react';


export type integrationAPIconfigType<T> = {
    serverBaseURL?: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    transformDataResponse: (responseData: any) => T,
    limit: 10
}

const useInfiniteFetch = <T,>(
    integrationAPIconfig: integrationAPIconfigType<T>
) => {
    const {
        serverBaseURL = 'http://localhost:3000/',
        endpoint,
        method,
        transformDataResponse,
        limit = 10
    } = integrationAPIconfig;

    const fetchMoreDataRef = React.useRef(null)
    const fetchMoreDataObserver = React.useRef<IntersectionObserver | null>(null);

    const [items, setItems] = useState<T[]>([]);
    const [totalItems, setTotalItems] = useState<number>(0);
    const [nextPage, setNextPage] = useState<string>('');
    const loadingRef = useRef(false);

    const fetchItems = useCallback(async () => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        try {
            // Simulate API call
            const response = await fetch(
                `${serverBaseURL}${endpoint}?${nextPage ? `lastId=${nextPage}&` : ''}limit=${limit}`,
                { method: method }
            );
            const data = await response.json();

            const newItems = (data.items || []).map(transformDataResponse);
            setItems(prev => [...prev, ...newItems]);
            setTotalItems(data.paginationInfo.total || 0);
            setNextPage(data.paginationInfo.nextPageId || '');
        } catch (e) {
            console.error('Error fetching items:', e);
        } finally {
            loadingRef.current = false
        }
    }, [integrationAPIconfig, nextPage])

    const nextCallback = useCallback(() => {
        if (items.length < totalItems || totalItems === 0) {
            fetchItems();
        }
    }, [fetchItems, items.length, totalItems]);

    React.useEffect(() => {
        if (!fetchMoreDataRef.current) {
            return;
        }
        if (fetchMoreDataRef.current && fetchMoreDataObserver.current) {
            fetchMoreDataObserver.current.disconnect();
        }
        fetchMoreDataObserver.current = new IntersectionObserver(
            (entries) => {
                entries[0].isIntersecting && nextCallback();
            }
        );

        fetchMoreDataObserver.current.observe(fetchMoreDataRef.current);

        return () => {
            if (fetchMoreDataObserver.current) {
                fetchMoreDataObserver.current.disconnect();
            }
        };
    }, [nextCallback]);

    React.useEffect(() => {
        if (items.length === 0) {
            fetchItems();
        }
    }, []);

    return { totalItems, items, fetchMoreDataRef };
}


export const InfiniteVirtualizedScroll = <T,>({
    integrationAPIconfig,
    itemHeight,
    renderItemCallBack,
    buffer,
    viewportHeight,
    viewportWidth,
    skeletonItem,
}: {
    integrationAPIconfig: integrationAPIconfigType<T>;
    itemHeight: number;
    renderItemCallBack: (item: T) => React.ReactNode;
    buffer: number;
    viewportHeight: number;
    viewportWidth: number;
    skeletonItem: (item: T) => React.ReactNode;
}) => {
    const { totalItems, items, fetchMoreDataRef } = useInfiniteFetch<T>(integrationAPIconfig);

    const [scrollTop, setScrollTop] = useState(0);
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }

    const totalHeight = totalItems * itemHeight;
    const startIndex = Math.max(Math.floor(scrollTop / itemHeight) - buffer, 0);
    const endIndex = Math.min(Math.ceil((scrollTop + viewportHeight) / itemHeight) + buffer, totalItems);
    const visibleItemsPosition = startIndex * itemHeight;
    const moreItemsNeededPosition = itemHeight * items.length;
    const visibleItems = React.useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

    return <div
        className="virtualized_scroll_list-container"
        style={{ height: viewportHeight, width: viewportWidth }}
        onScroll={handleScroll}
    >
        <div
            className="virtualized_scroll_list-all_items_container"
            style={{ height: totalHeight }}
        >
            <div
                className="virtualized_scroll_list-visible_items_container"
                style={{ transform: `translateY(${visibleItemsPosition}px)` }}>
                {visibleItems.map((item, index) => {
                    if (item) {
                        return (

                            <div key={"item" + index} style={{ height: itemHeight }}>
                                {renderItemCallBack(item)}

                            </div>)
                    } else return (

                        <div key={"skeletonItem" + index} style={{ height: itemHeight }}>
                            {skeletonItem(item)}
                        </div>)

                })}

            </div>
            {
                visibleItems.length > 0 &&
                <div
                    ref={fetchMoreDataRef}
                    className='virtualized_scroll_list-fetch_more_data_element'
                    style={{ transform: `translateY(${moreItemsNeededPosition}px)` }}
                />
            }
        </div>
    </div>
}