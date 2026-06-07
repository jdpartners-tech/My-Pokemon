import type { PokemonData, PartyPokemon, MoveData } from '../types/game'
import movesJson from '../data/moves.json'

const moveDataMap = Object.fromEntries(
  (movesJson as MoveData[]).map(m => [m.id, m])
) as Record<string, MoveData>

export function expForLevel(level: number): number {
  return level * level * 5
}

export function getLevel(xp: number): number {
  let level = 1
  while (expForLevel(level + 1) <= xp && level < 100) level++
  return level
}

export function expGained(opponentLevel: number): number {
  return Math.floor((opponentLevel * 5) + 20)
}

export function calculateMaxHp(baseHp: number, level: number): number {
  return Math.floor(((2 * baseHp * level) / 100) + level + 10)
}

export function calculateStat(baseStat: number, level: number): number {
  return Math.floor(((2 * baseStat * level) / 100) + 5)
}

export function filterValidMoves(moves: PartyPokemon['moves']): PartyPokemon['moves'] {
  return moves.filter(m => !!moveDataMap[m.moveId])
}

export function buildPartyPokemon(
  pokemon: PokemonData,
  level: number
): PartyPokemon {
  const maxHp = calculateMaxHp(pokemon.baseStats.hp, level)

  // Only use moves that exist in our moves data
  const validLearnset = pokemon.learnset.filter(entry => !!moveDataMap[entry.moveId])
  const atLevel = validLearnset.filter(entry => entry.level <= level).slice(-4)
  const learnableMoves = atLevel.length >= 3
    ? atLevel
    : validLearnset.slice(0, Math.max(3, atLevel.length))

  const moves = learnableMoves.length > 0
    ? learnableMoves.map(entry => {
        const pp = moveDataMap[entry.moveId]!.pp
        return { moveId: entry.moveId, pp, maxPp: pp }
      })
    : [{ moveId: 'tackle', pp: 35, maxPp: 35 }]

  return {
    pokemonId: pokemon.id,
    nickname: null,
    level,
    xp: expForLevel(level),
    currentHp: maxHp,
    maxHp,
    moves,
    heldItem: null,
    status: null,
    sleepTurns: 0,
  }
}
