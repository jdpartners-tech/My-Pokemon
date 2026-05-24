import { create } from 'zustand'
import type { BattlePhase, PartyPokemon, Question } from '../types/game'

interface BattleState {
  phase: BattlePhase
  playerPokemon: PartyPokemon | null
  opponentPokemon: PartyPokemon | null
  isWildBattle: boolean
  trainerName: string | null
  question: Question | null
  selectedMoveIndex: number | null
  log: string[]
  usedQuestionIds: Set<string>

  // Actions
  startWildBattle: (player: PartyPokemon, opponent: PartyPokemon) => void
  startTrainerBattle: (player: PartyPokemon, opponent: PartyPokemon, trainerName: string) => void
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

  // Stub actions — wired in Task 13 (useBattleEngine)
  selectMove: (index: number) => void
  handleAnswer: (correct: boolean) => void
  continueBattle: () => void
}

const initialState = {
  phase: 'idle' as BattlePhase,
  playerPokemon: null,
  opponentPokemon: null,
  isWildBattle: false,
  ballAnimPhase: 0,
  ballCaught: false,
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
}

export const useBattleStore = create<BattleState>((set) => ({
  ...initialState,

  startWildBattle: (player, opponent) => set({
    ...initialState,
    phase: 'player_turn',
    playerPokemon: player,
    opponentPokemon: opponent,
    isWildBattle: true,
    trainerName: null,
    log: [`A wild ${opponent.pokemonId} appeared!`],
    usedQuestionIds: new Set(),
  }),

  startTrainerBattle: (player, opponent, trainerName) => set({
    ...initialState,
    phase: 'player_turn',
    playerPokemon: player,
    opponentPokemon: opponent,
    isWildBattle: false,
    trainerName,
    log: [`${trainerName} sent out ${opponent.pokemonId}!`],
    usedQuestionIds: new Set(),
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

  resetBattle: () => set({ ...initialState, usedQuestionIds: new Set() }),

  setBallAnimPhase: (n) => set({ ballAnimPhase: n }),
  setBallCaught: (v) => set({ ballCaught: v }),

  // Stubs — replaced by useBattleEngine in Task 13
  selectMove: (index) => set({ selectedMoveIndex: index, phase: 'question' }),
  handleAnswer: (_correct) => {},
  continueBattle: () => set({ phase: 'player_turn' }),
}))
