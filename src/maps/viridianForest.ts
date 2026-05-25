import { MapData } from './types'

const T = 'tree'   as const
const G = 'grass'  as const
const F = 'flower' as const

export const viridianForest: MapData = {
  id: 'viridianForest',
  name: 'Viridian Forest',
  width: 16,
  height: 16,
  tiles: [
    [T,T,T,T,T,T,T,G,G,T,T,T,T,T,T,T],  // row  0: north exit (→ Sunlit Meadow) x=7-8
    [T,G,G,G,G,G,G,G,G,G,G,T,T,G,T,T],  // row  1: path cleared for north exits
    [T,G,G,T,G,G,T,G,G,G,T,T,G,G,T,T],  // row  2
    [T,G,T,T,G,G,T,T,T,T,G,T,T,G,T,T],  // row  3
    [T,G,G,G,G,G,G,G,G,T,T,G,G,G,T,T],  // row  4
    [T,T,G,G,F,G,G,G,G,G,G,F,G,G,G,T],  // row  5: east wall
    [T,T,T,G,G,G,T,T,T,G,G,G,G,G,G,T],  // row  6: east wall
    [T,G,G,G,G,T,T,T,G,G,T,G,G,G,G,G],  // row  7: east exit
    [T,G,G,T,T,G,G,G,G,T,T,G,G,G,G,G],  // row  8: east exit
    [T,G,T,T,T,G,G,F,G,G,G,T,T,G,G,T],  // row  9: east wall
    [T,G,G,G,T,T,T,G,G,G,T,G,G,G,G,T],  // row 10: east wall
    [T,T,T,G,G,T,T,G,G,G,T,T,G,T,T,T],  // row 11
    [T,T,T,G,G,G,G,G,G,F,G,G,G,T,T,T],  // row 12
    [T,G,G,T,T,G,G,G,G,G,G,G,G,G,T,T],  // row 13
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T,T],  // row 14: south entry from Sunlit Meadow
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 15: south border
  ],
  wildPokemon: [
    { pokemonId: 10,  minLevel: 3,  maxLevel: 7,  rate: 25 },  // Caterpie
    { pokemonId: 13,  minLevel: 3,  maxLevel: 7,  rate: 25 },  // Weedle
    { pokemonId: 43,  minLevel: 4,  maxLevel: 8,  rate: 20 },  // Oddish
    { pokemonId: 1,   minLevel: 5,  maxLevel: 9,  rate: 15 },  // Bulbasaur
    { pokemonId: 25,  minLevel: 4,  maxLevel: 8,  rate: 12 },  // Pikachu
    { pokemonId: 11,  minLevel: 7,  maxLevel: 10, rate: 3  },  // Metapod
  ],
  trainers: [],
  exits: [
    { x: 7,  y: 0, targetMap: 'sunlitMeadow', targetX: 7, targetY: 12 },
    { x: 8,  y: 0, targetMap: 'sunlitMeadow', targetX: 8, targetY: 12 },
    { x: 15, y: 7, targetMap: 'flowerMeadow', targetX: 1, targetY: 7  },
    { x: 15, y: 8, targetMap: 'flowerMeadow', targetX: 1, targetY: 8  },
  ],
  doors: [],
}
