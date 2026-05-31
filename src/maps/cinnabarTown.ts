import { MapData } from './types'

const T = 'tree'  as const
const G = 'grass' as const
const L = 'land'  as const
const B = 'building' as const
const D = 'door'  as const

export const cinnabarTown: MapData = {
  id: 'cinnabarTown',
  name: 'Cinnabar Town',
  width: 17,
  height: 12,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0: north border
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,G,G,G,B,B,B,B,B,G,G,G,G,G,G,T],  // row  2: PC x=5-9 (5 tiles wide, matches image)
    [T,G,G,G,G,B,B,B,B,B,G,G,G,G,G,G,T],  // row  3
    [T,G,G,G,G,B,B,B,B,B,G,G,G,G,G,G,T],  // row  4
    [L,L,G,G,G,B,B,B,B,B,G,G,G,G,G,G,L],  // row  5: west exits x=0-1; east exit x=16
    [L,L,G,G,G,B,B,D,D,B,G,G,G,G,G,G,L],  // row  6: PC doors x=7-8; west+east exits
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  7: open path (PC exit lands at row 8)
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  8
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  9
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 10
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 11
  ],
  buildingOverlays: [
    { x: 5, y: 2, image: 'tile_pokemon_center.png', heightTiles: 5 },
  ],
  wildPokemon: [
    { pokemonId: 58,  minLevel: 18, maxLevel: 25, rate: 24 },  // Growlithe
    { pokemonId: 37,  minLevel: 18, maxLevel: 25, rate: 20 },  // Vulpix
    { pokemonId: 77,  minLevel: 20, maxLevel: 27, rate: 16 },  // Ponyta
    { pokemonId: 126, minLevel: 22, maxLevel: 28, rate: 12 },  // Magmar
    { pokemonId: 4,   minLevel: 18, maxLevel: 24, rate: 10 },  // Charmander ⭐
    { pokemonId: 78,  minLevel: 25, maxLevel: 30, rate: 7  },  // Rapidash
    { pokemonId: 5,   minLevel: 24, maxLevel: 28, rate: 4  },  // Charmeleon ⭐
    { pokemonId: 59,  minLevel: 28, maxLevel: 32, rate: 4  },  // Arcanine ⭐
    { pokemonId: 81,  minLevel: 20, maxLevel: 25, rate: 2  },  // Magnemite
    { pokemonId: 136, minLevel: 22, maxLevel: 28, rate: 1  },  // Flareon ⭐
  ],
  waterPokemon: [],
  trainers: [],
  exits: [
    { x: 0,  y: 5, targetMap: 'trainerRoad',  targetX: 17, targetY: 5 },
    { x: 0,  y: 6, targetMap: 'trainerRoad',  targetX: 17, targetY: 6 },
    { x: 16, y: 5, targetMap: 'volcanoTrail', targetX: 0,  targetY: 5 },
    { x: 16, y: 6, targetMap: 'volcanoTrail', targetX: 0,  targetY: 6 },
    { x: 7,  y: 6, targetMap: 'cinnabarPokecenter', targetX: 5, targetY: 6 },
    { x: 8,  y: 6, targetMap: 'cinnabarPokecenter', targetX: 5, targetY: 6 },
  ],
  doors: [],
}
