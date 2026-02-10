import React, { useState, useEffect } from 'react';
import GameMap from './GameMap';
import ContextMenu from './ContextMenu';
import VillageModal from './VillageModal';
import SendTroopsModal from './SendTroopsModal';
import { initialVillages, mockUsers } from './mockData';
import { Village, ContextMenuState, TroopMovement, MovementType, ContextMenuAction } from './types';
import { GameContext } from './GameContext';
import { getVillageView, getMovementPosition } from './utils';
import './GameApp.css';

export const GameApp = () => {
  const [villages, setVillages] = useState<Village[]>(initialVillages);
  const [currentUser, setCurrentUser] = useState(mockUsers[0]);
  const [troopMovements, setTroopMovements] = useState<TroopMovement[]>([]);
  
  // State for the right-click menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    villageId: null,
  });

  // State for the currently open modal
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  
  // State for sending troops
  const [sendTroopsModal, setSendTroopsModal] = useState<{
    visible: boolean;
    target: { x: number; y: number; villageId?: string } | null;
    missionType?: MovementType;
  }>({ visible: false, target: null });

  const handleVillageContextMenu = (e: React.MouseEvent, villageId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      villageId: villageId,
    });
  };

  const handleMapContextMenu = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x,
      y,
      villageId: null, // No village clicked, just map
    });
  };

  const handleMapClick = () => {
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const handleMenuAction = (action: ContextMenuAction) => {
    if (action === 'info' && contextMenu.villageId) {
      setSelectedVillageId(contextMenu.villageId);
    } else if (action === 'attack' || action === 'ambush') {
      // Determine target
      let target: { x: number; y: number; villageId?: string } | null = null;
      if (contextMenu.villageId) {
        const v = villages.find(v => v.id === contextMenu.villageId);
        if (v) {
          target = { x: v.x, y: v.y };
          if (action === 'attack') {
            target.villageId = v.id;
          }
        }
      } else {
        target = { x: contextMenu.x, y: contextMenu.y }; // Map click coordinates (relative to viewport, ideally should be map-relative but simplified here)
      }
      if (target) setSendTroopsModal({ visible: true, target, missionType: action as MovementType });
    } else {
      console.log(`Action triggered: ${action} on village ${contextMenu.villageId}`);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  const selectedVillage = villages.find(v => v.id === selectedVillageId);
  
  // For simplicity, assume the user always sends from their first village
  const userVillage = villages.find(v => v.ownerId === currentUser.id);

  const addTroopMovement = (movement: TroopMovement) => {
    setTroopMovements(prev => [...prev, movement]);
  };

  // Game Loop for Ambush Logic
  useEffect(() => {
    const AMBUSH_RANGE = 50;
    
    const interval = setInterval(() => {
      const now = Date.now();
      
      setTroopMovements(currentMovements => {
        let hasChanges = false;
        const resolvedIds = new Set<string>();

        // Identify active ambushes (arrived at location)
        const activeAmbushes = currentMovements.filter(m => 
          m.type === 'ambush' && now >= m.arrivalTime
        );

        if (activeAmbushes.length === 0) return currentMovements;

        activeAmbushes.forEach(ambusher => {
          // Check against all other movements
          currentMovements.forEach(target => {
            if (ambusher.id === target.id || ambusher.ownerId === target.ownerId) return;
            if (resolvedIds.has(target.id) || resolvedIds.has(ambusher.id)) return;

            const targetPos = getMovementPosition(target, now);
            const dist = Math.sqrt(Math.pow(ambusher.destination.x - targetPos.x, 2) + Math.pow(ambusher.destination.y - targetPos.y, 2));

            if (dist <= AMBUSH_RANGE) {
              console.log(`⚔️ Ambush triggered! ${ambusher.id} engaged ${target.id}`);
              resolvedIds.add(ambusher.id);
              resolvedIds.add(target.id);
              hasChanges = true;
            }
          });
        });

        return hasChanges ? currentMovements.filter(m => !resolvedIds.has(m.id)) : currentMovements;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <GameContext.Provider value={{ currentUser, troopMovements, addTroopMovement }}>
      <div className="container">
        <div className="user-switcher">
          <label>
            Current User: 
            <select 
              value={currentUser.id} 
              onChange={(e) => {
                const user = mockUsers.find(u => u.id === e.target.value);
                if (user) setCurrentUser(user);
              }}
            >
              {mockUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>
        </div>

        <GameMap 
          villages={villages} 
          troopMovements={troopMovements}
          onVillageContextMenu={handleVillageContextMenu}
          onMapContextMenu={handleMapContextMenu}
          onMapClick={handleMapClick}
        />

        {contextMenu.visible && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            onAction={handleMenuAction} 
          />
        )}

        {selectedVillage && (
          <VillageModal 
            village={getVillageView(selectedVillage, currentUser.id)} 
            onClose={() => setSelectedVillageId(null)} 
          />
        )}

        {sendTroopsModal.visible && sendTroopsModal.target && userVillage && (
          <SendTroopsModal
            originVillage={userVillage}
            target={sendTroopsModal.target}
            ownerId={currentUser.id}
            onClose={() => setSendTroopsModal({ visible: false, target: null })}
            onSend={addTroopMovement}
            defaultMissionType={sendTroopsModal.missionType}
          />
        )}
      </div>
    </GameContext.Provider>
  );
};
