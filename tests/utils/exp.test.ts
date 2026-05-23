import { expForLevel, getLevel, expGained, calculateMaxHp, calculateStat, buildPartyPokemon } from '../../src/utils/exp'
import type { PokemonData } from '../../src/types/game'

describe('expForLevel', () => {
  it('returns 1 for level 1', () => {
    expect(expForLevel(1)).toBe(1)
  })

  it('returns 125 for level 5', () => {
    expect(expForLevel(5)).toBe(125)
  })

  it('returns 1000 for level 10', () => {
    expect(expForLevel(10)).toBe(1000)
  })

  it('returns 8 for level 2', () => {
    expect(expForLevel(2)).toBe(8)
  })

  it('returns 27 for level 3', () => {
    expect(expForLevel(3)).toBe(27)
  })
})

describe('getLevel', () => {
  it('returns 1 for xp=0', () => {
    expect(getLevel(0)).toBe(1)
  })

  it('returns 1 for xp=1', () => {
    expect(getLevel(1)).toBe(1)
  })

  it('returns 5 for xp=125', () => {
    // expForLevel(5)=125, expForLevel(6)=216 > 125
    expect(getLevel(125)).toBe(5)
  })

  it('returns 10 for xp=1000', () => {
    expect(getLevel(1000)).toBe(10)
  })

  it('returns 4 for xp=64 (between expForLevel(4)=64 and expForLevel(5)=125)', () => {
    expect(getLevel(64)).toBe(4)
  })

  it('returns 4 for xp just below 125', () => {
    expect(getLevel(124)).toBe(4)
  })

  it('returns 6 for xp=216', () => {
    expect(getLevel(216)).toBe(6)
  })
})

describe('expGained', () => {
  it('returns a positive number for any opponent level', () => {
    expect(expGained(10)).toBeGreaterThan(0)
  })

  it('returns correct value: level*3+10', () => {
    expect(expGained(10)).toBe(40)
    expect(expGained(5)).toBe(25)
    expect(expGained(1)).toBe(13)
    expect(expGained(20)).toBe(70)
  })
})

describe('calculateMaxHp', () => {
  it('returns correct value for Bulbasaur base HP 45 at level 5', () => {
    // floor((2*45*5)/100 + 5 + 10) = floor(4.5 + 15) = floor(4.5+5+10) = floor(19.5) = 19
    expect(calculateMaxHp(45, 5)).toBe(19)
  })

  it('returns correct value for base HP 100 at level 100', () => {
    // floor((2*100*100)/100 + 100 + 10) = floor(200 + 110) = 310
    expect(calculateMaxHp(100, 100)).toBe(310)
  })

  it('scales with level', () => {
    expect(calculateMaxHp(45, 10)).toBeGreaterThan(calculateMaxHp(45, 5))
  })
})

describe('calculateStat', () => {
  it('returns correct value for base stat 49 at level 5', () => {
    // floor((2*49*5)/100 + 5) = floor(4.9 + 5) = floor(9.9) = 9
    expect(calculateStat(49, 5)).toBe(9)
  })

  it('returns correct value for base stat 100 at level 50', () => {
    // floor((2*100*50)/100 + 5) = floor(100 + 5) = 105
    expect(calculateStat(100, 50)).toBe(105)
  })

  it('scales with level', () => {
    expect(calculateStat(49, 20)).toBeGreaterThan(calculateStat(49, 10))
  })
})

describe('buildPartyPokemon', () => {
  const bulbasaurData: PokemonData = {
    id: 1,
    name: 'Bulbasaur',
    types: ['grass', 'poison'],
    baseStats: { hp: 45, atk: 49, def: 49, spAtk: 65, spDef: 65, spd: 45 },
    catchRate: 45,
    baseExp: 64,
    evolvesAtLevel: 16,
    evolvesTo: 2,
    learnset: [
      { level: 1, moveId: 'tackle' },
      { level: 3, moveId: 'growl' },
      { level: 7, moveId: 'leech-seed' },
    ],
    gen: 1,
  }

  it('returns a PartyPokemon with correct pokemonId', () => {
    const party = buildPartyPokemon(bulbasaurData, 5)
    expect(party.pokemonId).toBe(1)
  })

  it('returns correct level', () => {
    const party = buildPartyPokemon(bulbasaurData, 5)
    expect(party.level).toBe(5)
  })

  it('returns correct maxHp (Bulbasaur base 45 at level 5)', () => {
    const party = buildPartyPokemon(bulbasaurData, 5)
    expect(party.maxHp).toBe(calculateMaxHp(45, 5))
    expect(party.maxHp).toBe(19)
  })

  it('sets currentHp equal to maxHp (full health)', () => {
    const party = buildPartyPokemon(bulbasaurData, 5)
    expect(party.currentHp).toBe(party.maxHp)
  })

  it('sets xp to expForLevel(level)', () => {
    const party = buildPartyPokemon(bulbasaurData, 5)
    expect(party.xp).toBe(expForLevel(5))
    expect(party.xp).toBe(125)
  })

  it('includes only moves learnable at or below the given level', () => {
    const party = buildPartyPokemon(bulbasaurData, 5)
    // tackle (lv1) and growl (lv3) are at or below 5; leech-seed (lv7) is not
    expect(party.moves.every(m => ['tackle', 'growl'].includes(m.moveId))).toBe(true)
    expect(party.moves.find(m => m.moveId === 'leech-seed')).toBeUndefined()
  })

  it('includes learnset moves at or above given level when level is high enough', () => {
    const party = buildPartyPokemon(bulbasaurData, 7)
    const moveIds = party.moves.map(m => m.moveId)
    expect(moveIds).toContain('leech-seed')
  })

  it('falls back to tackle when no moves are available at level 0', () => {
    const noMovePokemon: PokemonData = {
      ...bulbasaurData,
      learnset: [{ level: 5, moveId: 'tackle' }],
    }
    const party = buildPartyPokemon(noMovePokemon, 1)
    // level 1 < 5, so no learnset moves — fall back to tackle
    expect(party.moves[0].moveId).toBe('tackle')
  })

  it('sets status to null', () => {
    const party = buildPartyPokemon(bulbasaurData, 5)
    expect(party.status).toBeNull()
  })

  it('sets nickname to null', () => {
    const party = buildPartyPokemon(bulbasaurData, 5)
    expect(party.nickname).toBeNull()
  })
})
