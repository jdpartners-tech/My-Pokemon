import { MapData } from './types'

const K = 'building' as const  // blocked rock wall
const R = 'path'     as const  // walkable cave floor

export const rockyCave: MapData = {
  id: 'rockyCave',
  name: 'Rocky Cave',
  width: 16,
  height: 14,
  tiles: [
    [K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K],  // row  0
    [K,R,R,R,K,K,R,R,R,R,K,K,R,R,R,K],  // row  1
    [K,R,R,R,R,R,R,R,R,R,R,R,R,R,R,K],  // row  2
    [K,K,R,R,R,K,K,R,R,R,K,K,R,R,R,K],  // row  3
    [K,K,K,R,R,R,R,R,R,R,R,R,R,R,R,K],  // row  4
    [K,K,R,R,R,R,K,K,R,R,R,R,K,R,R,R],  // row  5: east exits
    [K,R,R,R,K,K,R,R,R,K,K,R,R,R,R,R],  // row  6: west wall
    [R,R,R,R,R,R,K,K,R,R,R,K,R,R,R,K],  // row  7: west+east exit
    [R,R,R,K,K,R,R,R,R,K,K,R,R,R,R,K],  // row  8: west+east exit
    [K,R,R,R,R,R,K,R,R,R,R,K,R,R,R,K],  // row  9: west+east wall
    [K,R,R,K,K,R,R,R,K,K,R,R,R,K,R,K],  // row 10: west wall
    [K,K,R,R,R,R,R,R,R,R,R,R,R,R,K,K],  // row 11
    [K,K,K,R,R,R,K,K,K,R,R,K,K,K,K,K],  // row 12
    [K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K],  // row 13
  ],
  wildPokemon: [
    { pokemonId: 74,  minLevel: 15, maxLevel: 20, rate: 35 },  // Geodude
    { pokemonId: 41,  minLevel: 12, maxLevel: 18, rate: 30 },  // Zubat
    { pokemonId: 95,  minLevel: 18, maxLevel: 25, rate: 20 },  // Onix
    { pokemonId: 75,  minLevel: 22, maxLevel: 28, rate: 12 },  // Graveler
    { pokemonId: 94,  minLevel: 25, maxLevel: 30, rate: 3  },  // Gengar
  ],
  waterPokemon: [],
  trainers: [],
  exits: [
    { x: 0,  y: 7, targetMap: 'mistyLake',   targetX: 16, targetY: 7 },
    { x: 0,  y: 8, targetMap: 'mistyLake',   targetX: 16, targetY: 8 },
    { x: 15, y: 5, targetMap: 'trainerRoad', targetX: 1,  targetY: 5 },
    { x: 15, y: 6, targetMap: 'trainerRoad', targetX: 1,  targetY: 6 },
  ],
  doors: [],
}
