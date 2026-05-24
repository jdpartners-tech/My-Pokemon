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
  exits: [
    { x: 5, y: 8, targetMap: 'pallet', targetX: 5, targetY: 8 },
  ],
  doors: [],
}
