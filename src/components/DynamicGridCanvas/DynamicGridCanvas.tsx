import React, { useState, useRef, useMemo } from 'react';

// Define the shape of our grid items for type safety
interface GridItem {
  id: string;
  x: number; // grid-column-start
  y: number; // grid-row-start
  w: number; // column span
  h: number; // row span
  color: string;
}

const GRID_COLUMNS = 12;
const ROW_HEIGHT = 100; // Fixed height for calculation simplicity

export const DynamicGridCanvas = () => {
  const [items, setItems] = useState<GridItem[]>([
    { id: '1', x: 1, y: 1, w: 4, h: 2, color: '#3b82f6' },
    { id: '2', x: 5, y: 1, w: 2, h: 1, color: '#ef4444' },
  ]);

  const gridRef = useRef<HTMLDivElement>(null);

  // --- BRAINS OF THE OPERATION ---
  const handleDragUpdate = (id: string, clientX: number, clientY: number) => {
    if (!gridRef.current) return;

    const rect = gridRef.current.getBoundingClientRect();
    const cellWidth = rect.width / GRID_COLUMNS;

    // Convert pixels to Grid Coordinates (Math.round for "snapping" logic)
    const newX = Math.round((clientX - rect.left) / cellWidth) //+ 1;
    const newY = Math.round((clientY - rect.top) / ROW_HEIGHT) //+ 1;

    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, x: newX, y: newY } : item
    ));
  };

  return (
    <div 
      ref={gridRef}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_COLUMNS}, 1fr)`,
        gridAutoRows: `${ROW_HEIGHT}px`,
        //gap: '10px',
        position: 'relative',
        minHeight: '100vh',
        background: 'linear-gradient(to right, #eee 1px, transparent 1px), linear-gradient(to bottom, #eee 1px, transparent 1px)',
        backgroundSize: `calc(100% / ${GRID_COLUMNS}) ${ROW_HEIGHT}px` // Visual Grid Guide
      }}
    >
      {items.map(item => (
        <div
          key={item.id}
          draggable
          onDragEnd={(e) => handleDragUpdate(item.id, e.clientX, e.clientY)}
          style={{
            /* The 'Magic' Mapping: State -> CSS Grid */
            gridColumn: `${item.x} / span ${item.w}`,
            gridRow: `${item.y} / span ${item.h}`,
            backgroundColor: item.color,
            cursor: 'grab',
            position: 'relative',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {item.id}
          {/* Resize Handle: Absolute positioned in bottom-right */}
          <div 
            style={{ 
              position: 'absolute', bottom: 0, right: 0, 
              width: '20px', height: '20px', cursor: 'nwse-resize' 
            }}
            onMouseDown={(e) => {
                /* Implement resizing logic here by updating w and h */
                e.stopPropagation(); // Prevent drag trigger
            }}
          />
        </div>
      ))}
    </div>
  );
};

export const DynamicGridCanvasDemo: React.FC = () => {
  return (
    <div style={{ padding: '20px' }}>   
      <DynamicGridCanvas />
    </div>
  );
};