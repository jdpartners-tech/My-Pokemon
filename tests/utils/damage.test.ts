import { getTypeEffectiveness, calculateDamage, applyBurnPenalty } from '../../src/utils/damage'

describe('getTypeEffectiveness', () => {
  it('returns 2 for fire vs grass (super effective)', () => {
    expect(getTypeEffectiveness('fire', ['grass'])).toBe(2)
  })

  it('returns 0 for normal vs ghost (no effect)', () => {
    expect(getTypeEffectiveness('normal', ['ghost'])).toBe(0)
  })

  it('returns 2 for water vs fire (super effective)', () => {
    expect(getTypeEffectiveness('water', ['fire'])).toBe(2)
  })

  it('returns 0.5 for grass vs fire (not very effective)', () => {
    expect(getTypeEffectiveness('grass', ['fire'])).toBe(0.5)
  })

  it('returns 1 for neutral matchup', () => {
    expect(getTypeEffectiveness('normal', ['normal'])).toBe(1)
  })

  it('returns 4 for double super effective (two weak types)', () => {
    // water vs fire/rock = 2 * 2 = 4
    expect(getTypeEffectiveness('water', ['fire', 'rock'])).toBe(4)
  })

  it('returns 0.25 for double not very effective', () => {
    // fire vs water/rock = 0.5 * 0.5 = 0.25
    expect(getTypeEffectiveness('fire', ['water', 'rock'])).toBe(0.25)
  })

  it('returns 0 when one of multiple types is immune', () => {
    // normal vs ghost/normal — ghost makes it 0
    expect(getTypeEffectiveness('normal', ['ghost', 'normal'])).toBe(0)
  })
})

describe('calculateDamage', () => {
  it('returns 0 for a zero power move', () => {
    expect(calculateDamage(50, 0, 100, 100, 1)).toBe(0)
  })

  it('returns 0 when effectiveness is 0 (immune)', () => {
    expect(calculateDamage(50, 80, 100, 100, 0)).toBe(0)
  })

  it('returns a positive number for a normal attack', () => {
    const result = calculateDamage(50, 80, 100, 100, 1)
    expect(result).toBeGreaterThan(0)
  })

  it('returns more damage for super effective vs neutral', () => {
    // Run multiple times to account for randomness: super effective (2x) should always beat neutral
    // The difference is large enough (2x base) that even with random factor (0.85–1.0) it should hold
    const superEffective = calculateDamage(50, 80, 100, 100, 2)
    const neutral = calculateDamage(50, 80, 100, 100, 1)
    // Even at worst case, 2x effective with 0.85 factor = 1.7x neutral's max (1.0 factor)
    // So we just verify that super effective is bigger (may occasionally fail if random is extreme)
    // Instead, verify deterministically: min super-effective > max neutral
    // neutral max: base * 1 * 1.0; super-effective min: base * 2 * 0.85 = 1.7 * base
    // So always true. Let's just verify by sampling many results.
    let seSum = 0
    let neutralSum = 0
    for (let i = 0; i < 100; i++) {
      seSum += calculateDamage(50, 80, 100, 100, 2)
      neutralSum += calculateDamage(50, 80, 100, 100, 1)
    }
    expect(seSum).toBeGreaterThan(neutralSum)
  })

  it('result is always at least 1 for non-zero effectiveness', () => {
    for (let i = 0; i < 20; i++) {
      const result = calculateDamage(50, 80, 100, 100, 1)
      expect(result).toBeGreaterThanOrEqual(1)
    }
  })

  it('result is within a reasonable range for level 50, power 80', () => {
    const result = calculateDamage(50, 80, 100, 100, 1)
    // base = floor((floor(20+2)*80*100)/100/50)+2 = floor(floor(22*80/50))+2
    // = floor(floor(1760/50))+2 = floor(35.2)+2 = 37
    // randomFactor in [0.85, 1.0] => floor(37 * factor) in [31, 37]
    expect(result).toBeGreaterThanOrEqual(31)
    expect(result).toBeLessThanOrEqual(37)
  })
})

describe('applyBurnPenalty', () => {
  it('halves 100 to 50', () => {
    expect(applyBurnPenalty(100)).toBe(50)
  })

  it('applies floor division: 55 becomes 27', () => {
    expect(applyBurnPenalty(55)).toBe(27)
  })

  it('halves 1 to 0 (floor)', () => {
    expect(applyBurnPenalty(1)).toBe(0)
  })

  it('halves 80 to 40', () => {
    expect(applyBurnPenalty(80)).toBe(40)
  })
})
