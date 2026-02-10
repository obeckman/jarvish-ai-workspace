import React from 'react';
import { Village } from './types';
import VillageMarker from './VillageMarker';
import './GameMap.css';

interface GameMapProps {
  villages: Village[];
  onVillageContextMenu: (e: React.MouseEvent, villageId: string) => void;
  onMapClick: () => void;
}

const GameMap: React.FC<GameMapProps> = ({ villages, onVillageContextMenu, onMapClick }) => {
  return (
    <div
      onClick={onMapClick}
      className="map"
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