export type TileType = 'path' | 'grass' | 'tree' | 'water' | 'building' | 'door' | 'gym'

export interface WildEntry {
  pokemonId: number
  minLevel: number
  maxLevel: number
  rate: number
}

export interface TrainerNpc {
  x: number
  y: number
  direction: 'up' | 'down' | 'left' | 'right'
  name: string
  party: Array<{ pokemonId: number; level: number }>
}

export interface Exit {
  x: number
  y: number
  targetMap: string
  targetX: number
  targetY: number
}

export type DoorInteractionType = 'pokecenter' | 'pokemart' | 'home' | 'gym'

export interface DoorInteraction {
  x: number
  y: number
  type: DoorInteractionType
}

export interface MapData {
  id: string
  name: string
  width: number
  height: number
  tiles: TileType[][]
  wildPokemon: WildEntry[]
  waterPokemon?: WildEntry[]
  trainers: TrainerNpc[]
  exits: Exit[]
  doors: DoorInteraction[]
  isInterior?: boolean
}
