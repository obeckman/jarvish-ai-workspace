import { Village, VillageView, TroopMovement } from './types';

export const getVillageView = (village: Village, currentUserId: string): VillageView => {
  if (village.ownerId === currentUserId) {
    return village;
  }
  // Return partial info for non-owners
  const { id, name, x, y, population, ownerId } = village;
  return { id, name, x, y, population, ownerId };
};

export const getMovementPosition = (movement: TroopMovement, now: number) => {
  const totalDuration = movement.arrivalTime - movement.startTime;
  if (totalDuration <= 0) return movement.destination;
  
  const elapsed = now - movement.startTime;
  
  if (elapsed >= totalDuration) {
    return movement.destination;
  }
  if (elapsed < 0) return movement.origin;

  const progress = elapsed / totalDuration;
  const x = movement.origin.x + (movement.destination.x - movement.origin.x) * progress;
  const y = movement.origin.y + (movement.destination.y - movement.origin.y) * progress;
  
  return { x, y };
};