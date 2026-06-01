import { MapData } from './types'

const T = 'tree'     as const  // wall
const P = 'path'     as const  // floor
const B = 'building' as const  // counter / bench (impassable)
const D = 'door'     as const  // exit

export const cinnabarPokeCenter: MapData = {
  id: 'cinnabarPokecenter',
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
    { id: 'clefairy_cpc_1',   name: 'Clefairy',   spriteDir: 'sprites/pokemon-npc/clefairy',   homeX: 3, homeY: 6, wanderRadius: 2 },
    { id: 'jigglypuff_cpc_1', name: 'Jigglypuff', spriteDir: 'sprites/pokemon-npc/jigglypuff', homeX: 7, homeY: 5, wanderRadius: 2 },
    { id: 'jigglypuff_cpc_2', name: 'Jigglypuff', spriteDir: 'sprites/pokemon-npc/jigglypuff', homeX: 5, homeY: 3, wanderRadius: 1 },
  ],
  exits: [
    { x: 5, y: 8, targetMap: 'cinnabarTown', targetX: 7, targetY: 8 },
  ],
  doors: [],
}
