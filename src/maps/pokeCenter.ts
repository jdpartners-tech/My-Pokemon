import { MapData } from './types'

const T = 'tree'     as const  // wall
const P = 'path'     as const  // floor
const B = 'building' as const  // counter / bench (impassable)
const D = 'door'     as const  // exit

export const pokeCenter: MapData = {
  id: 'pokecenter',
  name: 'Pokemon Center',
  width: 11,
  height: 9,
  isInterior: true,
  tiles: [
    [T, T, T, T, T, T, T, T, T, T, T],
    [T, P, P, P, P, P, P, P, P, P, T],
    [T, P, P, B, B, B, B, B, P, P, T],
    [T, P, P, P, P, P, P, P, P, P, T],
    [T, B, P, P, P, P, P, P, P, B, T],
    [T, P, P, P, P, P, P, P, P, P, T],
    [T, P, P, P, P, P, P, P, P, P, T],
    [T, P, P, P, P, P, P, P, P, P, T],
    [T, T, T, T, T, D, T, T, T, T, T],
  ],
  wildPokemon: [],
  trainers: [],
  wanderingNpcs: [
    { id: 'clefairy_pc_1',   name: 'Clefairy',   spriteDir: 'sprites/pokemon-npc/clefairy',   homeX: 3, homeY: 5, wanderRadius: 2 },
    { id: 'clefairy_pc_2',   name: 'Clefairy',   spriteDir: 'sprites/pokemon-npc/clefairy',   homeX: 7, homeY: 6, wanderRadius: 2 },
    { id: 'jigglypuff_pc_1', name: 'Jigglypuff', spriteDir: 'sprites/pokemon-npc/jigglypuff', homeX: 5, homeY: 3, wanderRadius: 1 },
    { id: 'jigglypuff_pc_2', name: 'Jigglypuff', spriteDir: 'sprites/pokemon-npc/jigglypuff', homeX: 5, homeY: 6, wanderRadius: 2 },
  ],
  exits: [
    { x: 5, y: 8, targetMap: 'pallet', targetX: 4, targetY: 7 },
  ],
  doors: [],
}
