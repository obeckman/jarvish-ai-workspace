import { Village } from './types';

export const initialVillages: Village[] = [
  {
    id: 'v1',
    name: 'Alpha Outpost',
    x: 150,
    y: 200,
    resources: { wood: 120, stone: 40, food: 300 },
    buildings: { townCenter: 1, resourceField: 2, barracks: 0 },
    units: { infantry: 5, archers: 0, cavalry: 0 },
  },
  {
    id: 'v2',
    name: 'Bravo Fort',
    x: 450,
    y: 350,
    resources: { wood: 500, stone: 200, food: 100 },
    buildings: { townCenter: 2, resourceField: 3, barracks: 1 },
    units: { infantry: 20, archers: 10, cavalry: 5 },
  },
  {
    id: 'v3',
    name: 'Charlie Settlement',
    x: 800,
    y: 100,
    resources: { wood: 50, stone: 0, food: 50 },
    buildings: { townCenter: 1, resourceField: 1, barracks: 0 },
    units: { infantry: 0, archers: 0, cavalry: 0 },
  },
];