import { MapData } from './types'

const T = 'tree'     as const
const P = 'path'     as const
const B = 'building' as const
const D = 'door'     as const

export const palletTown: MapData = {
  id: 'pallet',
  name: 'Pallet Town',
  width: 15,
  height: 12,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0: north border
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row  1
    [T,B,B,B,B,B,P,P,B,B,B,B,B,P,T],  // row  2: PC x=1-5, Shop x=8-12
    [T,B,B,B,B,B,P,P,B,B,B,B,B,P,T],  // row  3
    [T,B,B,B,B,B,P,P,B,B,B,B,B,P,T],  // row  4
    [T,B,B,B,B,B,P,P,B,B,B,B,B,D,T],  // row  5: Shop ends; door x=13 (green door in image)
    [T,B,B,B,D,B,P,P,P,P,P,P,P,P,T],  // row  6: PC door x=4 (glass entrance in image)
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row  7
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row  8
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row  9
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row 10
    [T,T,T,T,P,P,P,P,P,P,P,T,T,T,T],  // row 11: road gap at x=4-10 (→ Route 1)
  ],
  buildingOverlays: [
    { x: 1, y: 2, image: 'tile_pokemon_center.png', heightTiles: 5 },
    { x: 8, y: 2, image: 'tile_building_pokemonshop.png', heightTiles: 4 },
  ],
  wildPokemon: [],
  trainers: [],
  exits: [
    { x: 4,  y: 6,  targetMap: 'pokecenter', targetX: 5,  targetY: 6 },
    { x: 4,  y: 11, targetMap: 'route1',     targetX: 4,  targetY: 0 },
    { x: 5,  y: 11, targetMap: 'route1',     targetX: 5,  targetY: 0 },
    { x: 6,  y: 11, targetMap: 'route1',     targetX: 6,  targetY: 0 },
    { x: 7,  y: 11, targetMap: 'route1',     targetX: 7,  targetY: 0 },
    { x: 8,  y: 11, targetMap: 'route1',     targetX: 8,  targetY: 0 },
    { x: 9,  y: 11, targetMap: 'route1',     targetX: 9,  targetY: 0 },
    { x: 10, y: 11, targetMap: 'route1',     targetX: 10, targetY: 0 },
  ],
  doors: [
    { x: 13, y: 5, type: 'pokemart' },
  ],
}
