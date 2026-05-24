import { MapData } from './types'

const T = 'tree'  as const
const P = 'path'  as const
const G = 'grass' as const
const W = 'water' as const

export const route1: MapData = {
  id: 'route1',
  name: 'Route 1',
  width: 15,
  height: 20,
  tiles: [
    [T,T,T,T,P,P,P,P,P,P,P,T,T,T,T],   // row 0: wide opening cols 4-10 to match Pallet exits
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,G,G,G,P,P,P,P,P,G,G,G,P,T],
    [T,P,G,G,G,G,P,P,P,G,G,G,G,P,T],
    [T,P,G,G,G,G,G,P,G,G,G,G,G,P,T],
    [T,P,P,G,G,G,P,P,P,G,G,G,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,G,G,P,P,P,P,P,P,P,G,G,P,T],
    [T,P,G,G,G,P,P,P,P,P,G,G,G,P,T],
    [T,P,P,G,G,G,P,P,P,G,G,G,P,P,T],
    [T,P,W,W,P,P,P,P,P,P,P,W,W,P,T],   // row 10: ponds (cols 2-3, 11-12)
    [T,P,W,W,G,P,P,P,P,P,G,W,W,P,T],   // row 11: ponds continue
    [T,P,G,G,G,G,P,P,P,G,G,G,G,P,T],
    [T,P,P,G,G,G,G,P,G,G,G,G,P,P,T],
    [T,P,P,P,G,G,P,P,P,G,G,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,T,T,T,P,P,P,P,P,P,P,T,T,T,T],   // row 19: wide opening at bottom
  ],
  wildPokemon: [
    { pokemonId: 16, minLevel: 2, maxLevel: 5, rate: 30 },
    { pokemonId: 19, minLevel: 2, maxLevel: 4, rate: 25 },
    { pokemonId: 10, minLevel: 2, maxLevel: 4, rate: 20 },
    { pokemonId: 13, minLevel: 2, maxLevel: 4, rate: 15 },
    { pokemonId: 1,  minLevel: 3, maxLevel: 5, rate: 10 },
  ],
  waterPokemon: [
    { pokemonId: 129, minLevel: 3, maxLevel: 5, rate: 45 },  // Magikarp
    { pokemonId: 60,  minLevel: 3, maxLevel: 5, rate: 35 },  // Poliwag
    { pokemonId: 118, minLevel: 4, maxLevel: 6, rate: 20 },  // Goldeen
  ],
  trainers: [
    {
      x: 7, y: 6,
      direction: 'down',
      name: 'Youngster Jake',
      party: [{ pokemonId: 19, level: 4 }, { pokemonId: 16, level: 4 }],
    },
  ],
  exits: [
    { x: 4,  y: 0, targetMap: 'pallet', targetX: 4,  targetY: 10 },
    { x: 5,  y: 0, targetMap: 'pallet', targetX: 5,  targetY: 10 },
    { x: 6,  y: 0, targetMap: 'pallet', targetX: 6,  targetY: 10 },
    { x: 7,  y: 0, targetMap: 'pallet', targetX: 7,  targetY: 10 },
    { x: 8,  y: 0, targetMap: 'pallet', targetX: 8,  targetY: 10 },
    { x: 9,  y: 0, targetMap: 'pallet', targetX: 9,  targetY: 10 },
    { x: 10, y: 0, targetMap: 'pallet', targetX: 10, targetY: 10 },
    { x: 4,  y: 19, targetMap: 'route1', targetX: 4,  targetY: 18 },
    { x: 5,  y: 19, targetMap: 'route1', targetX: 5,  targetY: 18 },
    { x: 6,  y: 19, targetMap: 'route1', targetX: 6,  targetY: 18 },
    { x: 7,  y: 19, targetMap: 'route1', targetX: 7,  targetY: 18 },
    { x: 8,  y: 19, targetMap: 'route1', targetX: 8,  targetY: 18 },
    { x: 9,  y: 19, targetMap: 'route1', targetX: 9,  targetY: 18 },
    { x: 10, y: 19, targetMap: 'route1', targetX: 10, targetY: 18 },
  ],
  doors: [],
}
