export interface Resources {
  wood: number;
  stone: number;
  iron: number;
  food: number;
}

export interface Buildings {
  townCenter: number; // Level
  woodCamp: number;
  stonePit: number;
  ironMine: number;
  farm: number;
  barracks: number; // Level
}

export interface Units {
  infantry: number;
  archers: number;
  cavalry: number;
}

export interface Village {
  id: string;
  name: string;
  x: number; // Map coordinate X
  y: number; // Map coordinate Y
  population: number;
  ownerId: string;
  resources: Resources;
  buildings: Buildings;
  units: Units;
}

export interface User {
  id: string;
  name: string;
  ownedVillageIds: string[];
}

export type PublicVillage = Pick<Village, 'id' | 'name' | 'x' | 'y' | 'population' | 'ownerId'>;
export type VillageView = Village | PublicVillage;

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  villageId: string | null;
}