import React from 'react';
import { Village } from './types';

interface VillageModalProps {
  village: Village;
  onClose: () => void;
}

const VillageModal: React.FC<VillageModalProps> = ({ village, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        width: '400px',
        maxWidth: '90%',
      }}>
        <h2>{village.name}</h2>
        <hr />
        
        <h3>Resources</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <span>🪵 Wood: {village.resources.wood}</span>
          <span>🪨 Stone: {village.resources.stone}</span>
          <span>🍞 Food: {village.resources.food}</span>
        </div>

        <h3>Buildings (Levels)</h3>
        <ul>
          <li>Town Center: Lv {village.buildings.townCenter}</li>
          <li>Resource Fields: Lv {village.buildings.resourceField}</li>
          <li>Barracks: Lv {village.buildings.barracks}</li>
        </ul>

        <h3>Units</h3>
        <ul>
          <li>Infantry: {village.units.infantry}</li>
          <li>Archers: {village.units.archers}</li>
          <li>Cavalry: {village.units.cavalry}</li>
        </ul>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default VillageModal;