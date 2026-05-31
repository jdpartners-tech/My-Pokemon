import { MapData } from './types'

const K = 'building' as const  // blocked rock wall
const R = 'path'     as const  // walkable cave floor

export const rockyCave: MapData = {
  id: 'rockyCave',
  name: 'Rocky Cave',
  width: 16,
  height: 14,
  tiles: [
    [K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K],  // row  0
    [K,R,R,R,K,K,R,R,R,R,K,K,R,R,R,K],  // row  1
    [K,R,R,R,R,R,R,R,R,R,R,R,R,R,R,K],  // row  2
    [K,K,R,R,R,K,K,R,R,R,K,K,R,R,R,K],  // row  3
    [K,K,K,R,R,R,R,R,R,R,R,R,R,R,R,K],  // row  4
    [K,K,R,R,R,R,K,K,R,R,R,R,K,R,R,K],  // row  5: east wall (old east exit closed)
    [K,R,R,R,K,K,R,R,R,K,K,R,R,R,R,R],  // row  6: east exit x=15
    [K,R,R,R,R,R,K,K,R,R,R,K,R,R,R,R],  // row  7: east exit x=15 (old west exit closed)
    [K,R,R,K,K,R,R,R,R,K,K,R,R,R,R,K],  // row  8: (old west exit closed)
    [K,R,R,R,R,R,K,R,R,R,R,K,R,R,R,K],  // row  9
    [K,R,R,K,K,R,R,R,K,K,R,R,R,K,R,K],  // row 10
    [K,K,R,R,R,R,R,R,R,R,R,R,R,R,K,K],  // row 11
    [K,K,K,R,R,R,K,R,R,K,R,R,K,K,K,K],  // row 12: opened x=7-8 to reach south exit
    [K,K,K,K,K,K,K,R,R,K,K,K,K,K,K,K],  // row 13: south exit x=7-8
  ],
  wildPokemon: [
    { pokemonId: 41,  minLevel: 10, maxLevel: 15, rate: 18 },  // Zubat
    { pokemonId: 74,  minLevel: 10, maxLevel: 16, rate: 16 },  // Geodude
    { pokemonId: 92,  minLevel: 10, maxLevel: 15, rate: 13 },  // Gastly
    { pokemonId: 27,  minLevel: 10, maxLevel: 15, rate: 9  },  // Sandshrew
    { pokemonId: 104, minLevel: 12, maxLevel: 17, rate: 7  },  // Cubone
    { pokemonId: 88,  minLevel: 12, maxLevel: 17, rate: 6  },  // Grimer
    { pokemonId: 42,  minLevel: 14, maxLevel: 18, rate: 5  },  // Golbat
    { pokemonId: 75,  minLevel: 15, maxLevel: 20, rate: 4  },  // Graveler
    { pokemonId: 93,  minLevel: 15, maxLevel: 20, rate: 4  },  // Haunter
    { pokemonId: 109, minLevel: 12, maxLevel: 17, rate: 3  },  // Koffing
    { pokemonId: 95,  minLevel: 12, maxLevel: 18, rate: 3  },  // Onix
    { pokemonId: 50,  minLevel: 12, maxLevel: 16, rate: 2  },  // Diglett
    { pokemonId: 111, minLevel: 15, maxLevel: 20, rate: 2  },  // Rhyhorn
    { pokemonId: 28,  minLevel: 18, maxLevel: 22, rate: 2  },  // Sandslash
    { pokemonId: 105, minLevel: 18, maxLevel: 22, rate: 2  },  // Marowak
    { pokemonId: 110, minLevel: 15, maxLevel: 20, rate: 2  },  // Weezing
    { pokemonId: 51,  minLevel: 16, maxLevel: 20, rate: 2  },  // Dugtrio
    { pokemonId: 138, minLevel: 14, maxLevel: 18, rate: 2  },  // Omanyte ⭐
    { pokemonId: 140, minLevel: 14, maxLevel: 18, rate: 2  },  // Kabuto ⭐
    { pokemonId: 89,  minLevel: 18, maxLevel: 22, rate: 1  },  // Muk
    { pokemonId: 112, minLevel: 20, maxLevel: 25, rate: 1  },  // Rhydon
    { pokemonId: 76,  minLevel: 20, maxLevel: 25, rate: 1  },  // Golem
    { pokemonId: 94,  minLevel: 20, maxLevel: 25, rate: 1  },  // Gengar ⭐
    { pokemonId: 139, minLevel: 20, maxLevel: 25, rate: 1  },  // Omastar ⭐
    { pokemonId: 141, minLevel: 20, maxLevel: 25, rate: 1  },  // Kabutops ⭐
    { pokemonId: 137, minLevel: 18, maxLevel: 22, rate: 1  },  // Porygon ⭐
    { pokemonId: 142, minLevel: 22, maxLevel: 28, rate: 1  },  // Aerodactyl ⭐
  ],
  waterPokemon: [],
  trainers: [
    { x: 4, y: 2, direction: 'down' as const, name: 'Team Rocket 1', party: [{ pokemonId: 74, level: 18 }, { pokemonId: 41, level: 18 }, { pokemonId: 109, level: 20 }] },
    { x: 10, y: 9, direction: 'down' as const, name: 'Team Rocket 2', party: [{ pokemonId: 92, level: 18 }, { pokemonId: 104, level: 19 }, { pokemonId: 88, level: 20 }] },
  ],
  exits: [
    { x: 15, y: 6, targetMap: 'mistyLake',   targetX: 0, targetY: 6 },
    { x: 15, y: 7, targetMap: 'mistyLake',   targetX: 0, targetY: 7 },
    { x: 7,  y: 13, targetMap: 'trainerRoad', targetX: 7,  targetY: 0 },
    { x: 8,  y: 13, targetMap: 'trainerRoad', targetX: 8,  targetY: 0 },
  ],
  doors: [],
}
