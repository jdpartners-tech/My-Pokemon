import { MapData } from './types'

const T = 'tree'  as const
const G = 'grass' as const
const L = 'land'  as const

export const trainerRoad: MapData = {
  id: 'trainerRoad',
  name: 'Trainer Road',
  width: 18,
  height: 12,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  2
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  3
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  4
    [L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L],  // row  5: main road (west→east)
    [L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L],  // row  6: main road (west→east)
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  7
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  8
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  9
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 10
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 11
  ],
  wildPokemon: [
    { pokemonId: 58,  minLevel: 20, maxLevel: 25, rate: 30 },  // Growlithe
    { pokemonId: 37,  minLevel: 18, maxLevel: 23, rate: 30 },  // Vulpix
    { pokemonId: 66,  minLevel: 22, maxLevel: 27, rate: 25 },  // Machop
    { pokemonId: 56,  minLevel: 20, maxLevel: 25, rate: 15 },  // Mankey
  ],
  waterPokemon: [],
  trainers: [
    { x: 6, y: 3, direction: 'down', name: 'Biker Koji',
      party: [{ pokemonId: 58, level: 20 }, { pokemonId: 37, level: 20 }] },
    { x: 12, y: 8, direction: 'down', name: 'Lass Mika',
      party: [{ pokemonId: 35, level: 18 }, { pokemonId: 39, level: 19 }, { pokemonId: 52, level: 18 }] },
  ],
  exits: [
    { x: 0, y: 5, targetMap: 'rockyCave', targetX: 14, targetY: 5 },
    { x: 0, y: 6, targetMap: 'rockyCave', targetX: 14, targetY: 6 },
    { x: 17, y: 5, targetMap: 'cinnabarTown', targetX: 1, targetY: 5 },
    { x: 17, y: 6, targetMap: 'cinnabarTown', targetX: 1, targetY: 6 },
  ],
  doors: [],
}
