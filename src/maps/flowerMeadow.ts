import { MapData } from './types'

const T = 'tree'    as const
const G = 'grass'   as const
const F = 'flower'  as const
const N = 'flower2' as const

export const flowerMeadow: MapData = {
  id: 'flowerMeadow',
  name: 'Flower Meadow',
  width: 15,
  height: 15,
  tiles: [
    [T,T,T,T,T,T,T,G,G,T,T,T,T,T,T],  // row  0: north exit (→ Misty Lake) x=7-8
    [T,G,G,F,G,G,G,G,G,F,G,G,G,T,T],  // row  1
    [T,G,F,G,G,F,G,G,G,F,G,F,G,T,T],  // row  2
    [T,F,G,G,F,G,G,F,G,G,F,G,G,F,T],  // row  3
    [T,G,G,F,G,G,G,G,G,G,F,G,G,T,T],  // row  4
    [T,G,F,G,G,G,F,G,F,G,G,G,G,T,T],  // row  5: west wall
    [T,G,G,G,F,G,G,G,G,G,F,G,G,T,T],  // row  6: west wall
    [G,F,G,G,G,G,G,G,G,G,G,F,G,T,T],  // row  7: west exit
    [G,G,G,F,G,G,F,G,G,F,G,G,G,T,T],  // row  8: west exit
    [T,G,F,G,G,F,G,G,G,G,G,F,F,T,T],  // row  9: west wall
    [T,G,G,G,F,G,G,F,G,G,F,G,G,T,T],  // row 10: west wall
    [T,T,G,G,G,F,G,G,N,F,G,G,T,T,T],  // row 11
    [T,T,T,T,G,G,G,G,G,G,G,T,T,T,T],  // row 12
    [T,T,T,T,T,T,G,G,G,T,T,T,T,T,T],  // row 13: north exits visible opening
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 14
  ],
  wildPokemon: [
    { pokemonId: 43,  minLevel: 5,  maxLevel: 10, rate: 30 },  // Oddish
    { pokemonId: 35,  minLevel: 5,  maxLevel: 10, rate: 25 },  // Clefairy
    { pokemonId: 69,  minLevel: 6,  maxLevel: 11, rate: 20 },  // Bellsprout
    { pokemonId: 12,  minLevel: 8,  maxLevel: 12, rate: 10 },  // Butterfree
    { pokemonId: 133, minLevel: 8,  maxLevel: 12, rate: 12 },  // Eevee
    { pokemonId: 132, minLevel: 10, maxLevel: 14, rate: 3  },  // Ditto
  ],
  trainers: [],
  exits: [
    { x: 0, y: 7, targetMap: 'viridianForest', targetX: 14, targetY: 7 },
    { x: 0, y: 8, targetMap: 'viridianForest', targetX: 14, targetY: 8 },
    { x: 7, y: 0, targetMap: 'mistyLake',      targetX: 7,  targetY: 14 },
    { x: 8, y: 0, targetMap: 'mistyLake',      targetX: 8,  targetY: 14 },
  ],
  doors: [],
}
