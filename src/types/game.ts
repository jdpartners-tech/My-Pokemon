// ─── Pokemon types ───────────────────────────────────────────────
export type PokemonType =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice'
  | 'fighting' | 'poison' | 'ground' | 'flying' | 'psychic' | 'bug'
  | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy'

export interface BaseStats {
  hp: number; atk: number; def: number
  spAtk: number; spDef: number; spd: number
}

export interface PokemonData {
  id: number
  name: string
  types: PokemonType[]
  baseStats: BaseStats
  catchRate: number
  baseExp: number
  evolvesAtLevel: number | null
  evolvesTo: number | null
  learnset: Array<{ level: number; moveId: string }>
  gen: number
}

export interface MoveData {
  id: string
  name: string
  type: PokemonType
  category: 'physical' | 'special' | 'status'
  power: number
  accuracy: number
  pp: number
}

export type TypeChart = Record<PokemonType, {
  superEffective: PokemonType[]
  notVeryEffective: PokemonType[]
  noEffect: PokemonType[]
}>

// ─── Party / battle ──────────────────────────────────────────────
export type StatusCondition = 'burn' | 'paralysis' | 'sleep' | 'poison' | null

export interface PartyPokemon {
  pokemonId: number
  nickname: string | null
  level: number
  xp: number
  currentHp: number
  maxHp: number
  moves: Array<{ moveId: string; pp: number; maxPp: number }>
  heldItem: string | null
  status: StatusCondition
  sleepTurns: number
}

export interface BoxPokemon {
  pokemonId: number
  nickname: string | null
  level: number
  xp: number
}

export interface BagItem {
  itemId: string
  qty: number
}

export interface ItemData {
  id: string
  name: string
  description: string
  price: number
  effect: 'heal' | 'revive'
  power: number
}

// ─── Education / questions ────────────────────────────────────────
export type SubjectType = 'english' | 'maths' | 'chinese'

export type EnglishQuestionType =
  | 'vocabulary' | 'grammar' | 'spelling' | 'synonyms'
  | 'fillBlank' | 'comprehension' | 'wordPicture'

export type MathsQuestionType =
  | 'arithmetic' | 'wordProblems' | 'sequences'
  | 'shapes' | 'time' | 'money' | 'logic'

export type ChineseQuestionType =
  | 'characterRecognition' | 'vocabulary' | 'strokeOrder'
  | 'radicals' | 'pinyin' | 'grammar' | 'idioms' | 'fillBlank'

export interface SubjectSettings {
  english: { enabled: boolean; types: EnglishQuestionType[] }
  maths:   { enabled: boolean; types: MathsQuestionType[] }
  chinese: { enabled: boolean; types: ChineseQuestionType[] }
}

export interface Question {
  id?: string
  subject: SubjectType
  type: string
  difficulty: 'beginner' | 'advanced'
  question: string
  options: [string, string, string, string]
  answer: string
  hint?: string
}

// ─── Profile ──────────────────────────────────────────────────────
export interface Profile {
  id?: string
  name: string
  age: number
  gender: 'male' | 'female'
  pinHash: string
  difficulty: 'beginner' | 'advanced'
  starterPokemon: string
  subjects: SubjectSettings
  party: PartyPokemon[]
  box: BoxPokemon[]
  bag: BagItem[]
  pokedex: Record<string, 'caught' | 'seen' | 'unseen'>
  badges: string[]
  money: number
  currentRoute: string
  playerX: number
  playerY: number
  stats: {
    battlesWon: number
    questionsAnswered: number
    questionsCorrect: number
  }
}

// ─── Map ─────────────────────────────────────────────────────────
export type TileType = 'path' | 'grass' | 'tree' | 'water' | 'building' | 'door' | 'gym'

export interface NpcData {
  id: string
  x: number; y: number
  name: string
  isTrainer: boolean
  direction: 'up' | 'down' | 'left' | 'right'
  visionRange: number
  party: Array<{ pokemonId: number; level: number }>
  dialogue: string[]
}

export interface ExitData {
  x: number; y: number
  targetMap: string
  targetX: number; targetY: number
}

export interface WildPokemonEntry {
  pokemonId: number
  minLevel: number; maxLevel: number
  rate: number
}

export interface GameMap {
  id: string
  name: string
  width: number; height: number
  tiles: TileType[][]
  npcs: NpcData[]
  exits: ExitData[]
  wildPokemon: WildPokemonEntry[]
  encounterRate: number
}

// ─── Battle state ─────────────────────────────────────────────────
export type BattlePhase =
  | 'idle' | 'player_turn' | 'question' | 'animating'
  | 'opponent_turn' | 'catch' | 'win' | 'lose' | 'escaped' | 'evolving'

export interface ActivePokemon extends PartyPokemon {
  name: string
  data: PokemonData
}
