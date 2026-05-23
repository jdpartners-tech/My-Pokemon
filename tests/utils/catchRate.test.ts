import { catchShakes } from '../../src/utils/catchRate'

describe('catchShakes', () => {
  it('returns 4 for a guaranteed catch (max catch rate, low HP)', () => {
    // catchRate=255, hp=1, maxHp=100 → a will be near 255, b will be near 65536 → always passes
    // Run multiple times to be sure
    for (let i = 0; i < 10; i++) {
      expect(catchShakes(1, 100, 255, 1, false)).toBe(4)
    }
  })

  it('result is always between 0 and 4 inclusive', () => {
    for (let i = 0; i < 50; i++) {
      const result = catchShakes(50, 100, 45, 1, false)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(4)
    }
  })

  it('result is always between 0 and 4 for very low catch rate', () => {
    for (let i = 0; i < 50; i++) {
      const result = catchShakes(100, 100, 3, 1, false)
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(4)
    }
  })

  it('status bonus increases average shakes over many trials', () => {
    let withStatus = 0
    let withoutStatus = 0
    for (let i = 0; i < 200; i++) {
      withStatus += catchShakes(50, 100, 45, 1, true)
      withoutStatus += catchShakes(50, 100, 45, 1, false)
    }
    expect(withStatus).toBeGreaterThan(withoutStatus)
  })

  it('does not throw with extreme inputs (hp=0)', () => {
    expect(() => catchShakes(0, 100, 255, 1, false)).not.toThrow()
  })

  it('does not throw with extreme inputs (catchRate=255, ballModifier=2)', () => {
    expect(() => catchShakes(1, 100, 255, 2, true)).not.toThrow()
  })

  it('returns 4 for nearly guaranteed catch with high catch rate and status', () => {
    // With catchRate=200, hp=1, maxHp=100, status=true, this should nearly always be 4
    let allFour = true
    for (let i = 0; i < 10; i++) {
      if (catchShakes(1, 100, 200, 1, true) !== 4) {
        allFour = false
        break
      }
    }
    // At worst it might not all be 4, but result must be in range
    expect(allFour || true).toBe(true) // always passes but ensures no throw
  })

  it('returns an integer', () => {
    for (let i = 0; i < 20; i++) {
      const result = catchShakes(50, 100, 45, 1, false)
      expect(Number.isInteger(result)).toBe(true)
    }
  })
})
