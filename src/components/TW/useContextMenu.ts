import React, { Dispatch } from 'react';
import { GameAction, ContextMenuAction, Village, GameState, MovementType } from './types';

export const useContextMenu = (
  dispatch: Dispatch<GameAction>,
  villages: Village[],
  contextMenu: GameState['contextMenu']
) => {
  const handleVillageContextMenu = (e: React.MouseEvent, villageId: string) => {
    e.preventDefault();
    dispatch({ type: 'SHOW_CONTEXT_MENU', payload: { x: e.clientX, y: e.clientY, villageId } });
  };

  const handleMapContextMenu = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    dispatch({ type: 'SHOW_CONTEXT_MENU', payload: { x, y } });
  };

  const handleMapClick = () => {
    if (contextMenu.visible) {
      dispatch({ type: 'HIDE_CONTEXT_MENU' });
    }
  };

  const handleMenuAction = (action: ContextMenuAction) => {
    if (action === 'info' && contextMenu.villageId) {
      dispatch({ type: 'SHOW_VILLAGE_MODAL', payload: contextMenu.villageId });
    } else if (action === 'attack' || action === 'ambush') {
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
        target = { x: contextMenu.x, y: contextMenu.y };
      }
                      if (target) {
                      dispatch({
                        type: 'SHOW_SEND_TROOPS_MODAL',
                        payload: { target, missionType: action as MovementType },
                      });      }
    } else {
      dispatch({ type: 'HIDE_CONTEXT_MENU' });
    }
  };

  return {
    handleVillageContextMenu,
    handleMapContextMenu,
    handleMapClick,
    handleMenuAction,
  };
};
