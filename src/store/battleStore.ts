import { create } from 'zustand'
import type { BattlePhase, PartyPokemon, Question, StatusCondition, PokemonData } from '../types/game'
import pokemonJson from '../data/pokemon.json'

const _pokemonNameMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p.name])
) as Record<number, string>

function _pokeName(p: PartyPokemon): string {
  return p.nickname || _pokemonNameMap[p.pokemonId] || `#${p.pokemonId}`
}

interface DamagePopup { id: number; amount: number; forOpponent: boolean }

interface BattleState {
  phase: BattlePhase
  playerPokemon: PartyPokemon | null
  opponentPokemon: PartyPokemon | null
  party: PartyPokemon[]
  isWildBattle: boolean
  trainerName: string | null
  trainerSpriteCol: number  // column index in trainer-sheet.png (0-7)
  trainerSpriteRow: number  // row index in trainer-sheet.png (0-7)
  question: Question | null
  selectedMoveIndex: number | null
  log: string[]
  usedQuestionIds: Set<string>

  // Actions
  startWildBattle: (player: PartyPokemon, opponent: PartyPokemon, party: PartyPokemon[]) => void
  startTrainerBattle: (player: PartyPokemon, opponent: PartyPokemon, trainerName: string, party: PartyPokemon[]) => void
  switchPokemon: (index: number) => void
  setPhase: (phase: BattlePhase) => void
  setQuestion: (question: Question) => void
  clearQuestion: () => void
  setSelectedMoveIndex: (index: number | null) => void
  addLog: (message: string) => void
  clearLog: () => void
  addUsedQuestionId: (id: string) => void
  decrementPP: (moveIndex: number) => void
  dealDamageToOpponent: (dmg: number) => void
  dealDamageToPlayer: (dmg: number) => void
  addExpToPlayer: (exp: number) => void
  evolvePlayer: (newPokemonId: number, newName: string) => void
  throwPokeball: () => void
  resetBattle: () => void

  expAnimating: boolean
  leveledUp: boolean
  setExpAnimating: (v: boolean) => void
  setLeveledUp: (v: boolean) => void
  healPlayer: (amount: number) => void
  playerAttacking: boolean
  opponentFlash: boolean
  shakeX: number
  setPlayerAttacking: (v: boolean) => void
  setOpponentFlash: (v: boolean) => void
  setShakeX: (n: number) => void

  // Opponent attack animations (mirror of player attack)
  opponentAttacking: boolean
  playerFlash: boolean
  playerShakeX: number
  setOpponentAttacking: (v: boolean) => void
  setPlayerFlash: (v: boolean) => void
  setPlayerShakeX: (n: number) => void

  // Ball throw animation
  ballAnimPhase: number   // 0=idle 1=flying 2=flash 3=shaking 4=caught 5=failed
  ballCaught: boolean
  setBallAnimPhase: (n: number) => void
  setBallCaught: (v: boolean) => void

  // NPC Pokemon catch tracking — set before navigating to battle, cleared on WorldMap mount
  pendingCatchNpcId: string | null
  setPendingCatchNpcId: (id: string | null) => void

  answerResult: { wasCorrect: boolean; correctAnswer: string } | null
  setAnswerResult: (r: { wasCorrect: boolean; correctAnswer: string } | null) => void
  resolveWrongAnswer: (() => void) | null
  setResolveWrongAnswer: (fn: () => void) => void
  acknowledgeWrongAnswer: () => void

  setPlayerStatus: (status: StatusCondition, sleepTurns?: number) => void
  setOpponentStatus: (status: StatusCondition, sleepTurns?: number) => void
  healOpponent: (amount: number) => void

  damagePopup: DamagePopup | null
  showDamagePopup: (amount: number, forOpponent: boolean) => void
  clearDamagePopup: () => void

  hitEffect: { moveType: string; forOpponent: boolean } | null
  setHitEffect: (moveType: string, forOpponent: boolean) => void
  clearHitEffect: () => void

