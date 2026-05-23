export function catchShakes(
  currentHp: number,
  maxHp: number,
  catchRate: number,
  ballModifier: number = 1,
  hasStatus: boolean = false
): number {
  const statusBonus = hasStatus ? 1.5 : 1
  const hpFactor = (3 * maxHp - 2 * currentHp) / (3 * maxHp)
  const a = Math.max(1, Math.floor(catchRate * hpFactor * ballModifier * statusBonus))
  const b = Math.floor(65536 / Math.pow(255 / a, 0.1875))
  let shakes = 0
  for (let i = 0; i < 4; i++) {
    if (Math.floor(Math.random() * 65536) < b) shakes++
    else break
  }
  return shakes
}
