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
    [K,K,R,R,R,R,K,K,R,R,R,R,K,R,R,K],  // row  5: east wall (old east exit closed)
    [K,R,R,R,K,K,R,R,R,K,K,R,R,R,R,R],  // row  6: east exit x=15
    [K,R,R,R,R,R,K,K,R,R,R,K,R,R,R,R],  // row  7: east exit x=15 (old west exit closed)
    [K,R,R,K,K,R,R,R,R,K,K,R,R,R,R,K],  // row  8: (old west exit closed)
    [K,R,R,R,R,R,K,R,R,R,R,K,R,R,R,K],  // row  9
    [K,R,R,K,K,R,R,R,K,K,R,R,R,K,R,K],  // row 10
    [K,K,R,R,R,R,R,R,R,R,R,R,R,R,K,K],  // row 11
    [K,K,K,R,R,R,K,K,K,R,R,K,K,K,K,K],  // row 12
    [K,K,K,K,K,K,K,R,R,K,K,K,K,K,K,K],  // row 13: south exit x=7-8
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
    { x: 15, y: 6, targetMap: 'mistyLake',   targetX: 0, targetY: 6 },
    { x: 15, y: 7, targetMap: 'mistyLake',   targetX: 0, targetY: 7 },
    { x: 7,  y: 13, targetMap: 'trainerRoad', targetX: 7,  targetY: 0 },
    { x: 8,  y: 13, targetMap: 'trainerRoad', targetX: 8,  targetY: 0 },
  ],
  doors: [],
}
