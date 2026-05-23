import { MapData } from './types'

const T = 'tree' as const
const P = 'path' as const
const B = 'building' as const
const D = 'door' as const

export const palletTown: MapData = {
  id: 'pallet',
  name: 'Pallet Town',
  width: 15,
  height: 12,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,B,B,P,P,P,P,P,B,B,P,P,P,T],
    [T,P,B,B,P,P,P,P,P,B,B,P,P,P,T],
    [T,P,P,D,P,P,P,P,P,P,D,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,T,T,T,T,T,T,P,P,T,T,T,T,T,T],
  ],
  wildPokemon: [],
  trainers: [],
  exits: [
    { x: 7, y: 11, targetMap: 'route1', targetX: 7, targetY: 0 },
    { x: 8, y: 11, targetMap: 'route1', targetX: 8, targetY: 0 },
  ],
}
