import React, { useState } from 'react';
import GameMap from './GameMap';
import ContextMenu from './ContextMenu';
import VillageModal from './VillageModal';
import SendTroopsModal from './SendTroopsModal';
import { initialVillages, mockUser } from './mockData';
import { Village, ContextMenuState } from './types';
import { Village, ContextMenuState, TroopMovement } from './types';
import { GameContext } from './GameContext';
import { getVillageView } from './utils';
import './GameApp.css';

export const GameApp = () => {
  const [villages, setVillages] = useState<Village[]>(initialVillages);
  const [currentUser] = useState(mockUser);
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

  const handleMapContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      villageId: null, // No village clicked, just map
    });
  };

  const handleMapClick = () => {
    if (contextMenu.visible) {
      setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const handleMenuAction = (action: string) => {
    if (action === 'info' && contextMenu.villageId) {
      setSelectedVillageId(contextMenu.villageId);
    } else if (action === 'attack') {
      // Determine target
      let target = null;
      if (contextMenu.villageId) {
        const v = villages.find(v => v.id === contextMenu.villageId);
        if (v) target = { x: v.x, y: v.y, villageId: v.id };
      } else {
        target = { x: contextMenu.x, y: contextMenu.y }; // Map click coordinates (relative to viewport, ideally should be map-relative but simplified here)
      }
      if (target) setSendTroopsModal({ visible: true, target });
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

  return (
    <GameContext.Provider value={{ currentUser }}>
    <GameContext.Provider value={{ currentUser, troopMovements, addTroopMovement }}>
      <div className="container">
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
          />
        )}
      </div>
    </GameContext.Provider>
  );
};
