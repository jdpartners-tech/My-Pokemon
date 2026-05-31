import { MapData } from './types'

const T  = 'tree'    as const
const G  = 'grass'   as const
const F  = 'flower'  as const
const B2 = 'brush2'  as const  // middle forest floor
const V  = 'flower3' as const  // outer forest edge

export const viridianForest: MapData = {
  id: 'viridianForest',
  name: 'Viridian Forest',
  width: 16,
  height: 16,
  tiles: [
    [T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T],  // row  0: north border
    [T, V, V, V, V, V, V, V, V, V, V, T, T, V, T, T],  // row  1: outer edge → flower3
    [T, V, V, T, V, V, T, V, V, V, T, T, V, V, T, T],  // row  2: outer edge → flower3
    [T, V, T, T, V, V, T, T, T, T, V, T, T, V, T, T],  // row  3: outer edge → flower3
    [T, B2,B2,B2,B2,B2,B2,B2,B2,T, T, B2,B2,B2,T, T],  // row  4: forest floor → brush2
    [T, T, B2,B2,F, B2,B2,B2,B2,B2,B2,F, B2,B2,B2,T],  // row  5: brush2 + kept flowers
    [G, G, B2,B2,B2,B2,T, T, T, B2,B2,B2,B2,B2,B2,T],  // row  6: west exit x=0-1 keep G
    [G, G, B2,B2,B2,T, T, T, B2,B2,T, B2,B2,B2,B2,T],  // row  7: west exit x=0-1 keep G
    [T, B2,B2,T, T, B2,B2,B2,B2,T, T, B2,B2,B2,B2,T],  // row  8
    [T, B2,T, T, T, B2,B2,F, B2,B2,B2,T, T, B2,B2,T],  // row  9: kept flower
    [T, B2,B2,B2,T, T, T, B2,B2,B2,T, B2,B2,B2,B2,T],  // row 10
    [T, T, T, B2,B2,T, T, B2,B2,B2,T, T, B2,T, T, T],  // row 11
    [T, T, T, B2,B2,B2,B2,B2,B2,F, B2,B2,B2,T, T, T],  // row 12: kept flower
    [T, B2,B2,T, T, B2,B2,B2,B2,B2,B2,B2,B2,B2,T, T],  // row 13
    [T, V, V, V, V, V, V, V, V, V, V, V, V, V, T, T],  // row 14: outer edge → flower3
    [T, T, T, T, T, T, T, G, G, T, T, T, T, T, T, T],  // row 15: south exit x=7-8 keep G
  ],
  wildPokemon: [
    { pokemonId: 10,  minLevel: 3,  maxLevel: 7,  rate: 18 },  // Caterpie
    { pokemonId: 13,  minLevel: 3,  maxLevel: 7,  rate: 18 },  // Weedle
    { pokemonId: 43,  minLevel: 4,  maxLevel: 8,  rate: 11 },  // Oddish
    { pokemonId: 46,  minLevel: 4,  maxLevel: 8,  rate: 10 },  // Paras
    { pokemonId: 48,  minLevel: 4,  maxLevel: 8,  rate: 9  },  // Venonat
    { pokemonId: 11,  minLevel: 6,  maxLevel: 9,  rate: 7  },  // Metapod
    { pokemonId: 14,  minLevel: 6,  maxLevel: 9,  rate: 7  },  // Kakuna
    { pokemonId: 25,  minLevel: 4,  maxLevel: 9,  rate: 5  },  // Pikachu ⭐
    { pokemonId: 1,   minLevel: 5,  maxLevel: 10, rate: 4  },  // Bulbasaur ⭐
    { pokemonId: 114, minLevel: 6,  maxLevel: 10, rate: 4  },  // Tangela
    { pokemonId: 15,  minLevel: 8,  maxLevel: 12, rate: 3  },  // Beedrill
    { pokemonId: 123, minLevel: 8,  maxLevel: 12, rate: 2  },  // Scyther ⭐
    { pokemonId: 127, minLevel: 8,  maxLevel: 12, rate: 2  },  // Pinsir ⭐
    { pokemonId: 47,  minLevel: 9,  maxLevel: 13, rate: 2  },  // Parasect
    { pokemonId: 2,   minLevel: 10, maxLevel: 14, rate: 2  },  // Ivysaur
    { pokemonId: 26,  minLevel: 10, maxLevel: 14, rate: 1  },  // Raichu ⭐
    { pokemonId: 3,   minLevel: 15, maxLevel: 18, rate: 1  },  // Venusaur ⭐
  ],
  trainers: [],
  exits: [
    { x: 0, y: 6, targetMap: 'sunlitMeadow', targetX: 14, targetY: 6 },
    { x: 0, y: 7, targetMap: 'sunlitMeadow', targetX: 14, targetY: 7 },
    { x: 7, y: 15, targetMap: 'flowerMeadow', targetX: 7,  targetY: 0 },
    { x: 8, y: 15, targetMap: 'flowerMeadow', targetX: 8,  targetY: 0 },
  ],
  doors: [],
}
