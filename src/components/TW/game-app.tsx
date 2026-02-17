import React, { useReducer } from 'react';
import GameMap from './game-map';
import ContextMenu from './context-menu';
import VillageModal from './village-modal';
import SendTroopsModal from './send-troops-modal';
import { initialVillages, mockUsers } from './mockData';
import { TroopMovement, GameState, GameAction } from './types';
import { GameContext } from './game-context';
import { getVillageView } from './utils';
import { useContextMenu } from './useContextMenu';
import { useGameLoop } from './useGameLoop';
import styles from './game-app.module.scss';

// Define Initial State
const initialState: GameState = {
  villages: initialVillages,
  currentUser: mockUsers[0],
  troopMovements: [],
  contextMenu: { visible: false, x: 0, y: 0, villageId: null },
  selectedVillageId: null,
  sendTroopsModal: { visible: false, target: null },
};

// Create Reducer
const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUser: action.payload };
    case 'ADD_TROOP_MOVEMENT':
      return { ...state, troopMovements: [...state.troopMovements, action.payload] };
    case 'UPDATE_TROOP_MOVEMENTS':
        return { ...state, troopMovements: action.payload };
    case 'SHOW_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: {
          visible: true,
          x: action.payload.x,
          y: action.payload.y,
          villageId: action.payload.villageId || null,
        },
      };
    case 'HIDE_CONTEXT_MENU':
      return { ...state, contextMenu: { ...state.contextMenu, visible: false } };
    case 'SHOW_VILLAGE_MODAL':
      return { ...state, selectedVillageId: action.payload, contextMenu: { ...state.contextMenu, visible: false } };
    case 'HIDE_VILLAGE_MODAL':
      return { ...state, selectedVillageId: null };
    case 'SHOW_SEND_TROOPS_MODAL':
      return { ...state, sendTroopsModal: { visible: true, ...action.payload }, contextMenu: { ...state.contextMenu, visible: false } };
    case 'HIDE_SEND_TROOPS_MODAL':
      return { ...state, sendTroopsModal: { visible: false, target: null } };
    default:
      return state;
  }
};

export const GameApp = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { villages, currentUser, troopMovements, contextMenu, selectedVillageId, sendTroopsModal } = state;

  const {
    handleVillageContextMenu,
    handleMapContextMenu,
    handleMapClick,
    handleMenuAction,
  } = useContextMenu(dispatch, villages, contextMenu);
  
  const addTroopMovement = (movement: TroopMovement) => {
    dispatch({ type: 'ADD_TROOP_MOVEMENT', payload: movement });
  };

  useGameLoop(dispatch, troopMovements);

  const selectedVillage = villages.find(v => v.id === selectedVillageId);
  const userVillage = villages.find(v => v.ownerId === currentUser.id);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      <div className={styles.container}>
        <div className={styles.userSwitcher}>
          <label>
            Current User: 
            <select 
              value={currentUser.id} 
              onChange={(e) => {
                const user = mockUsers.find(u => u.id === e.target.value);
                if (user) dispatch({ type: 'SET_CURRENT_USER', payload: user });
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
            onClose={() => dispatch({ type: 'HIDE_VILLAGE_MODAL' })} 
          />
        )}

        {sendTroopsModal.visible && sendTroopsModal.target && userVillage && (
          <SendTroopsModal
            originVillage={userVillage}
            target={sendTroopsModal.target}
            ownerId={currentUser.id}
            onClose={() => dispatch({ type: 'HIDE_SEND_TROOPS_MODAL' })}
            onSend={addTroopMovement}
            defaultMissionType={sendTroopsModal.missionType}
          />
        )}
      </div>
    </GameContext.Provider>
  );
};
