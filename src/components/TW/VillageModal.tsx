import React from 'react';
import { Village } from './types';
import  './VillageModal.css';

interface VillageModalProps {
  village: Village;
  onClose: () => void;
}

const VillageModal: React.FC<VillageModalProps> = ({ village, onClose }) => {
  console.debug('Rendering VillageModal for:', village);
  return (
    <div className="overlay">
      <div className="content">
        <h2>{village.name} <small>(Pop: {village.population})</small></h2>
        <div>
          Population Capacity: {village.buildings.farm * 100}
        </div>
        <hr />
        
        <h3>Resources</h3>
        <div className="resources">
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

        <div className="actions">
          <button onClick={onClose} className="closeBtn">Close</button>
        </div>
      </div>
    </div>
  );
};

export default VillageModal;