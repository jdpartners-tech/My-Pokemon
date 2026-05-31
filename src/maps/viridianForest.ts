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
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0: north border (old sunlit exit closed)
    [T,G,G,G,G,G,G,G,G,G,G,T,T,G,T,T],  // row  1
    [T,G,G,T,G,G,T,G,G,G,T,T,G,G,T,T],  // row  2
    [T,G,T,T,G,G,T,T,T,T,G,T,T,G,T,T],  // row  3
    [T,G,G,G,G,G,G,G,G,T,T,G,G,G,T,T],  // row  4
    [T,T,G,G,F,G,G,G,G,G,G,F,G,G,G,T],  // row  5: east wall
    [G,G,G,G,G,G,T,T,T,G,G,G,G,G,G,T],  // row  6: west exit x=0; cleared x=1-5 entrance corridor
    [G,G,G,G,G,T,T,T,G,G,T,G,G,G,G,T],  // row  7: west exit x=0; east wall (old east exit closed)
    [T,G,G,T,T,G,G,G,G,T,T,G,G,G,G,T],  // row  8: east wall (old east exit closed)
    [T,G,T,T,T,G,G,F,G,G,G,T,T,G,G,T],  // row  9: east wall
    [T,G,G,G,T,T,T,G,G,G,T,G,G,G,G,T],  // row 10
    [T,T,T,G,G,T,T,G,G,G,T,T,G,T,T,T],  // row 11
    [T,T,T,G,G,G,G,G,G,F,G,G,G,T,T,T],  // row 12
    [T,G,G,T,T,G,G,G,G,G,G,G,G,G,T,T],  // row 13
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T,T],  // row 14
    [T,T,T,T,T,T,T,G,G,T,T,T,T,T,T,T],  // row 15: south exit (→ Flower Meadow) x=7-8
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
