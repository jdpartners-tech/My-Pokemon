import typeChartJson from '../data/typeChart.json'
import type { PokemonType } from '../types/game'

type RawTypeChart = Record<PokemonType, {
  'super-effective': PokemonType[]
  'not-very-effective': PokemonType[]
  'no-effect': PokemonType[]
}>

const typeChart = typeChartJson as unknown as RawTypeChart

export function getTypeEffectiveness(moveType: PokemonType, defenderTypes: PokemonType[]): number {
  return defenderTypes.reduce((multiplier, defType) => {
    const chart = typeChart[moveType]
    if (!chart) return multiplier
    if (chart['no-effect'].includes(defType)) return 0
    if (chart['super-effective'].includes(defType)) return multiplier * 2
    if (chart['not-very-effective'].includes(defType)) return multiplier * 0.5
    return multiplier
  }, 1)
}

export function calculateDamage(
  attackerLevel: number,
  movePower: number,
  attackStat: number,
  defenseStat: number,
  effectiveness: number
): number {
  if (movePower === 0 || effectiveness === 0) return 0
  const base = Math.floor(
    (Math.floor((2 * attackerLevel) / 5 + 2) * movePower * attackStat) / defenseStat / 50
  ) + 2
  const randomFactor = 0.85 + Math.random() * 0.15
  return Math.max(1, Math.floor(base * effectiveness * randomFactor))
}

export function applyBurnPenalty(atk: number): number {
  return Math.floor(atk / 2)
}
