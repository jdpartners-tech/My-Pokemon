import { MapData } from './types'

const T = 'tree'  as const
const G = 'grass' as const
const L = 'land'  as const
const F = 'fence' as const  // training equipment (impassable)

export const trainerRoad: MapData = {
  id: 'trainerRoad',
  name: 'Trainer Road',
  width: 18,
  height: 12,
  tiles: [
    [T,T,T,T,T,T,T,L,L,T,T,T,T,T,T,T,T,T],  // row  0: north exit (→ Rocky Cave) x=7-8
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,F,F,G,G,G,G,G,G,G,F,F,G,G,G,G,T],  // row  2: barbells x=2-3, punch bags x=11-12
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  3
    [T,G,F,G,G,G,G,G,G,G,G,G,G,G,G,G,F,T],  // row  4: weight bench x=2, pull-up bar x=16
    [T,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L],  // row  5: main road (east exit x=17)
    [T,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L],  // row  6: main road (east exit x=17)
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  7
    [T,G,F,G,G,G,G,G,G,G,F,F,G,G,G,G,F,T],  // row  8: equipment x=2, boxing ring x=10-11, weights x=16
    [T,G,F,G,G,G,G,G,G,G,F,F,G,G,G,G,G,T],  // row  9: equipment x=2, boxing ring x=10-11
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 10
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 11
  ],
  wildPokemon: [
    { pokemonId: 56,  minLevel: 14, maxLevel: 20, rate: 14 },  // Mankey
    { pokemonId: 66,  minLevel: 15, maxLevel: 20, rate: 13 },  // Machop
    { pokemonId: 58,  minLevel: 15, maxLevel: 20, rate: 11 },  // Growlithe
    { pokemonId: 37,  minLevel: 15, maxLevel: 20, rate: 9  },  // Vulpix
    { pokemonId: 23,  minLevel: 14, maxLevel: 19, rate: 8  },  // Ekans
    { pokemonId: 96,  minLevel: 15, maxLevel: 20, rate: 7  },  // Drowzee
    { pokemonId: 84,  minLevel: 15, maxLevel: 20, rate: 6  },  // Doduo
    { pokemonId: 100, minLevel: 16, maxLevel: 21, rate: 5  },  // Voltorb
    { pokemonId: 57,  minLevel: 18, maxLevel: 22, rate: 4  },  // Primeape
    { pokemonId: 67,  minLevel: 18, maxLevel: 22, rate: 4  },  // Machoke
    { pokemonId: 53,  minLevel: 18, maxLevel: 22, rate: 4  },  // Persian
    { pokemonId: 125, minLevel: 18, maxLevel: 22, rate: 3  },  // Electabuzz ⭐
    { pokemonId: 24,  minLevel: 18, maxLevel: 22, rate: 3  },  // Arbok
    { pokemonId: 85,  minLevel: 18, maxLevel: 22, rate: 3  },  // Dodrio
    { pokemonId: 82,  minLevel: 18, maxLevel: 22, rate: 3  },  // Magneton
    { pokemonId: 97,  minLevel: 20, maxLevel: 25, rate: 2  },  // Hypno
    { pokemonId: 64,  minLevel: 18, maxLevel: 22, rate: 2  },  // Kadabra
    { pokemonId: 101, minLevel: 18, maxLevel: 22, rate: 2  },  // Electrode
    { pokemonId: 106, minLevel: 20, maxLevel: 25, rate: 2  },  // Hitmonlee ⭐
    { pokemonId: 107, minLevel: 20, maxLevel: 25, rate: 2  },  // Hitmonchan ⭐
    { pokemonId: 68,  minLevel: 22, maxLevel: 28, rate: 1  },  // Machamp ⭐
    { pokemonId: 65,  minLevel: 22, maxLevel: 28, rate: 1  },  // Alakazam ⭐
    { pokemonId: 135, minLevel: 20, maxLevel: 25, rate: 1  },  // Jolteon ⭐
    { pokemonId: 145, minLevel: 45, maxLevel: 50, rate: 1  },  // Zapdos ⭐
  ],
  waterPokemon: [],
  trainers: [
    { x: 4,  y: 3, direction: 'down' as const, name: 'Monk',
      party: [{ pokemonId: 46, level: 18 }, { pokemonId: 48, level: 19 }, { pokemonId: 102, level: 20 }] },
    { x: 15, y: 9, direction: 'up'   as const, name: 'Team Rocket 1',
      party: [{ pokemonId: 74, level: 20 }, { pokemonId: 41, level: 20 }, { pokemonId: 109, level: 22 }] },
    { x: 14, y: 3, direction: 'down' as const, name: 'Black Rocket',
      party: [{ pokemonId: 59, level: 24 }, { pokemonId: 38, level: 24 }, { pokemonId: 126, level: 26 }] },
    { x: 5,  y: 8, direction: 'up'   as const, name: 'Cap',
      party: [{ pokemonId: 56, level: 22 }, { pokemonId: 66, level: 22 }, { pokemonId: 100, level: 24 }] },
    { x: 13, y: 9, direction: 'up'   as const, name: 'Team Rocket 2',
      party: [{ pokemonId: 92, level: 22 }, { pokemonId: 104, level: 23 }, { pokemonId: 88, level: 24 }] },
  ],
  exits: [
    { x: 7,  y: 0, targetMap: 'rockyCave',    targetX: 7,  targetY: 13 },
    { x: 8,  y: 0, targetMap: 'rockyCave',    targetX: 8,  targetY: 13 },
    { x: 17, y: 5, targetMap: 'cinnabarTown', targetX: 0,  targetY: 5  },
    { x: 17, y: 6, targetMap: 'cinnabarTown', targetX: 0,  targetY: 6  },
  ],
  doors: [],
}
