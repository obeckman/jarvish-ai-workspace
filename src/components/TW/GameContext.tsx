import React, { createContext, useContext } from 'react';
import { User, TroopMovement } from './types';

interface GameContextType {
  currentUser: User;
  troopMovements: TroopMovement[];
  addTroopMovement: (movement: TroopMovement) => void;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};