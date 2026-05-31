import { MapData } from './types'

const T = 'tree'   as const
const G = 'grass'  as const
const L = 'land'   as const
const F = 'flower' as const

export const sunlitMeadow: MapData = {
  id: 'sunlitMeadow',
  name: 'Sunlit Meadow',
  width: 15,
  height: 14,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0: north border (old pallet exit closed)
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,G,G,G,F,G,G,G,G,G,G,G,G,T],  // row  2
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  3
    [T,G,F,G,G,G,G,G,G,G,G,G,F,G,T],  // row  4
    [T,G,G,G,G,L,G,G,G,G,G,G,G,G,T],  // row  5
    [G,G,G,G,G,L,G,G,G,G,G,G,G,G,G],  // row  6: west exit x=0; east exit x=14
    [G,G,G,F,G,L,G,G,G,F,G,G,G,G,G],  // row  7: west exit x=0; east exit x=14
    [T,G,G,G,G,L,G,G,G,G,G,G,G,G,T],  // row  8
    [T,G,G,G,G,L,G,G,G,G,G,G,G,G,T],  // row  9
    [T,G,F,G,G,G,G,G,G,G,G,G,G,G,T],  // row 10
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 11
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 12
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 13: south border (old viridian exit closed)
  ],
  wildPokemon: [
    { pokemonId: 19,  minLevel: 2,  maxLevel: 6,  rate: 22 },  // Rattata
    { pokemonId: 16,  minLevel: 3,  maxLevel: 7,  rate: 20 },  // Pidgey
    { pokemonId: 21,  minLevel: 3,  maxLevel: 7,  rate: 13 },  // Spearow
    { pokemonId: 29,  minLevel: 3,  maxLevel: 7,  rate: 8  },  // Nidoran♀
    { pokemonId: 32,  minLevel: 3,  maxLevel: 7,  rate: 8  },  // Nidoran♂
    { pokemonId: 39,  minLevel: 4,  maxLevel: 8,  rate: 7  },  // Jigglypuff
    { pokemonId: 52,  minLevel: 4,  maxLevel: 8,  rate: 5  },  // Meowth
    { pokemonId: 84,  minLevel: 5,  maxLevel: 9,  rate: 5  },  // Doduo
    { pokemonId: 17,  minLevel: 7,  maxLevel: 12, rate: 4  },  // Pidgeotto
    { pokemonId: 20,  minLevel: 7,  maxLevel: 12, rate: 3  },  // Raticate
    { pokemonId: 22,  minLevel: 8,  maxLevel: 13, rate: 3  },  // Fearow
    { pokemonId: 83,  minLevel: 6,  maxLevel: 10, rate: 3  },  // Farfetch'd ⭐
    { pokemonId: 40,  minLevel: 10, maxLevel: 14, rate: 2  },  // Wigglytuff
    { pokemonId: 128, minLevel: 10, maxLevel: 14, rate: 2  },  // Tauros ⭐
    { pokemonId: 115, minLevel: 10, maxLevel: 15, rate: 2  },  // Kangaskhan ⭐
    { pokemonId: 18,  minLevel: 13, maxLevel: 17, rate: 1  },  // Pidgeot
    { pokemonId: 143, minLevel: 12, maxLevel: 15, rate: 1  },  // Snorlax ⭐
  ],
  trainers: [],
  exits: [
    { x: 0,  y: 6, targetMap: 'pallet',         targetX: 14, targetY: 6 },
    { x: 0,  y: 7, targetMap: 'pallet',         targetX: 14, targetY: 7 },
    { x: 14, y: 6, targetMap: 'viridianForest', targetX: 0,  targetY: 6 },
    { x: 14, y: 7, targetMap: 'viridianForest', targetX: 0,  targetY: 7 },
  ],
  doors: [],
}
