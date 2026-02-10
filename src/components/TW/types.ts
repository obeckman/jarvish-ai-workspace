export interface Resources {
  wood: number;
  stone: number;
  food: number;
}

export interface Buildings {
  townCenter: number; // Level
  resourceField: number; // Level
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
  resources: Resources;
  buildings: Buildings;
  units: Units;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  villageId: string | null;
}