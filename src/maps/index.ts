import { palletTown } from './palletTown'
import { pokeCenter } from './pokecenter'
import { cinnabarPokeCenter } from './cinnabarPokecenter'
import { sunlitMeadow } from './sunlitMeadow'
import { viridianForest } from './viridianForest'
import { flowerMeadow } from './flowerMeadow'
import { mistyLake } from './mistyLake'
import { rockyCave } from './rockyCave'
import { trainerRoad } from './trainerRoad'
import { cinnabarTown } from './cinnabarTown'
import { volcanoTrail } from './volcanoTrail'
import { MapData } from './types'

export const MAPS: Record<string, MapData> = {
  pallet: palletTown,
  pokecenter: pokeCenter,
  cinnabarPokecenter: cinnabarPokeCenter,
  sunlitMeadow,
  viridianForest,
  flowerMeadow,
  mistyLake,
  rockyCave,
  trainerRoad,
  cinnabarTown,
  volcanoTrail,
  route1: sunlitMeadow,  // legacy alias
}

export function getMap(id: string): MapData {
  return MAPS[id] ?? palletTown
}
