import { MapData } from './types'

const T = 'tree'   as const
const G = 'grass'  as const
const L = 'land'   as const
const F = 'flower' as const

export const sunlitMeadow: MapData = {
  id: 'sunlitMeadow',
  name: 'Sunlit Meadow',
  width: 15,
  height: 14,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0: north border (old pallet exit closed)
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,G,G,G,F,G,G,G,G,G,G,G,G,T],  // row  2
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  3
    [T,G,F,G,G,G,G,G,G,G,G,G,F,G,T],  // row  4
    [T,G,G,G,G,L,G,G,G,G,G,G,G,G,T],  // row  5
    [G,G,G,G,G,L,G,G,G,G,G,G,G,G,G],  // row  6: west exit x=0; east exit x=14
    [G,G,G,F,G,L,G,G,G,F,G,G,G,G,G],  // row  7: west exit x=0; east exit x=14
    [T,G,G,G,G,L,G,G,G,G,G,G,G,G,T],  // row  8
    [T,G,G,G,G,L,G,G,G,G,G,G,G,G,T],  // row  9
    [T,G,F,G,G,G,G,G,G,G,G,G,G,G,T],  // row 10
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 11
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 12
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 13: south border (old viridian exit closed)
  ],
  wildPokemon: [
    { pokemonId: 16,  minLevel: 3,  maxLevel: 6,  rate: 40 },  // Pidgey
    { pokemonId: 19,  minLevel: 2,  maxLevel: 5,  rate: 30 },  // Rattata
    { pokemonId: 39,  minLevel: 4,  maxLevel: 7,  rate: 15 },  // Jigglypuff
    { pokemonId: 52,  minLevel: 4,  maxLevel: 8,  rate: 12 },  // Meowth
    { pokemonId: 143, minLevel: 12, maxLevel: 15, rate: 3  },  // Snorlax
  ],
  trainers: [],
  exits: [
    { x: 0,  y: 6, targetMap: 'pallet',         targetX: 13, targetY: 6 },
    { x: 0,  y: 7, targetMap: 'pallet',         targetX: 13, targetY: 7 },
    { x: 14, y: 6, targetMap: 'viridianForest', targetX: 0,  targetY: 6 },
    { x: 14, y: 7, targetMap: 'viridianForest', targetX: 0,  targetY: 7 },
  ],
  doors: [],
}
