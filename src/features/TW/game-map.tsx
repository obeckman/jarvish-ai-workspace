import React from 'react';
import { Village, TroopMovement } from './types';
import VillageMarker from './village-marker';
import TroopMovementMarker from './troop-movement-marker';
import styles from './game-map.module.scss';

interface GameMapProps {
  villages: Village[];
  troopMovements: TroopMovement[];
  onVillageContextMenu: (e: React.MouseEvent, villageId: string) => void;
  onMapContextMenu: (e: React.MouseEvent, x: number, y: number) => void;
  onMapClick: () => void;
}

const GameMap: React.FC<GameMapProps> = ({ villages, troopMovements, onVillageContextMenu, onMapContextMenu, onMapClick }) => {
  return (
    <div
      onClick={onMapClick}
      onContextMenu={(e) => {
        e.preventDefault();
        const mapDiv = e.currentTarget as HTMLDivElement;
        const rect = mapDiv.getBoundingClientRect();
        const x = e.clientX - rect.left + (mapDiv.parentElement?.scrollLeft ?? 0);
        const y = e.clientY - rect.top + (mapDiv.parentElement?.scrollTop ?? 0);
        onMapContextMenu(e, x, y);
      }}
      className={styles.map}
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