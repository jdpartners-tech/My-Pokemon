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
    [V,V,V,V,K,K,V,V,V,K,K,V,V,V,K,K],  // row  5: west exit x=0
    [V,V,V,V,V,K,K,V,V,V,K,V,V,V,V,K],  // row  6: west exit x=0
    [K,V,V,K,V,V,V,V,V,V,V,V,K,V,V,K],  // row  7
    [K,K,V,V,V,K,K,V,V,K,K,V,V,V,K,K],  // row  8
    [K,V,V,V,K,V,V,V,V,V,V,V,K,V,V,K],  // row  9
    [K,V,V,K,K,K,V,V,V,V,V,K,K,V,V,K],  // row 10
    [K,K,V,V,V,V,V,K,K,V,V,V,V,V,K,K],  // row 11
    [K,K,K,V,V,V,V,V,V,V,V,V,V,K,K,K],  // row 12
    [K,K,V,V,K,K,V,V,V,K,K,V,V,V,K,K],  // row 13
    [K,V,V,V,V,V,V,V,V,V,V,V,V,V,V,K],  // row 14
    [K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K],  // row 15: south border (old cinnabar exit closed)
  ],
  wildPokemon: [
    { pokemonId: 77,  minLevel: 25, maxLevel: 30, rate: 18 },  // Ponyta
    { pokemonId: 126, minLevel: 28, maxLevel: 33, rate: 16 },  // Magmar
    { pokemonId: 38,  minLevel: 30, maxLevel: 35, rate: 14 },  // Ninetales
    { pokemonId: 59,  minLevel: 32, maxLevel: 38, rate: 12 },  // Arcanine
    { pokemonId: 78,  minLevel: 30, maxLevel: 36, rate: 10 },  // Rapidash
    { pokemonId: 5,   minLevel: 28, maxLevel: 33, rate: 8  },  // Charmeleon ⭐
    { pokemonId: 6,   minLevel: 35, maxLevel: 42, rate: 8  },  // Charizard ⭐
    { pokemonId: 136, minLevel: 30, maxLevel: 36, rate: 5  },  // Flareon ⭐
    { pokemonId: 4,   minLevel: 25, maxLevel: 30, rate: 4  },  // Charmander ⭐
    { pokemonId: 150, minLevel: 50, maxLevel: 55, rate: 3  },  // Mewtwo ⭐
    { pokemonId: 155, minLevel: 25, maxLevel: 30, rate: 8  },  // Cyndaquil ⭐
    { pokemonId: 240, minLevel: 24, maxLevel: 29, rate: 10 },  // Magby
    { pokemonId: 248, minLevel: 50, maxLevel: 55, rate: 2  },  // Tyranitar ⭐
    { pokemonId: 146, minLevel: 50, maxLevel: 55, rate: 2  },  // Moltres ⭐
  ],
  waterPokemon: [],
  trainers: [],
  wanderingNpcs: [
    { id: 'koffing_vt_1', name: 'Koffing', spriteDir: 'sprites/pokemon-npc/koffing', homeX: 8,  homeY: 6,  wanderRadius: 4, pokemonId: 109, minLevel: 28, maxLevel: 38 },
    { id: 'koffing_vt_2', name: 'Koffing', spriteDir: 'sprites/pokemon-npc/koffing', homeX: 13, homeY: 10, wanderRadius: 4, pokemonId: 109, minLevel: 28, maxLevel: 38 },
  ],
  exits: [
    { x: 0, y: 5, targetMap: 'cinnabarTown', targetX: 16, targetY: 5 },
    { x: 0, y: 6, targetMap: 'cinnabarTown', targetX: 16, targetY: 6 },
  ],
  doors: [],
}