  battleBanner: string | null
  setBattleBanner: (s: string | null) => void

  // Stub actions — wired in Task 13 (useBattleEngine)
  selectMove: (index: number) => void
  handleAnswer: (correct: boolean, chosenAnswer?: string) => void
  continueBattle: () => void
}

const initialState = {
  phase: 'idle' as BattlePhase,
  playerPokemon: null,
  opponentPokemon: null,
  party: [] as PartyPokemon[],
  isWildBattle: false,
  ballAnimPhase: 0,
  ballCaught: false,
  pendingCatchNpcId: null,
  trainerName: null,
  question: null,
  selectedMoveIndex: null,
  log: [],
  usedQuestionIds: new Set<string>(),
  expAnimating: false,
  leveledUp: false,
  playerAttacking: false,
  opponentFlash: false,
  shakeX: 0,
  opponentAttacking: false,
  playerFlash: false,
  playerShakeX: 0,
  answerResult: null,
  resolveWrongAnswer: null,
  trainerSpriteCol: 0,
  trainerSpriteRow: 0,
  damagePopup: null,
  hitEffect: null,
  battleBanner: null,
}

export const useBattleStore = create<BattleState>((set) => ({
  ...initialState,

  startWildBattle: (player, opponent, party) => set({
    ...initialState,
    phase: 'player_turn',
    playerPokemon: player,
    opponentPokemon: opponent,
    party,
    isWildBattle: true,
    trainerName: null,
    log: [`A wild ${_pokeName(opponent)} appeared!`],
    usedQuestionIds: new Set(),
  }),

  startTrainerBattle: (player, opponent, trainerName, party) => {
    const TRAINER_SPRITES: Record<string, {row: number, col: number}> = {
      'Biker':   { row: 2, col: 2 },
      'Lass':    { row: 0, col: 4 },
      'Swimmer': { row: 1, col: 0 },
      'Hiker':   { row: 1, col: 2 },
      'Bug':     { row: 1, col: 3 },
      'Dark':    { row: 2, col: 0 },
      'default': { row: 0, col: 3 },
    }
    const cls = trainerName.split(' ')[0]
    const sprite = TRAINER_SPRITES[cls] ?? TRAINER_SPRITES['default']
    set({
      ...initialState,
      phase: 'trainer_intro',
      playerPokemon: player,
      opponentPokemon: opponent,
      party,
      isWildBattle: false,
      trainerName,
      trainerSpriteCol: sprite.col,
      trainerSpriteRow: sprite.row,
      log: [`${trainerName} wants to battle!`],
      usedQuestionIds: new Set(),
    })
  },

  switchPokemon: (index) => set((state) => {
    const incoming = state.party[index]
    if (!incoming || incoming.currentHp <= 0) return {}
    const updated = state.party.map((p, i) =>
      i === index ? state.playerPokemon! : p
    ).filter(Boolean) as PartyPokemon[]
    return { playerPokemon: incoming, party: updated }
  }),

  setPhase: (phase) => set({ phase }),
  setQuestion: (question) => set({ question }),
  clearQuestion: () => set({ question: null }),
  setSelectedMoveIndex: (index) => set({ selectedMoveIndex: index }),

  addLog: (message) => set((state) => ({
    log: [...state.log.slice(-19), message],
  })),
  clearLog: () => set({ log: [] }),

  addUsedQuestionId: (id) => set((state) => ({
    usedQuestionIds: new Set([...state.usedQuestionIds, id]),
  })),

  decrementPP: (moveIndex) => set((state) => {
    if (!state.playerPokemon) return {}
    const moves = state.playerPokemon.moves.map((m, i) =>
      i === moveIndex ? { ...m, pp: Math.max(0, m.pp - 1) } : m
    )
    return { playerPokemon: { ...state.playerPokemon, moves } }
  }),

  dealDamageToOpponent: (dmg) => set((state) => {
    if (!state.opponentPokemon) return {}
    return {
      opponentPokemon: {
        ...state.opponentPokemon,
        currentHp: Math.max(0, state.opponentPokemon.currentHp - dmg),
      },
    }
  }),

  dealDamageToPlayer: (dmg) => set((state) => {
    if (!state.playerPokemon) return {}
    return {
      playerPokemon: {
        ...state.playerPokemon,
        currentHp: Math.max(0, state.playerPokemon.currentHp - dmg),
      },
    }
  }),

  addExpToPlayer: (exp) => set((state) => {
    if (!state.playerPokemon) return {}
    return {
      playerPokemon: { ...state.playerPokemon, xp: state.playerPokemon.xp + exp },
    }
  }),

  evolvePlayer: (newPokemonId, newName) => set((state) => {
    if (!state.playerPokemon) return {}
    return {
      playerPokemon: { ...state.playerPokemon, pokemonId: newPokemonId, nickname: newName },
    }
  }),

  throwPokeball: () => set({ phase: 'catch' }),

  setExpAnimating: (v) => set({ expAnimating: v }),
  setLeveledUp: (v) => set({ leveledUp: v }),
  setPlayerAttacking: (v) => set({ playerAttacking: v }),
  setOpponentFlash: (v) => set({ opponentFlash: v }),
  setShakeX: (n) => set({ shakeX: n }),
  setOpponentAttacking: (v) => set({ opponentAttacking: v }),
  setPlayerFlash: (v) => set({ playerFlash: v }),
  setPlayerShakeX: (n) => set({ playerShakeX: n }),

  healPlayer: (amount) => set((state) => {
    if (!state.playerPokemon) return {}
    return {
      playerPokemon: {
        ...state.playerPokemon,
        currentHp: Math.min(state.playerPokemon.maxHp, state.playerPokemon.currentHp + amount),
      },
    }
  }),

  setPlayerStatus: (status, sleepTurns = 0) => set((state) => {
    if (!state.playerPokemon) return {}
    return { playerPokemon: { ...state.playerPokemon, status, sleepTurns } }
  }),

  setOpponentStatus: (status, sleepTurns = 0) => set((state) => {
    if (!state.opponentPokemon) return {}
    return { opponentPokemon: { ...state.opponentPokemon, status, sleepTurns } }
  }),

  healOpponent: (amount) => set((state) => {
    if (!state.opponentPokemon) return {}
    return {
      opponentPokemon: {
        ...state.opponentPokemon,
        currentHp: Math.min(state.opponentPokemon.maxHp, state.opponentPokemon.currentHp + amount),
      },
    }
  }),

  resetBattle: () => set({ ...initialState, usedQuestionIds: new Set() }),

  setBallAnimPhase: (n) => set({ ballAnimPhase: n }),
  setBallCaught: (v) => set({ ballCaught: v }),
  setPendingCatchNpcId: (id) => set({ pendingCatchNpcId: id }),

  showDamagePopup: (amount, forOpponent) => set({ damagePopup: { id: Date.now(), amount, forOpponent } }),
  clearDamagePopup: () => set({ damagePopup: null }),
  setHitEffect: (moveType, forOpponent) => set({ hitEffect: { moveType, forOpponent } }),
  clearHitEffect: () => set({ hitEffect: null }),

  setBattleBanner: (s) => set({ battleBanner: s }),

  setAnswerResult: (r) => set({ answerResult: r }),
  setResolveWrongAnswer: (fn) => set({ resolveWrongAnswer: fn }),
  acknowledgeWrongAnswer: () => set(state => {
    state.resolveWrongAnswer?.()
    return { resolveWrongAnswer: null, answerResult: null }
  }),

  // Stubs — replaced by useBattleEngine in Task 13
  selectMove: (index) => set({ selectedMoveIndex: index, phase: 'question' }),
  handleAnswer: (_correct, _chosen) => {},
  continueBattle: () => set({ phase: 'player_turn' }),
}))
