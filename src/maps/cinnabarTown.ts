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
    [T,G,G,G,B,B,G,G,B,B,G,G,G,G,G,G,T],  // row  2: PC x=4-5, Shop x=8-9
    [T,G,G,G,B,B,G,G,B,B,G,G,G,G,G,G,T],  // row  3
    [T,G,G,G,B,B,G,G,B,B,G,G,G,G,G,G,T],  // row  4
    [L,L,G,G,B,B,G,G,B,B,G,G,G,G,G,G,L],  // row  5: west exits x=0-1; east exit x=16
    [L,L,G,G,B,B,G,G,B,B,G,G,G,G,G,G,L],  // row  6: west exits x=0-1; east exit x=16
    [T,G,G,G,D,G,G,G,G,D,G,G,G,G,G,G,T],  // row  7: PC door x=4, shop door x=9
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  8
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  9
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 10
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 11
  ],
  buildingOverlays: [
    { x: 4, y: 2, image: 'tile_pokemon_center.png', heightTiles: 5 },
    { x: 8, y: 2, image: 'tile_building_big.png', heightTiles: 5 },
  ],
  wildPokemon: [],
  waterPokemon: [],
  trainers: [],
  exits: [
    { x: 0,  y: 5, targetMap: 'trainerRoad',  targetX: 17, targetY: 5 },
    { x: 0,  y: 6, targetMap: 'trainerRoad',  targetX: 17, targetY: 6 },
    { x: 16, y: 5, targetMap: 'volcanoTrail', targetX: 0,  targetY: 5 },
    { x: 16, y: 6, targetMap: 'volcanoTrail', targetX: 0,  targetY: 6 },
    { x: 4,  y: 7, targetMap: 'cinnabarPokecenter', targetX: 5, targetY: 6 },
  ],
  doors: [
    { x: 9, y: 7, type: 'pokemart' },
  ],
}
