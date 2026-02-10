import React from 'react';
import { Village, TroopMovement } from './types';
import VillageMarker from './VillageMarker';
import TroopMovementMarker from './TroopMovementMarker';
import './GameMap.css';

interface GameMapProps {
  villages: Village[];
  troopMovements: TroopMovement[];
  onVillageContextMenu: (e: React.MouseEvent, villageId: string) => void;
  onMapContextMenu: (e: React.MouseEvent) => void;
  onMapClick: () => void;
}

const GameMap: React.FC<GameMapProps> = ({ villages, troopMovements, onVillageContextMenu, onMapContextMenu, onMapClick }) => {
  return (
    <div
      onClick={onMapClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onMapContextMenu(e);
      }}
      className="map"
    >
      {villages.map((village) => (
        <VillageMarker
          key={village.id}
          village={village}
          onContextMenu={onVillageContextMenu}
        />
      ))}
      
      {troopMovements.map((movement) => (
        <TroopMovementMarker 
          key={movement.id} 
          movement={movement} 
        />
      ))}
    </div>
  );
};

export default GameMap;