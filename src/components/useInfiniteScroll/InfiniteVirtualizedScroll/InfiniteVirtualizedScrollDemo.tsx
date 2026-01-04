//InfiniteVirtualizedScrollDemo
import React from 'react';
import { InfiniteVirtualizedScroll } from './InfiniteVirtualizedScroll';
import { integrationAPIconfigType } from './InfiniteVirtualizedScroll';

type InfiniteScrollDemoItemType = {
    id: number;
    name: string;
}

const ListDemoItem = ({ id }: { id: number }) => {
    return <div className="virtualized_scroll_list-demo-item" key={id}>
        {`Item ${id}`}
    </div>
}

const ListDemoSkeletonItem = ({ id }: { id: number }) =>
    <div className="virtualized_scroll_list-demo-item-skeleton" key={id}>
        Loading...
    </div>;

const integrationAPIconfig = {
    endpoint: 'more-items',
    method: 'GET',
    transformDataResponse: (responseData: any) => {
        return {
            id: responseData?.id ?? -1,
            name: responseData?.title ?? 'No Name'
        }
    },
    limit: 10
} as integrationAPIconfigType<InfiniteScrollDemoItemType>;

export const InfiniteVirtualizedScrollDemo = () => {
    return <div className="use_infinite_scroll_demo-holder">
        InfiniteVirtualizedScrollDemo

        <InfiniteVirtualizedScroll
            integrationAPIconfig={integrationAPIconfig}
            itemHeight={50}
            renderItemCallBack={ListDemoItem}
            buffer={2}
            viewportHeight={100}
            viewportWidth={200}
            skeletonItem={ListDemoSkeletonItem}
        />
    </div>

}