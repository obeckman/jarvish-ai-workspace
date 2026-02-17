import React from 'react';
import { VillageView, Village } from './types';
import styles from './village-modal.module.scss';

interface VillageModalProps {
  village: VillageView;
  onClose: () => void;
}

const VillageModal: React.FC<VillageModalProps> = ({ village, onClose }) => {

  // Type guard to check if we have full village info
  const isOwner = (v: VillageView): v is Village => {
    return 'resources' in v;
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <h2>{village.name} <small>(Pop: {village.population})</small></h2>
        
        {isOwner(village) ? (
          <>
            <div>
              Population Capacity: {village.buildings.farm * 100}
            </div>
            <hr />
            
            <h3>Resources</h3>
            <div className={styles.resources}>
              <span>🪵 Wood: {village.resources.wood}</span>
              <span>🪨 Stone: {village.resources.stone}</span>
              <span>⛓️ Iron: {village.resources.iron}</span>
              <span>🍞 Food: {village.resources.food}</span>
            </div>

            <h3>Buildings (Levels)</h3>
            <ul>
              <li>Town Center: Lv {village.buildings.townCenter}</li>
              <li>🪵 Wood Camp: Lv {village.buildings.woodCamp}</li>
              <li>🪨 Stone Pit: Lv {village.buildings.stonePit}</li>
              <li>⛓️ Iron Mine: Lv {village.buildings.ironMine}</li>
              <li>🌾 Farm: Lv {village.buildings.farm}</li>
              <li>Barracks: Lv {village.buildings.barracks}</li>
            </ul>

            <h3>Units</h3>
            <ul>
              <li>Infantry: {village.units.infantry}</li>
              <li>Archers: {village.units.archers}</li>
              <li>Cavalry: {village.units.cavalry}</li>
            </ul>
          </>
        ) : (
          <div>
            <hr />
            <p><strong>Owner ID:</strong> {village.ownerId}</p>
            <p><em>You do not own this village. Information is limited.</em></p>
          </div>
        )}

        <div className={styles.actions}>
          <button onClick={onClose} className={styles.closeBtn}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default VillageModal;