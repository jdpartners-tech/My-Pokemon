import { palletTown } from './palletTown'
import { route1 } from './route1'
import { pokeCenter } from './pokeCenter'
import { MapData } from './types'

export const MAPS: Record<string, MapData> = {
  pallet: palletTown,
  route1,
  pokecenter: pokeCenter,
}

export function getMap(id: string): MapData {
  return MAPS[id] ?? palletTown
}
