import React, { useState, UIEvent } from 'react';

// Types for clarity
interface VirtualListProps {
  items: string[];
  itemHeight: number;
  containerHeight: number;
}


// 'ITEM_PADDING_NUMBER' prevents white flashes when scrolling fast.
// We render ITEM_PADDING_NUMBER extra items above and below the view.
const ITEM_PADDING_NUMBER = 5;

export const VirtualList: React.FC<VirtualListProps> = ({
  items,
  itemHeight,
  containerHeight, // how much space we have for our VirtualList ,what the user see
}) => {
  // 1. REFS: Direct DOM access is crucial for high-perf scroll reading
  // We use refs to avoid re-renders just to read properties.
  // 2. STATE: We only store the 'scrollTop' to trigger re-renders 
  
  // when the scroll position changes significantly enough to require new rows.
  const [currentScrollTop, setCurrentScrollTop] = useState(0);

  // 4. DERIVED STATE - Calculate total height to stretch the scrollbar (The "Phantom" div)
  const scrollbarHeight = items.length * itemHeight;

  // Calculate the visible range based on the current scrollTop
  const visibleStartIndex = Math.floor(currentScrollTop / itemHeight);
  const visibleEndIndex = Math.min(
    items.length - 1,
    Math.floor((currentScrollTop + containerHeight) / itemHeight)
  );

  // Apply ITEM_PADDING
  const itemsToRenderStartIndex = Math.max(0, visibleStartIndex - ITEM_PADDING_NUMBER);
  const itemsToRenderEndIndex = Math.min(items.length - 1, visibleEndIndex + ITEM_PADDING_NUMBER);

  // The subset of items to actually render
  const itemsToRender: { index: number, data: string, offsetY: number }[] = [];
  for (let i = itemsToRenderStartIndex; i <= itemsToRenderEndIndex; i++) {
    itemsToRender.push({
      index: i, // the key for the item
      data: items[i], //what to render data
      offsetY: i * itemHeight, // where to render, We calculate the top position mathematically. 
    });
  }

  // 6. SCROLL EVENT THROTTLING (Optimization)
  // We use requestAnimationFrame to ensure we don't spam the main thread.
  // This aligns React updates with the browser's paint cycle.
  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    // Current scroll position
    const currentScrollTop = e.currentTarget.scrollTop;

    // Simple Frame Throttling:
    // Ideally, you'd wrap this in a requestAnimationFrame utility, 
    // but React 18's automatic batching handles a lot of this. 
    // For strict interviews, explicit RAF is safer.
    requestAnimationFrame(() => {
      setCurrentScrollTop(currentScrollTop);
    });
  };

  return (

    <div
      //our wrapper same size as parent container, Enables scrolling
      //ref={scrollContainerRef}
      onScroll={onScroll}
      style={{
        height: containerHeight,
        width: '100%',
        overflowY: 'auto', // Enables scrolling
        position: 'relative'
      }}
    >
      {/* THE PHANTOM CONTAINER
         This div forces the scrollbar to look like the list is huge.
         It takes up space (calculated scrollbarHeight) => overflow our wrapper => forcing him to show scrollbar
         and allow our itemsToRender to 'absolute' position correctly 
      */}
      <div style={{ height: scrollbarHeight, position: 'relative' }}>
        {itemsToRender.map(({ index, data, offsetY }) => (
          <div
            key={index} // Stable key based on data index
            style={{
              //ABSOLUTE POSITIONING
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: itemHeight,
              // Using 'transform' is more performant than 'top' as it avoids layout recalculation (Composite layer).
              transform: `translateY(${offsetY}px)`,
              // nice to have for each item content 
              display: 'flex',
              alignItems: 'center',
              paddingLeft: '10px',
              borderBottom: '1px solid #eee',
              boxSizing: 'border-box'
            }}
          >
            Item {index}: {data}
          </div>
        ))}

      </div>
    </div>
  );
};
