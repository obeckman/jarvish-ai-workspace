import { Village, User } from './types';

export const mockUser: User = {
  id: 'u1',
  name: 'PlayerOne',
  ownedVillageIds: ['v1'],
};

export const initialVillages: Village[] = [
  {
    id: 'v1',
    name: 'Alpha Outpost',
    x: 150,
    y: 200,
    population: 150,
    ownerId: 'u1',
    resources: { wood: 120, stone: 40, iron: 10, food: 300 },
    buildings: { townCenter: 1, woodCamp: 2, stonePit: 1, ironMine: 0, farm: 3, barracks: 0 },
    units: { infantry: 5, archers: 0, cavalry: 0 },
  },
  {
    id: 'v2',
    name: 'Bravo Fort',
    x: 450,
    y: 350,
    population: 450,
    ownerId: 'u2',
    resources: { wood: 500, stone: 200, iron: 150, food: 100 },
    buildings: { townCenter: 2, woodCamp: 5, stonePit: 4, ironMine: 3, farm: 6, barracks: 1 },
    units: { infantry: 20, archers: 10, cavalry: 5 },
  },
  {
    id: 'v3',
    name: 'Charlie Settlement',
    x: 800,
    y: 100,
    population: 50,
    ownerId: 'u2',
    resources: { wood: 50, stone: 0, iron: 0, food: 50 },
    buildings: { townCenter: 1, woodCamp: 1, stonePit: 0, ironMine: 0, farm: 1, barracks: 0 },
    units: { infantry: 0, archers: 0, cavalry: 0 },
  },
];