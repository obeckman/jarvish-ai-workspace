import React, { useState } from 'react';
import GameMap from './GameMap';
import ContextMenu from './ContextMenu';
import VillageModal from './VillageModal';
import { initialVillages } from './mockData';
import { Village, ContextMenuState } from './types';
import './GameApp.css';

export const GameApp = () => {
  const [villages, setVillages] = useState<Village[]>(initialVillages);
  
  // State for the right-click menu
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    villageId: null,
  });

  // State for the currently open modal
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);

  const handleVillageContextMenu = (e: React.MouseEvent, villageId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      villageId: villageId,
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
    } else {
      console.log(`Action triggered: ${action} on village ${contextMenu.villageId}`);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  const selectedVillage = villages.find(v => v.id === selectedVillageId);

  return (
    <div className="container">
      <GameMap 
        villages={villages} 
        onVillageContextMenu={handleVillageContextMenu}
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
          village={selectedVillage} 
          onClose={() => setSelectedVillageId(null)} 
        />
      )}
    </div>
  );
};
