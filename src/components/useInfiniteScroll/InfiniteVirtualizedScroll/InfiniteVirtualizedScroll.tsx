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
    integrationAPIconfig: integrationAPIconfigType<T>,
    itemHeight: number
) => {
    const {
        serverBaseURL = 'http://localhost:3000/',
        endpoint,
        method,
        transformDataResponse,
        limit = 10
    } = integrationAPIconfig;
    const isFetchItemsRef = useRef(false);
    const sentinelObserver = React.useRef<IntersectionObserver | null>(null);

    const [items, setItems] = useState<T[]>([]);

    const [paginationInfo, setPaginationInfo] = useState<{ totalItems: number; nextPage: string }>({
        totalItems: 0,
        nextPage: ''
    });

    const fetchItems = useCallback(async () => {
        if (isFetchItemsRef.current) return;

        isFetchItemsRef.current = true;
        try {
            let currentNextPage = '';
        setPaginationInfo(prev => {
            currentNextPage = prev.nextPage;
            return prev;
        });

            const response = await fetch(
                `${serverBaseURL}${endpoint}?${currentNextPage ? `lastId=${currentNextPage}&` : ''}limit=${limit}`,
                { method: method }
            );
            const data = await response.json();

            const newItems = (data.items || []).map(transformDataResponse);
            setItems(prev => [...prev, ...newItems]);
            setPaginationInfo({
                totalItems: data.paginationInfo.total || 0,
                nextPage: data.paginationInfo.nextPageId || ''
            });
            
        } catch (e) {
            console.error('Error fetching items:', e);
        } finally {
            isFetchItemsRef.current = false
        }
    }, [integrationAPIconfig])

    React.useEffect(() => {
        if (items.length === 0) {
            fetchItems();
        }
        return () => {
            if (sentinelObserver.current) {
                sentinelObserver.current.disconnect();
            }
        }
    }, []);

    const setSentinelRef = React.useCallback((node: HTMLElement | null) => {

        if (sentinelObserver.current) {
            sentinelObserver.current.disconnect();
        }
        if (node) {

            sentinelObserver.current = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        fetchItems();
                    }
                }, { rootMargin: `${itemHeight}px` })
            sentinelObserver.current.observe(node);
        }
    }, [fetchItems]);

    const showSentinel = items.length < paginationInfo.totalItems || paginationInfo.totalItems === 0;

    const sentinelStyle: React.CSSProperties = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '1px',
        transform: `translateY(${items.length * itemHeight}px)`,
        pointerEvents: 'none',
    };

    return { totalItems: paginationInfo.totalItems, items, setSentinelRef, sentinelStyle, showSentinel };
}

const useVirtualizedScrollBl = <T extends {id:string}>(
    items: T[],
    totalItems: number,
    itemHeight: number,
    buffer: number,
    viewportHeight: number
) => {

    const [scrollTop, setScrollTop] = useState(0);
    const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    }, []);

    const startIndex = Math.max(Math.floor(scrollTop / itemHeight) - buffer, 0);
    const endIndex = Math.min(Math.ceil((scrollTop + viewportHeight) / itemHeight) + buffer, totalItems);
    const visibleItems = items.slice(startIndex, endIndex)
    const visibleItemsPosition = startIndex * itemHeight;
    const totalHeight = totalItems * itemHeight;
    return { handleScroll, visibleItems, visibleItemsPosition, totalHeight };
};

export const InfiniteVirtualizedScroll = <T extends {id:string}>({
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
    const { totalItems, items, setSentinelRef, sentinelStyle, showSentinel } = useInfiniteFetch<T>(integrationAPIconfig, itemHeight);
    const { visibleItemsPosition, totalHeight, handleScroll, visibleItems } = useVirtualizedScrollBl(items, totalItems, itemHeight, buffer, viewportHeight);

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
                            <div key={"item" + item.id} style={{ height: itemHeight }}>
                                {renderItemCallBack(item)}

                            </div>)
                    } else return (

                        <div key={"skeletonItem" + index} style={{ height: itemHeight }}>
                            {skeletonItem(item)}
                        </div>)

                })}

            </div>
            {showSentinel && (
                <div
                    ref={setSentinelRef}
                    style={sentinelStyle}
                />
            )}
        </div>
    </div>
}