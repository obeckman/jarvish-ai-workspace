import React from 'react';
import { Village } from './types';
import styles from './village-marker.module.scss';

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
      className={styles.marker}
      style={{ left: village.x, top: village.y }}
      title={`${village.name} (Pop: ${village.population})`}
    >
      <span className={styles.icon}>🏠</span>
      <div className={styles.label}>
        {village.name} ({village.population})
      </div>
    </div>
  );
};

export default VillageMarker;