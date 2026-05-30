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
    [T,B,B,B,B,B,P,P,B,B,B,D,B,P,T],  // row  5: Shop ends; door x=11 (green door in image)
    [T,B,B,D,D,B,P,P,P,P,P,P,P,P,P],  // row  6: PC doors x=3-4; east exit x=14
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,P],  // row  7: east exit x=14
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row  8
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row  9
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row 10
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 11: south border (old exit closed)
  ],
  buildingOverlays: [
    { x: 1, y: 2, image: 'tile_pokemon_center.png', heightTiles: 5 },
    { x: 8, y: 2, image: 'tile_building_pokemonshop.png', heightTiles: 4 },
  ],
  wildPokemon: [],
  trainers: [],
  exits: [
    { x: 3,  y: 6, targetMap: 'pokecenter',   targetX: 5,  targetY: 6 },
    { x: 4,  y: 6, targetMap: 'pokecenter',   targetX: 5,  targetY: 6 },
    { x: 14, y: 6, targetMap: 'sunlitMeadow', targetX: 0,  targetY: 6 },
    { x: 14, y: 7, targetMap: 'sunlitMeadow', targetX: 0,  targetY: 7 },
  ],
  doors: [
    { x: 11, y: 5, type: 'pokemart' },
  ],
}
