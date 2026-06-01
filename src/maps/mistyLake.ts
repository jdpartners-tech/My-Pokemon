import { MapData } from './types'

const T = 'tree'  as const
const G = 'grass' as const
const W = 'water' as const
const L = 'land'  as const

export const mistyLake: MapData = {
  id: 'mistyLake',
  name: 'Misty Lake',
  width: 18,
  height: 16,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,G,G,G,G,G,G,W,W,W,W,G,G,G,T,T,T],  // row  2
    [T,G,G,G,G,G,W,W,W,W,W,W,W,W,G,G,T,T],  // row  3
    [T,G,G,G,G,W,W,W,W,W,W,W,W,W,W,G,T,T],  // row  4
    [T,G,G,G,W,W,W,W,W,W,W,W,W,W,W,W,G,T],  // row  5
    [G,G,G,W,W,W,W,W,W,W,W,W,W,W,W,W,G,G],  // row  6: west exit x=0; east exit x=17
    [G,G,G,W,W,W,W,W,W,W,W,W,W,W,W,W,G,G],  // row  7: west exit x=0; east exit x=17
    [T,G,G,W,W,W,W,W,W,W,W,W,W,W,W,W,G,T],  // row  8: east wall (old east exit closed)
    [T,G,G,G,W,W,W,W,W,W,W,W,W,W,W,G,G,T],  // row  9
    [T,G,G,G,G,W,W,W,W,W,W,W,W,W,G,G,G,T],  // row 10
    [T,G,G,G,G,G,G,G,W,W,W,W,G,G,G,G,T,T],  // row 11
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 12
    [T,G,G,L,L,L,L,L,L,L,L,L,L,G,G,G,G,T],  // row 13: land path
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 14
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 15: south border (old flower exit closed)
  ],
  wildPokemon: [
    { pokemonId: 54,  minLevel: 8,  maxLevel: 13, rate: 18 },  // Psyduck
    { pokemonId: 60,  minLevel: 8,  maxLevel: 13, rate: 16 },  // Poliwag
    { pokemonId: 79,  minLevel: 8,  maxLevel: 13, rate: 14 },  // Slowpoke
    { pokemonId: 118, minLevel: 10, maxLevel: 15, rate: 11 },  // Goldeen
    { pokemonId: 147, minLevel: 10, maxLevel: 15, rate: 8  },  // Dratini ⭐
    { pokemonId: 7,   minLevel: 10, maxLevel: 15, rate: 7  },  // Squirtle ⭐
    { pokemonId: 55,  minLevel: 12, maxLevel: 17, rate: 6  },  // Golduck
    { pokemonId: 61,  minLevel: 12, maxLevel: 17, rate: 5  },  // Poliwhirl
    { pokemonId: 80,  minLevel: 15, maxLevel: 20, rate: 4  },  // Slowbro
    { pokemonId: 119, minLevel: 15, maxLevel: 20, rate: 4  },  // Seaking
    { pokemonId: 148, minLevel: 15, maxLevel: 20, rate: 3  },  // Dragonair ⭐
    { pokemonId: 8,   minLevel: 15, maxLevel: 20, rate: 3  },  // Wartortle ⭐
    { pokemonId: 131, minLevel: 15, maxLevel: 20, rate: 3  },  // Lapras ⭐
    { pokemonId: 62,  minLevel: 20, maxLevel: 25, rate: 2  },  // Poliwrath
    { pokemonId: 149, minLevel: 22, maxLevel: 28, rate: 2  },  // Dragonite ⭐
    { pokemonId: 144, minLevel: 45, maxLevel: 50, rate: 1  },  // Articuno ⭐
  ],
  waterPokemon: [
    { pokemonId: 129, minLevel: 5,  maxLevel: 10, rate: 22 },  // Magikarp
    { pokemonId: 72,  minLevel: 8,  maxLevel: 13, rate: 16 },  // Tentacool
    { pokemonId: 90,  minLevel: 8,  maxLevel: 13, rate: 13 },  // Shellder
    { pokemonId: 98,  minLevel: 8,  maxLevel: 13, rate: 11 },  // Krabby
    { pokemonId: 116, minLevel: 8,  maxLevel: 13, rate: 9  },  // Horsea
    { pokemonId: 86,  minLevel: 10, maxLevel: 15, rate: 7  },  // Seel
    { pokemonId: 120, minLevel: 10, maxLevel: 15, rate: 5  },  // Staryu
    { pokemonId: 99,  minLevel: 12, maxLevel: 17, rate: 4  },  // Kingler
    { pokemonId: 73,  minLevel: 12, maxLevel: 18, rate: 4  },  // Tentacruel
    { pokemonId: 117, minLevel: 12, maxLevel: 18, rate: 3  },  // Seadra
    { pokemonId: 60,  minLevel: 8,  maxLevel: 13, rate: 3  },  // Poliwag
    { pokemonId: 121, minLevel: 15, maxLevel: 20, rate: 2  },  // Starmie ⭐
    { pokemonId: 87,  minLevel: 18, maxLevel: 23, rate: 2  },  // Dewgong
    { pokemonId: 134, minLevel: 15, maxLevel: 20, rate: 2  },  // Vaporeon ⭐
    { pokemonId: 130, minLevel: 20, maxLevel: 25, rate: 2  },  // Gyarados ⭐
    { pokemonId: 91,  minLevel: 18, maxLevel: 23, rate: 1  },  // Cloyster
    { pokemonId: 9,   minLevel: 25, maxLevel: 30, rate: 1  },  // Blastoise ⭐
  ],
  trainers: [],
  wanderingNpcs: [
    { id: 'wingull_ml_1', name: 'Wingull', spriteDir: 'sprites/pokemon-npc/wingull', homeX: 5,  homeY: 5, wanderRadius: 4 },
    { id: 'wingull_ml_2', name: 'Wingull', spriteDir: 'sprites/pokemon-npc/wingull', homeX: 12, homeY: 8, wanderRadius: 4 },
  ],
  exits: [
    { x: 0,  y: 6, targetMap: 'rockyCave',    targetX: 15, targetY: 6 },
    { x: 0,  y: 7, targetMap: 'rockyCave',    targetX: 15, targetY: 7 },
    { x: 17, y: 6, targetMap: 'flowerMeadow', targetX: 0,  targetY: 6 },
    { x: 17, y: 7, targetMap: 'flowerMeadow', targetX: 0,  targetY: 7 },
  ],
  doors: [],
}
