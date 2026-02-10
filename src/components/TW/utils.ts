import { Village, VillageView } from './types';

export const getVillageView = (village: Village, currentUserId: string): VillageView => {
  if (village.ownerId === currentUserId) {
    return village;
  }
  // Return partial info for non-owners
  const { id, name, x, y, population, ownerId } = village;
  return { id, name, x, y, population, ownerId };
};