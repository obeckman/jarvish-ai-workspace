import React from 'react';
import './useInfiniteScroll.css';

type InfiniteScrollItemType = {
    id: string;
    name: string;
    placeHolder?: boolean;
}

const useInfiniteScroll = (maxItemsToRender = 5) => {
    // Hook logic here
    const [items, setItems] = React.useState<InfiniteScrollItemType[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isError, setIsError] = React.useState(false);
    const [currentPage, setCurrentPage] = React.useState(0);
    //const [dataPageInfo, setDataPageInfo] = React.useState<{ page: string | undefined, nextPage: string | undefined }>({ page: undefined, nextPage: undefined });
    //const [itemsToRender, setItemsToRender] = React.useState<InfiniteScrollItemType[]>([]);
    const nextDataPageObservedRef = React.useRef<IntersectionObserver | null>(null);
    const prevDataPageObservedRef = React.useRef<IntersectionObserver | null>(null);
    const isFetchingRef = React.useRef(false);

    const observerPrevCallback = React.useCallback((node: HTMLDivElement) => {
        if (!node) {
            return;
        }

        if (prevDataPageObservedRef.current) {
            prevDataPageObservedRef.current.disconnect();
        }

        prevDataPageObservedRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading) {
                setCurrentPage(prevPage => Math.max(prevPage - 1, 0));
            }
        }, { threshold: 1.0 })

        prevDataPageObservedRef.current.observe(node);
        return () => {
            if (prevDataPageObservedRef.current) {
                prevDataPageObservedRef.current.disconnect();
            }
        };
    }, [setCurrentPage, isLoading]);



    const fetchMoreItems = React.useCallback(() => {
        if (isFetchingRef.current) return;
        //if (isLoading /*|| !pageInfo.nextPage*/) return;

        const startIndex = Math.max(currentPage * maxItemsToRender, 0);
        const endIndex = startIndex + maxItemsToRender
        const isNeedToFetch = startIndex >= items.length || endIndex > items.length;
        if (!isNeedToFetch) {
            setCurrentPage(prevPage => prevPage + 1);
            return;
        }

        isFetchingRef.current = true;
        setIsLoading(true);
        setIsError(false);

        setTimeout(() => {
            try {

                const fetchWithRetry = async (url: string, maxRetries = 3) => {
                    for (let i = 0; i < maxRetries; i++) {
                        try {
                            const response = await fetch(url);
                            if (!response.ok) throw new Error("Bad response");
                            return await response.json();
                        } catch (error) {
                            if (i === maxRetries - 1) throw error;
                            const delay = Math.pow(2, i) * 1000;
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                };
                fetchWithRetry(`http://localhost:3001/more-items/?_start=${startIndex}&_limit=${maxItemsToRender}`)  // Example API endpoint
                    .then((newItems: unknown[]) => {

                        setItems((prevItems) => {
                            const newItemsMapped: InfiniteScrollItemType[] = newItems.map((newItem) => {
                                const item = newItem as { id: string; title: string };
                                return { id: item.id, name: item.title };
                            })
                            return [...prevItems, ...newItemsMapped]
                        });
                        //setDataPageInfo({page,nextPage});
                        //setCurrentPage(prevPage => prevPage + 1);


                        setIsError(false);
                    })
            }
            catch {
                setIsError(true);
            }
            finally {
                setIsLoading(false);
                isFetchingRef.current = false;
            }
        }, 0);
    }, [currentPage, items.length, maxItemsToRender]);


    const observerNextCallback = React.useCallback((node: HTMLDivElement) => {
        if (!node) {
            return;
        }

        if (nextDataPageObservedRef.current) {
            nextDataPageObservedRef.current.disconnect();
        }

        nextDataPageObservedRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoading) {
                fetchMoreItems();
            }
        }, { threshold: 1.0 })

        nextDataPageObservedRef.current.observe(node);

        return () => {
            if (nextDataPageObservedRef.current) {
                nextDataPageObservedRef.current.disconnect();
            }
        };
    }, [fetchMoreItems, isLoading]);

    const { itemsToRender, paddingTop } = React.useMemo(() => {
        const startIndex = Math.min(Math.max(currentPage * maxItemsToRender -2, 0));
        const itemsToRender = items.slice(startIndex, startIndex + maxItemsToRender);
        const paddingTop = startIndex * 40;
        return { itemsToRender, paddingTop };
    }, [currentPage, items, maxItemsToRender]);

    const memoReturnValue = React.useMemo(() =>
        ({ itemsToRender, observerNextCallback, paddingTop, isError, isLoading, observerPrevCallback }),
        [itemsToRender, observerNextCallback, paddingTop, isError, isLoading, observerPrevCallback]
    );

    return memoReturnValue;
}

const InfiniteScrollItem = ({ id, name }: InfiniteScrollItemType) => {

    return <div>{`name - ${name} id - ${id}`}</div>
}

const InfiniteScrollPlaceholderItem = ({ id: _id, name: _name }: InfiniteScrollItemType) => {

    return <div>loading...</div>
}
export const UseInfiniteScrollDemo = () => {
    const { itemsToRender, observerNextCallback, paddingTop, observerPrevCallback } = useInfiniteScroll();

    return <div className='use_infinite_scroll_demo'>
        Infinite Scroll Demo
        <div className='use_infinite_scroll_demo-holder'>
            <div className='use_infinite_scroll_demo-item-container'>

                <div style={{ height: `${paddingTop}px` }} />
                  
                <div ref={observerPrevCallback} style={{ height: '1px', background: 'transparent' }}></div>
                
                {itemsToRender.map(item => {
                    return <InfiniteScrollItem key={item.id} {...item} />
                }
                )}
                {/* {itemsToRender.length !== 0   && */}
                <div ref={observerNextCallback} style={{ height: '1px', background: 'transparent' }}></div>
                {/* } */}
            </div>
        </div>
    </div>
}
