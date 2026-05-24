import { MapData } from './types'

const T = 'tree'     as const
const P = 'path'     as const
const B = 'building' as const
const D = 'door'     as const

// GBA calibration: BG_ORIGINS=[32,65], tile(c,r) ↔ source px (32+c*16, 65+r*16)
// Left building roof top  ≈ source y=103 → row 2.4
// Left building door      ≈ source y=180 → row 7.2
// Left building  cols 4-6,  right building cols 8-10
// Side paths cols 1-3 (west) and cols 11-13 (east) pass north/south freely
export const palletTown: MapData = {
  id: 'pallet',
  name: 'Pallet Town',
  width: 15,
  height: 12,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0: north border trees
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row  1: open area above buildings
    [T,P,P,P,B,B,B,T,B,B,B,P,P,P,T],  // row  2: building roof starts
    [T,P,P,P,B,B,B,T,B,B,B,P,P,P,T],  // row  3
    [T,P,P,P,B,B,B,T,B,B,B,P,P,P,T],  // row  4
    [T,P,P,P,B,B,B,T,B,B,B,P,P,P,T],  // row  5: walls
    [T,P,P,P,B,B,B,T,B,B,B,P,P,P,T],  // row  6: lower walls
    [T,P,P,P,P,D,P,P,P,D,P,P,P,P,T],  // row  7: PC door(col5), Mart door(col9)
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row  8: south path
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row  9
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row 10
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],  // row 11: exits to Route 1
  ],
  wildPokemon: [],
  trainers: [],
  exits: [
    { x: 5,  y: 7,  targetMap: 'pokecenter', targetX: 5,  targetY: 6 },
    { x: 4,  y: 11, targetMap: 'route1',     targetX: 4,  targetY: 0 },
    { x: 5,  y: 11, targetMap: 'route1',     targetX: 5,  targetY: 0 },
    { x: 6,  y: 11, targetMap: 'route1',     targetX: 6,  targetY: 0 },
    { x: 7,  y: 11, targetMap: 'route1',     targetX: 7,  targetY: 0 },
    { x: 8,  y: 11, targetMap: 'route1',     targetX: 8,  targetY: 0 },
    { x: 9,  y: 11, targetMap: 'route1',     targetX: 9,  targetY: 0 },
    { x: 10, y: 11, targetMap: 'route1',     targetX: 10, targetY: 0 },
  ],
  doors: [
    { x: 9, y: 7, type: 'pokemart' },
  ],
}
