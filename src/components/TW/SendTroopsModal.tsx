import React, { useState } from 'react';
import { Village, TroopMovement, TroopType } from './types';
import './SendTroopsModal.css';

interface SendTroopsModalProps {
  originVillage: Village;
  target: { x: number; y: number; villageId?: string };
  ownerId: string;
  onClose: () => void;
  onSend: (movement: TroopMovement) => void;
}

const UNIT_SPEEDS: Record<TroopType, number> = {
  infantry: 20, // pixels per second
  archers: 30,
  cavalry: 60,
};

const SendTroopsModal: React.FC<SendTroopsModalProps> = ({ originVillage, target, ownerId, onClose, onSend }) => {
  const [units, setUnits] = useState({
    infantry: 0,
    archers: 0,
    cavalry: 0,
  });

  const calculateDistance = () => {
    const dx = target.x - originVillage.x;
    const dy = target.y - originVillage.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const calculateDuration = () => {
    const distance = calculateDistance();
    let slowestSpeed = Infinity;
    if (units.infantry > 0) slowestSpeed = Math.min(slowestSpeed, UNIT_SPEEDS.infantry);
    if (units.archers > 0) slowestSpeed = Math.min(slowestSpeed, UNIT_SPEEDS.archers);
    if (units.cavalry > 0) slowestSpeed = Math.min(slowestSpeed, UNIT_SPEEDS.cavalry);
    
    if (slowestSpeed === Infinity) return 0;
    return (distance / slowestSpeed) * 1000; // ms
  };

  const handleSend = () => {
    const duration = calculateDuration();
    if (duration === 0) return;

    const now = Date.now();
    const movement: TroopMovement = {
      id: `tm-${now}`,
      ownerId,
      originVillageId: originVillage.id,
      origin: { x: originVillage.x, y: originVillage.y },
      destination: target,
      type: 'attack',
      startTime: now,
      arrivalTime: now + duration,
      troops: [
        { type: 'infantry', count: units.infantry, speed: UNIT_SPEEDS.infantry },
        { type: 'archers', count: units.archers, speed: UNIT_SPEEDS.archers },
        { type: 'cavalry', count: units.cavalry, speed: UNIT_SPEEDS.cavalry },
      ].filter(t => t.count > 0),
    };

    onSend(movement);
    onClose();
  };

  const duration = calculateDuration();
  const arrivalTime = new Date(Date.now() + duration).toLocaleTimeString();

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Send Troops</h3>
        <p>From: {originVillage.name}</p>
        <p>To: {target.villageId ? `Village ${target.villageId}` : `(${target.x}, ${target.y})`}</p>
        
        <div className="input-group">
          <label>Infantry (Max: {originVillage.units.infantry})</label>
          <input type="number" min="0" max={originVillage.units.infantry} value={units.infantry} onChange={e => setUnits({...units, infantry: parseInt(e.target.value) || 0})} />
        </div>
        <div className="input-group">
          <label>Archers (Max: {originVillage.units.archers})</label>
          <input type="number" min="0" max={originVillage.units.archers} value={units.archers} onChange={e => setUnits({...units, archers: parseInt(e.target.value) || 0})} />
        </div>
        <div className="input-group">
          <label>Cavalry (Max: {originVillage.units.cavalry})</label>
          <input type="number" min="0" max={originVillage.units.cavalry} value={units.cavalry} onChange={e => setUnits({...units, cavalry: parseInt(e.target.value) || 0})} />
        </div>

        <p>Arrival: {duration > 0 ? arrivalTime : '-'}</p>

        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSend} disabled={duration === 0}>Send Attack</button>
        </div>
      </div>
    </div>
  );
};

export default SendTroopsModal;