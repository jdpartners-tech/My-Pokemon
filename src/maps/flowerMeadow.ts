import { MapData } from './types'

const T = 'tree'    as const
const G = 'grass'   as const
const F = 'flower'  as const
const N = 'flower2' as const

export const flowerMeadow: MapData = {
  id: 'flowerMeadow',
  name: 'Flower Meadow',
  width: 15,
  height: 15,
  tiles: [
    [T,T,T,T,T,T,T,G,G,T,T,T,T,T,T],  // row  0: north exit (→ Viridian Forest) x=7-8
    [T,G,G,G,G,G,G,G,G,G,G,G,G,T,T],  // row  1
    [T,G,G,G,F,F,G,G,G,F,F,G,G,T,T],  // row  2: heart — two top bumps
    [T,G,G,F,F,F,F,G,F,F,F,F,G,T,T],  // row  3: bumps widen
    [T,G,G,F,F,F,F,F,F,F,F,F,G,T,T],  // row  4: full heart body
    [T,G,G,F,F,F,F,F,F,F,F,F,G,T,T],  // row  5: full heart body
    [G,G,G,G,F,F,F,F,F,F,F,G,G,T,T],  // row  6: heart narrows (west exit x=0)
    [G,G,G,G,G,F,F,F,F,F,G,G,G,T,T],  // row  7: heart narrows (west exit x=0)
    [T,G,G,G,G,G,F,F,F,G,G,G,G,T,T],  // row  8: nearly point
    [T,G,G,G,G,G,G,F,G,G,G,G,G,T,T],  // row  9: heart tip
    [T,F,G,G,G,G,G,G,G,G,G,G,F,T,T],  // row 10: corner flowers
    [T,T,F,G,G,N,G,G,N,G,G,F,T,T,T],  // row 11: corner flowers
    [T,T,T,T,G,G,G,G,G,G,G,T,T,T,T],  // row 12
    [T,T,T,T,T,T,G,G,G,T,T,T,T,T,T],  // row 13
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 14
  ],
  wildPokemon: [
    { pokemonId: 43,  minLevel: 5,  maxLevel: 10, rate: 16 },  // Oddish
    { pokemonId: 35,  minLevel: 5,  maxLevel: 10, rate: 14 },  // Clefairy
    { pokemonId: 69,  minLevel: 5,  maxLevel: 10, rate: 13 },  // Bellsprout
    { pokemonId: 102, minLevel: 6,  maxLevel: 10, rate: 9  },  // Exeggcute
    { pokemonId: 30,  minLevel: 7,  maxLevel: 11, rate: 7  },  // Nidorina
    { pokemonId: 33,  minLevel: 7,  maxLevel: 11, rate: 7  },  // Nidorino
    { pokemonId: 12,  minLevel: 8,  maxLevel: 12, rate: 6  },  // Butterfree
    { pokemonId: 44,  minLevel: 8,  maxLevel: 12, rate: 5  },  // Gloom
    { pokemonId: 70,  minLevel: 8,  maxLevel: 12, rate: 5  },  // Weepinbell
    { pokemonId: 63,  minLevel: 6,  maxLevel: 11, rate: 4  },  // Abra
    { pokemonId: 49,  minLevel: 8,  maxLevel: 12, rate: 3  },  // Venomoth
    { pokemonId: 133, minLevel: 8,  maxLevel: 12, rate: 3  },  // Eevee ⭐
    { pokemonId: 132, minLevel: 10, maxLevel: 14, rate: 3  },  // Ditto ⭐
    { pokemonId: 113, minLevel: 10, maxLevel: 14, rate: 2  },  // Chansey ⭐
    { pokemonId: 122, minLevel: 10, maxLevel: 14, rate: 2  },  // Mr. Mime
    { pokemonId: 108, minLevel: 9,  maxLevel: 13, rate: 2  },  // Lickitung
    { pokemonId: 124, minLevel: 10, maxLevel: 14, rate: 2  },  // Jynx ⭐
    { pokemonId: 45,  minLevel: 12, maxLevel: 16, rate: 2  },  // Vileplume
    { pokemonId: 71,  minLevel: 12, maxLevel: 16, rate: 2  },  // Victreebel
    { pokemonId: 103, minLevel: 12, maxLevel: 16, rate: 1  },  // Exeggutor
    { pokemonId: 36,  minLevel: 12, maxLevel: 16, rate: 1  },  // Clefable
    { pokemonId: 31,  minLevel: 14, maxLevel: 18, rate: 1  },  // Nidoqueen ⭐
    { pokemonId: 34,  minLevel: 14, maxLevel: 18, rate: 1  },  // Nidoking ⭐
    { pokemonId: 151, minLevel: 30, maxLevel: 35, rate: 1  },  // Mew ⭐
  ],
  trainers: [],
  wanderingNpcs: [
    { id: 'shroomish_fm', name: 'Shroomish', spriteDir: 'sprites/pokemon-npc/shroomish',
      homeX: 4, homeY: 8, wanderRadius: 3, pokemonId: 285, minLevel: 6, maxLevel: 12 },
  ],
  exits: [
    { x: 0, y: 6, targetMap: 'mistyLake',      targetX: 17, targetY: 6 },
    { x: 0, y: 7, targetMap: 'mistyLake',      targetX: 17, targetY: 7 },
    { x: 7, y: 0, targetMap: 'viridianForest', targetX: 7,  targetY: 15 },
    { x: 8, y: 0, targetMap: 'viridianForest', targetX: 8,  targetY: 15 },
  ],
  doors: [],
}
