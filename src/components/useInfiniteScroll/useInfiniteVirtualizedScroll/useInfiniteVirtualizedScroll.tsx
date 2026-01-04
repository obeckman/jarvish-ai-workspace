import React from 'react';
import './useInfiniteVirtualizedScroll.css';
import { useState, useRef, useCallback } from 'react';

const ListDemoItem = ({ id }: { id: number }) => {
    return <div className="virtualized_scroll_list-demo-item" key={id}>
        {`Item ${id}`}
    </div>
}

const ListDemoSkeletonItem = ({ id }: { id: number }) => <div className="virtualized_scroll_list-demo-item-skeleton" key={id}>Loading...</div>;

//const useInfiniteScroll
type InfiniteScrollDemoItemType = {
    id: number;
    name: string;
}
const integrationAPIconfig = {
    endpoint: 'more-items',
    method: 'GET',
    transformDataResponse: (responseData: any) => {
        return {
            id: responseData?.id ?? -1,
            name: responseData?.title ?? 'No Name'
        } as InfiniteScrollDemoItemType
    },
    limit: 10
}
export const UseInfiniteVirtualizedScrollDemo = () => {

    const { totalItems, items, nextCallback } = useInfiniteFetch<InfiniteScrollDemoItemType>(integrationAPIconfig);
    return <div className="use_infinite_scroll_demo-holder">
        UseInfiniteVirtualizedScrollDemo

        <VirtualizedScrollList
            items={items}
            nextCallback={nextCallback}
            itemHeight={50}
            totalItems={totalItems}
            renderItemCallBack={ListDemoItem}
            buffer={2}
            viewportHeight={100}
            viewportWidth={200}
            skeletonItem={ListDemoSkeletonItem}
        />
    </div>

}
const useInfiniteFetch = <T,>(
    integrationAPIconfig: {
        serverBaseURL?: string;
        endpoint: string;
        method: string;
        transformDataResponse: (responseData: any) => T;
        limit?: number;
    }
) => {
    const {
        serverBaseURL = 'http://localhost:3000/',
        endpoint,
        method,
        transformDataResponse,
        limit = 10
    } = integrationAPIconfig;

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
        if (items.length === 0) {
            fetchItems();
        }
    }, []);

    return { totalItems, items, nextCallback };
}


const VirtualizedScrollList = <T,>({
    items,
    nextCallback,
    itemHeight,
    totalItems,
    renderItemCallBack,
    buffer,
    viewportHeight,
    viewportWidth,
    skeletonItem,
}: {
    items: T[];
    nextCallback: () => void;
    itemHeight: number;
    totalItems: number;
    renderItemCallBack: (item: T) => React.ReactNode;
    buffer: number;
    viewportHeight: number;
    viewportWidth: number;
    skeletonItem: (item: T) => React.ReactNode;
}) => {
    const fetchMoreDataRef = React.useRef(null)
    const fetchMoreDataObserver = React.useRef<IntersectionObserver | null>(null);

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
        style={{ height: viewportHeight, width: viewportWidth  }}
        onScroll={handleScroll}
    >
        <div
            className="virtualized_scroll_list-all_items_container"
            style={{ height: totalHeight}}
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