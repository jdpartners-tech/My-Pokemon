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
    [T,T,T,T,T,T,L,L,T,T,T,T,T,T,T,T,T],  // row  0: north exit (→ Volcano Trail) x=6-7
    [T,G,G,G,G,G,L,L,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,G,G,B,B,G,G,G,G,G,B,B,G,G,G,T],  // row  2: buildings
    [T,G,G,G,B,B,G,G,G,G,G,B,B,G,G,G,T],  // row  3
    [T,G,G,G,B,B,G,G,G,G,G,B,B,G,G,G,T],  // row  4
    [L,L,G,G,B,B,G,G,G,G,G,B,B,G,G,G,T],  // row  5: west exits x=0-1
    [L,L,G,G,B,B,G,G,G,G,G,B,B,G,G,G,T],  // row  6: west exits x=0-1
    [T,G,G,G,D,G,G,D,G,G,G,G,D,G,G,G,T],  // row  7: doors (PC at x=4, gym at x=7 and x=12)
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  8
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  9
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 10
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 11
  ],
  buildingOverlays: [
    { x: 4, y: 2, image: 'tile_pokemon_center.png', heightTiles: 5 },
    { x: 11, y: 2, image: 'tile_building_big.png', heightTiles: 5 },
  ],
  wildPokemon: [],
  waterPokemon: [],
  trainers: [],
  exits: [
    { x: 0, y: 5, targetMap: 'trainerRoad',  targetX: 16, targetY: 5 },
    { x: 0, y: 6, targetMap: 'trainerRoad',  targetX: 16, targetY: 6 },
    { x: 6, y: 0, targetMap: 'volcanoTrail', targetX: 6,  targetY: 14 },
    { x: 7, y: 0, targetMap: 'volcanoTrail', targetX: 7,  targetY: 14 },
    { x: 4, y: 7, targetMap: 'pokecenter',   targetX: 5,  targetY: 6  },
  ],
  doors: [],
}
