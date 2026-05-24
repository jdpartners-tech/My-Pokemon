import { MapData } from './types'

const T = 'tree' as const
const P = 'path' as const
const G = 'grass' as const

export const route1: MapData = {
  id: 'route1',
  name: 'Route 1',
  width: 15,
  height: 20,
  tiles: [
    [T,T,T,T,T,T,T,P,P,T,T,T,T,T,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,G,G,G,P,P,P,P,P,G,G,G,P,T],
    [T,P,G,G,G,G,P,P,P,G,G,G,G,P,T],
    [T,P,G,G,G,G,G,P,G,G,G,G,G,P,T],
    [T,P,P,G,G,G,P,P,P,G,G,G,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,G,G,P,P,P,P,P,P,P,G,G,P,T],
    [T,P,G,G,G,P,P,P,P,P,G,G,G,P,T],
    [T,P,P,G,G,G,P,P,P,G,G,G,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,G,G,G,P,P,P,P,P,P,G,G,P,T],
    [T,P,G,G,G,G,P,P,P,G,G,G,G,P,T],
    [T,P,P,G,G,G,G,P,G,G,G,G,P,P,T],
    [T,P,P,P,G,G,P,P,P,G,G,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,P,P,P,P,P,P,P,P,P,P,P,P,P,T],
    [T,T,T,T,T,T,T,P,P,T,T,T,T,T,T],
  ],
  wildPokemon: [
    { pokemonId: 16, minLevel: 2, maxLevel: 5, rate: 30 },
    { pokemonId: 19, minLevel: 2, maxLevel: 4, rate: 25 },
    { pokemonId: 10, minLevel: 2, maxLevel: 4, rate: 20 },
    { pokemonId: 13, minLevel: 2, maxLevel: 4, rate: 15 },
    { pokemonId: 1,  minLevel: 3, maxLevel: 5, rate: 10 },
  ],
  trainers: [
    {
      x: 7, y: 6,
      direction: 'down',
      name: 'Youngster Jake',
      party: [{ pokemonId: 19, level: 4 }, { pokemonId: 16, level: 4 }],
    },
  ],
  exits: [
    { x: 7, y: 0,  targetMap: 'pallet',  targetX: 7, targetY: 10 },
    { x: 8, y: 0,  targetMap: 'pallet',  targetX: 8, targetY: 10 },
    { x: 7, y: 19, targetMap: 'route1',  targetX: 7, targetY: 18 },
    { x: 8, y: 19, targetMap: 'route1',  targetX: 8, targetY: 18 },
  ],
  doors: [],
}
