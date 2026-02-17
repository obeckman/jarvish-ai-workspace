import { useEffect, Dispatch } from 'react';
import { GameAction, TroopMovement } from './types';
import { getMovementPosition } from './utils';

export const useGameLoop = (dispatch: Dispatch<GameAction>, troopMovements: TroopMovement[]) => {
  useEffect(() => {
    const AMBUSH_RANGE = 50;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const currentMovements = troopMovements;
      
      const activeAmbushes = currentMovements.filter(m => 
        m.type === 'ambush' && now >= m.arrivalTime
      );

      if (activeAmbushes.length === 0) return;

      let hasChanges = false;
      const resolvedIds = new Set<string>();

      activeAmbushes.forEach(ambusher => {
          currentMovements.forEach(target => {
            if (ambusher.id === target.id || ambusher.ownerId === target.ownerId) return;
            if (resolvedIds.has(target.id) || resolvedIds.has(ambusher.id)) return;

            const targetPos = getMovementPosition(target, now);
            const dist = Math.sqrt(Math.pow(ambusher.destination.x - targetPos.x, 2) + Math.pow(ambusher.destination.y - targetPos.y, 2));

            if (dist <= AMBUSH_RANGE) {
              resolvedIds.add(ambusher.id);
              resolvedIds.add(target.id);
              hasChanges = true;
            }
          });
        });
  
      if (hasChanges) {
        dispatch({ type: 'UPDATE_TROOP_MOVEMENTS', payload: currentMovements.filter(m => !resolvedIds.has(m.id)) });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [troopMovements, dispatch]);
};
