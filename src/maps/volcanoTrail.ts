import { MapData } from './types'

const K = 'building' as const  // blocked volcanic rock
const V = 'path'     as const  // walkable volcanic ground

export const volcanoTrail: MapData = {
  id: 'volcanoTrail',
  name: 'Volcano Trail',
  width: 16,
  height: 16,
  tiles: [
    [K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K],  // row  0
    [K,V,V,V,K,K,V,V,V,V,K,K,V,V,V,K],  // row  1
    [K,V,V,V,V,V,V,V,V,V,V,V,V,V,V,K],  // row  2
    [K,K,V,V,V,K,K,V,V,V,K,K,V,V,K,K],  // row  3
    [K,K,K,V,V,V,V,V,V,V,V,V,V,K,K,K],  // row  4
    [K,K,V,V,K,K,V,V,V,K,K,V,V,V,K,K],  // row  5
    [K,V,V,V,V,K,K,V,V,V,K,V,V,V,V,K],  // row  6
    [K,V,V,K,V,V,V,V,V,V,V,V,K,V,V,K],  // row  7
    [K,K,V,V,V,K,K,V,V,K,K,V,V,V,K,K],  // row  8
    [K,V,V,V,K,V,V,V,V,V,V,V,K,V,V,K],  // row  9
    [K,V,V,K,K,K,V,V,V,V,V,K,K,V,V,K],  // row 10
    [K,K,V,V,V,V,V,K,K,V,V,V,V,V,K,K],  // row 11
    [K,K,K,V,V,V,V,V,V,V,V,V,V,K,K,K],  // row 12
    [K,K,V,V,K,K,V,V,V,K,K,V,V,V,K,K],  // row 13
    [K,V,V,V,V,V,V,V,V,V,V,V,V,V,V,K],  // row 14: south entry from Cinnabar Town
    [K,K,K,K,K,K,V,V,K,K,K,K,K,K,K,K],  // row 15: south exit (→ Cinnabar Town) x=6-7
  ],
  wildPokemon: [
    { pokemonId: 77,  minLevel: 25, maxLevel: 30, rate: 30 },  // Ponyta
    { pokemonId: 126, minLevel: 28, maxLevel: 33, rate: 25 },  // Magmar
    { pokemonId: 38,  minLevel: 30, maxLevel: 35, rate: 20 },  // Ninetales
    { pokemonId: 59,  minLevel: 32, maxLevel: 38, rate: 15 },  // Arcanine
    { pokemonId: 6,   minLevel: 35, maxLevel: 40, rate: 7  },  // Charizard
    { pokemonId: 150, minLevel: 50, maxLevel: 55, rate: 3  },  // Mewtwo
  ],
  waterPokemon: [],
  trainers: [],
  exits: [
    { x: 6, y: 15, targetMap: 'cinnabarTown', targetX: 6, targetY: 1 },
    { x: 7, y: 15, targetMap: 'cinnabarTown', targetX: 7, targetY: 1 },
  ],
  doors: [],
}
