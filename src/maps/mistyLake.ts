import { MapData } from './types'

const T = 'tree'  as const
const G = 'grass' as const
const W = 'water' as const
const L = 'land'  as const

export const mistyLake: MapData = {
  id: 'mistyLake',
  name: 'Misty Lake',
  width: 18,
  height: 16,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,G,G,G,G,G,G,W,W,W,W,G,G,G,T,T,T],  // row  2
    [T,G,G,G,G,G,W,W,W,W,W,W,W,W,G,G,T,T],  // row  3
    [T,G,G,G,G,W,W,W,W,W,W,W,W,W,W,G,T,T],  // row  4
    [T,G,G,G,W,W,W,W,W,W,W,W,W,W,W,W,G,T],  // row  5
    [G,G,G,W,W,W,W,W,W,W,W,W,W,W,W,W,G,G],  // row  6: west exit x=0; east exit x=17
    [G,G,G,W,W,W,W,W,W,W,W,W,W,W,W,W,G,G],  // row  7: west exit x=0; east exit x=17
    [T,G,G,W,W,W,W,W,W,W,W,W,W,W,W,W,G,T],  // row  8: east wall (old east exit closed)
    [T,G,G,G,W,W,W,W,W,W,W,W,W,W,W,G,G,T],  // row  9
    [T,G,G,G,G,W,W,W,W,W,W,W,W,W,G,G,G,T],  // row 10
    [T,G,G,G,G,G,G,G,W,W,W,W,G,G,G,G,T,T],  // row 11
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 12
    [T,G,G,L,L,L,L,L,L,L,L,L,L,G,G,G,G,T],  // row 13: land path
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 14
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 15: south border (old flower exit closed)
  ],
  wildPokemon: [
    { pokemonId: 54,  minLevel: 8,  maxLevel: 13, rate: 35 },  // Psyduck
    { pokemonId: 60,  minLevel: 8,  maxLevel: 13, rate: 30 },  // Poliwag
    { pokemonId: 118, minLevel: 10, maxLevel: 15, rate: 20 },  // Goldeen
    { pokemonId: 131, minLevel: 12, maxLevel: 16, rate: 12 },  // Lapras
    { pokemonId: 149, minLevel: 20, maxLevel: 25, rate: 3  },  // Dragonite
  ],
  waterPokemon: [
    { pokemonId: 129, minLevel: 5,  maxLevel: 10, rate: 50 },  // Magikarp
    { pokemonId: 60,  minLevel: 8,  maxLevel: 13, rate: 30 },  // Poliwag
    { pokemonId: 130, minLevel: 15, maxLevel: 20, rate: 20 },  // Gyarados
  ],
  trainers: [],
  exits: [
    { x: 0,  y: 6, targetMap: 'rockyCave',    targetX: 14, targetY: 6 },
    { x: 0,  y: 7, targetMap: 'rockyCave',    targetX: 14, targetY: 7 },
    { x: 17, y: 6, targetMap: 'flowerMeadow', targetX: 0,  targetY: 6 },
    { x: 17, y: 7, targetMap: 'flowerMeadow', targetX: 0,  targetY: 7 },
  ],
  doors: [],
}
