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

export type TroopType = 'infantry' | 'archers' | 'cavalry';

export interface Troop {
  type: TroopType;
  count: number;
  speed: number; // pixels per second
}

export type MovementType = 'attack' | 'support' | 'scout' | 'stationed' | 'idle' | 'ambush';

export type ContextMenuAction = MovementType | 'info' | 'trade';

export interface TroopMovement {
  id: string;
  ownerId: string;
  originVillageId: string;
  origin: { x: number; y: number };
  destination: { villageId?: string; x: number; y: number; targetMovementId?: string };
  type: MovementType;
  startTime: number;
  arrivalTime: number;
  troops: Troop[];
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

// --- New Types for useReducer ---

export interface GameState {
  villages: Village[];
  currentUser: User;
  troopMovements: TroopMovement[];
  contextMenu: ContextMenuState;
  selectedVillageId: string | null;
  sendTroopsModal: {
    visible: boolean;
    target: { x: number; y: number; villageId?: string } | null;
    missionType?: MovementType;
  };
}

export type GameAction =
  | { type: 'SET_CURRENT_USER'; payload: User }
  | { type: 'ADD_TROOP_MOVEMENT'; payload: TroopMovement }
  | { type: 'UPDATE_TROOP_MOVEMENTS'; payload: TroopMovement[] }
  | { type: 'SHOW_CONTEXT_MENU'; payload: { x: number; y: number; villageId?: string | null } }
  | { type: 'HIDE_CONTEXT_MENU' }
  | { type: 'SHOW_VILLAGE_MODAL'; payload: string }
  | { type: 'HIDE_VILLAGE_MODAL' }
  | { type: 'SHOW_SEND_TROOPS_MODAL'; payload: { target: { x: number; y: number; villageId?: string }; missionType: MovementType } }
  | { type: 'HIDE_SEND_TROOPS_MODAL' };