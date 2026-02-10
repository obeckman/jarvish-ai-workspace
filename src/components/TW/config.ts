import { TroopType } from './types';

export const UNIT_SPEEDS: Record<TroopType, number> = {
  infantry: 20, // pixels per second
  archers: 30,
  cavalry: 60,
};