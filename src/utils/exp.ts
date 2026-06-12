import type { PokemonData, PartyPokemon, MoveData } from '../types/game'
import movesJson from '../data/moves.json'

const moveDataMap = Object.fromEntries(
  (movesJson as MoveData[]).map(m => [m.id, m])
) as Record<string, MoveData>

// Total XP required to reach a given level.
// Sized so typical battles give roughly: lv1-10=2 battles, lv11-20=3, lv21-30=4, lv31-40=5, lv41+=5.
export function expForLevel(level: number): number {
  if (level <= 1)  return 0
  if (level <= 11) return (level - 1) * 120
  if (level <= 21) return 1200 + (level - 11) * 300
  if (level <= 31) return 4200 + (level - 21) * 500
  if (level <= 41) return 9200 + (level - 31) * 800
  return 17200 + (level - 41) * 1100
}

export function getLevel(xp: number): number {
  let level = 1
  while (expForLevel(level + 1) <= xp && level < 100) level++
  return level
}

export function expGained(opponentLevel: number): number {
  return Math.floor(opponentLevel * 5 + 20)
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
    friendship: 70,
  }
}
