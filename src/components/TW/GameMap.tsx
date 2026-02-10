import React from 'react';
import { Village } from './types';
import VillageMarker from './VillageMarker';

interface GameMapProps {
  villages: Village[];
  onVillageContextMenu: (e: React.MouseEvent, villageId: string) => void;
  onMapClick: () => void;
}

const GameMap: React.FC<GameMapProps> = ({ villages, onVillageContextMenu, onMapClick }) => {
  return (
    <div
      onClick={onMapClick}
      style={{
        position: 'relative',
        width: '2000px', // Large map width
        height: '2000px', // Large map height
        backgroundColor: '#4caf50', // Fallback green
        // Simple CSS pattern for grass
        backgroundImage: `
          radial-gradient(circle, #66bb6a 2px, transparent 2.5px),
          radial-gradient(circle, #66bb6a 2px, transparent 2.5px)
        `,
        backgroundSize: '20px 20px',
        backgroundPosition: '0 0, 10px 10px',
        overflow: 'hidden',
      }}
    >
      {villages.map((village) => (
        <VillageMarker
          key={village.id}
          village={village}
          onContextMenu={onVillageContextMenu}
        />
      ))}
    </div>
  );
};

export default GameMap;