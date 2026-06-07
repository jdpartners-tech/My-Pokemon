import { MapData } from './types'

const T  = 'tree'    as const
const G  = 'grass'   as const
const F  = 'flower'  as const
const B2 = 'brush2'  as const  // middle forest floor

export const viridianForest: MapData = {
  id: 'viridianForest',
  name: 'Viridian Forest',
  width: 16,
  height: 16,
  tiles: [
    [T, T, T, T, T, T, T, T, T, T, T, T, T, T, T, T],  // row  0: north border
    [T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T],  // row  1
    [T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T],  // row  2
    [T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T],  // row  3
    [T, G, G, G, G, G, G, B2,G, G, G, G, G, G, G, T],  // row  4: single bush
    [T, G, G, G, F, G, G, G, G, G, G, F, G, G, G, T],  // row  5: 2 flowers
    [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T],  // row  6: west exit
    [G, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T],  // row  7: west exit
    [T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T],  // row  8
    [T, G, G, G, G, G, G, F, G, G, G, G, G, G, G, T],  // row  9: single flower
    [T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T],  // row 10: open
    [T, G, G, G, G, G, B2,G, G, G, G, G, G, G, G, T],  // row 11: single bush
    [T, G, G, G, G, F, G, G, G, F, G, G, G, G, G, T],  // row 12: 2 flowers
    [T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T],  // row 13: open
    [T, G, G, G, G, G, G, G, G, G, G, G, G, G, G, T],  // row 14
    [T, T, T, T, T, T, T, G, G, T, T, T, T, T, T, T],  // row 15: south exit x=7-8
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
    { pokemonId: 167, minLevel: 4,  maxLevel: 8,  rate: 10 },  // Spinarak
    { pokemonId: 214, minLevel: 10, maxLevel: 15, rate: 2  },  // Heracross ⭐
    { pokemonId: 3,   minLevel: 15, maxLevel: 18, rate: 1  },  // Venusaur ⭐
  ],
  trainers: [],
  wanderingNpcs: [
    { id: 'bulbasaur_vf_1', name: 'Bulbasaur', spriteDir: 'sprites/pokemon-npc/bulbasaur', homeX: 5,  homeY: 8,  wanderRadius: 3, pokemonId: 1,   minLevel: 3,  maxLevel: 10 },
    { id: 'bulbasaur_vf_2', name: 'Bulbasaur', spriteDir: 'sprites/pokemon-npc/bulbasaur', homeX: 11, homeY: 10, wanderRadius: 3, pokemonId: 1,   minLevel: 3,  maxLevel: 10 },
    { id: 'wingull_vf_1',   name: 'Wingull',   spriteDir: 'sprites/pokemon-npc/wingull',   homeX: 7,  homeY: 5,  wanderRadius: 4, pokemonId: 16,  minLevel: 3,  maxLevel: 10 },
    {
      id: 'dark_trainer_vf', name: 'Dark Trainer', spriteDir: 'sprites/npc/dark-trainer',
      homeX: 9, homeY: 9, wanderRadius: 3, isTrainer: true,
      party: [
        { pokemonId: 93,  level: 18 },  // Haunter
        { pokemonId: 109, level: 20 },  // Koffing
        { pokemonId: 94,  level: 22 },  // Gengar
      ],
    },
  ],
  exits: [
    { x: 0, y: 6, targetMap: 'sunlitMeadow', targetX: 14, targetY: 6 },
    { x: 0, y: 7, targetMap: 'sunlitMeadow', targetX: 14, targetY: 7 },
    { x: 7, y: 15, targetMap: 'flowerMeadow', targetX: 7,  targetY: 0 },
    { x: 8, y: 15, targetMap: 'flowerMeadow', targetX: 8,  targetY: 0 },
  ],
  doors: [],
}
