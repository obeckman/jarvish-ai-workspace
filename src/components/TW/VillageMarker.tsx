import React from 'react';
import { Village } from './types';

interface VillageMarkerProps {
  village: Village;
  onContextMenu: (e: React.MouseEvent, villageId: string) => void;
}

const VillageMarker: React.FC<VillageMarkerProps> = ({ village, onContextMenu }) => {
  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent map click
        onContextMenu(e, village.id);
      }}
      style={{
        position: 'absolute',
        left: village.x,
        top: village.y,
        width: '40px',
        height: '40px',
        backgroundColor: '#8d6e63', // Brown for village
        border: '2px solid #3e2723',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transform: 'translate(-50%, -50%)', // Center on coordinate
        boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
      }}
      title={village.name}
    >
      <span style={{ fontSize: '20px' }}>🏠</span>
      <div
        style={{
          position: 'absolute',
          top: '45px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '2px 5px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
        }}
      >
        {village.name}
      </div>
    </div>
  );
};

export default VillageMarker;