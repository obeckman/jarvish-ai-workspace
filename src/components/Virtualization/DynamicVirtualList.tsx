import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';

interface DynamicVirtualListProps {
  items: any[];
  containerHeight: number;// how much space we have for our VirtualList ,what the user see
  estimatedItemHeight: number; // Best guess (e.g., 50px) to calculate scrollbar initially
  renderItem: (item: any, index: number) => React.ReactNode;
}

// Helper: Binary Search to find the item at a specific scroll offset
// Returns the index of the item that contains the 'scrollTop' pixel
const findStartIndex = (offsets: number[], scrollTop: number) => {
  let low = 0;
  let high = offsets.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const offset = offsets[mid];
    if (offset === scrollTop) return mid;
    if (offset < scrollTop) low = mid + 1;
    else high = mid - 1;
  }
  return Math.max(0, low - 1);
};

export const DynamicVirtualList: React.FC<DynamicVirtualListProps> = ({
  items,
  containerHeight,// how much space we have for our VirtualList ,what the user see
  estimatedItemHeight,
  renderItem,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // 1. MEASUREMENT STATE
  // We store the height of every item here. 
  // Key: Index, Value: Height in pixels
  const [heightMap, setHeightMap] = useState<Record<number, number>>({});

  // 2. REFS FOR DOM MEASUREMENT
  // We use a ResizeObserver to detect size changes automatically
  const resizeObserver = useRef<ResizeObserver>();


  useEffect(() => {
    // Initialize Observer on mount
    resizeObserver.current = new ResizeObserver((entries) => {
      // This runs whenever an observed item changes size
      let needsUpdate = false;
      const newHeightMap = { ...heightMap }; // Copy current map (closure stale? use ref in real prod)

      // Note: In a production app, we would use a Ref for heightMap to avoid 
      // stale closures in this callback, but strictly for this example we simplify.
      // We are just illustrating the measurement logic.

      for (const entry of entries) {
        const index = parseInt(entry.target.getAttribute('data-index') || '0', 10);
        const height = entry.contentRect.height;

        if (newHeightMap[index] !== height) {
          newHeightMap[index] = height;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        // In reality, use functional state update to merge safely
        setHeightMap((prev) => ({ ...prev, ...newHeightMap }));
      }
    });

    return () => resizeObserver.current?.disconnect();
  }, []);

  // 3. DERIVED STATE: OFFSETS (The "JIT" Calculation)
  // We rebuild the offset array whenever the heightMap changes.
  // This is expensive (O(N)), but necessary for dynamic lists.
  // In huge lists, you would use a Segment Tree to make this O(log N).
  const { offsets, totalHeight } = useMemo(() => {
    const offsets = [0];
    let currentOffset = 0;

    for (let i = 0; i < items.length; i++) {
      // If we haven't measured it yet, use the estimate
      const height = heightMap[i] || estimatedItemHeight;
      currentOffset += height;
      offsets.push(currentOffset);
    }

    return { offsets, totalHeight: currentOffset };
  }, [items, heightMap, estimatedItemHeight]);


  // 4. FIND VISIBLE WINDOW using Binary Search
  const startIndex = findStartIndex(offsets, scrollTop);

  // Find endIndex by accumulating heights until we fill the container
  let endIndex = startIndex;
  let currentOffset = offsets[startIndex];
  while (currentOffset < scrollTop + containerHeight && endIndex < items.length - 1) {
    endIndex++;
    currentOffset = offsets[endIndex];
  }

  // Add Overscan
  const OVERSCAN = 3;
  const visibleStartIndex = Math.max(0, startIndex - OVERSCAN);
  const visibleEndIndex = Math.min(items.length - 1, endIndex + OVERSCAN);

  // 5. RENDER HELPER (The "Callback Ref")
  // We attach the observer to every new DOM node that enters the window
  const measureElement = (element: HTMLDivElement | null, index: number) => {
    if (element) {
      element.setAttribute('data-index', index.toString());
      resizeObserver.current?.observe(element);
    }
  };

  const visibleItems: { index: number, data: string, offsetY: number }[] = [];
  for (let i = visibleStartIndex; i <= visibleEndIndex; i++) {
    visibleItems.push({
      index: i,
      data: items[i],
      offsetY: offsets[i], // The calculated top position
    });
  }

  return (
    <div
      ref={scrollContainerRef}
      onScroll={(e) => requestAnimationFrame(() => setScrollTop(e.currentTarget.scrollTop))}
      style={{ height: containerHeight, overflowY: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, data, offsetY }) => (
          <div
            key={index}
            // Attach the measurement ref!
            ref={(el) => measureElement(el, index)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${offsetY}px)`,
            }}
          >
            {renderItem(data, index)}
          </div>
        ))}
      </div>
    </div>
  );
};
