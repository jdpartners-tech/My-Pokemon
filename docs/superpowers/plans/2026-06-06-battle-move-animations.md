# Battle Move Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a type-specific projectile animation (arcing from attacker to target) plus a subtle arena colour tint when any Pokémon uses a move; contact moves (Normal/Fighting) show slash marks instead of a projectile.

**Architecture:** A new `projectileAnim` state in `battleStore.ts` is set by `useBattleEngine.ts` at the start of each attack. `Battle.tsx` watches this state with a `useEffect` that runs a 450ms `requestAnimationFrame` loop — drawing the projectile on a dedicated canvas and fading an arena-tint `<div>` via direct DOM ref. At 80% progress (360ms) the existing `setHitEffect` fires so the impact burst overlaps the projectile's arrival. The engine also keeps its `setHitEffect` call but adds a `delay(360)` before it so the projectile travels first.

**Tech Stack:** React 18 + TypeScript, Zustand, HTML Canvas 2D API, `requestAnimationFrame`

---

## File Map

| File | Change |
|---|---|
| `src/store/battleStore.ts` | Add `projectileAnim` state + `setProjectileAnim` + `clearProjectileAnim` |
| `src/hooks/useBattleEngine.ts` | Call `setProjectileAnim` before damage, add `delay(360)` before `setHitEffect`, `clearProjectileAnim` after |
| `src/screens/Battle.tsx` | Add `TYPE_TINT` map, `drawProjectile()` function, `projCanvasRef`, `arenaTintRef`, projectile `useEffect`, arena tint `<div>`, projectile `<canvas>` |

---

### Task 1: Add projectileAnim state to battleStore.ts

**Files:**
- Modify: `src/store/battleStore.ts:92-94` (after existing `hitEffect` block)
- Modify: `src/store/battleStore.ts:132` (initialState)
- Modify: `src/store/battleStore.ts:292-293` (after setHitEffect/clearHitEffect implementations)

- [ ] **Step 1: Add the type + interface entries**

In `src/store/battleStore.ts`, after the `hitEffect` block (line 94), add:

```typescript
  projectileAnim: { moveType: string; forOpponent: boolean } | null
  setProjectileAnim: (moveType: string, forOpponent: boolean) => void
  clearProjectileAnim: () => void
```

The full hitEffect + projectileAnim block in the interface should look like:

```typescript
  hitEffect: { moveType: string; forOpponent: boolean } | null
  setHitEffect: (moveType: string, forOpponent: boolean) => void
  clearHitEffect: () => void

  projectileAnim: { moveType: string; forOpponent: boolean } | null
  setProjectileAnim: (moveType: string, forOpponent: boolean) => void
  clearProjectileAnim: () => void
```

- [ ] **Step 2: Add projectileAnim to initialState**

In the `initialState` object (around line 132), after `hitEffect: null,` add:

```typescript
  hitEffect: null,
  projectileAnim: null,
```

- [ ] **Step 3: Add the implementations**

After `clearHitEffect: () => set({ hitEffect: null }),` (line 293), add:

```typescript
  setProjectileAnim: (moveType, forOpponent) => set({ projectileAnim: { moveType, forOpponent } }),
  clearProjectileAnim: () => set({ projectileAnim: null }),
```

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```
git add src/store/battleStore.ts
git commit -m "feat: add projectileAnim state to battleStore"
```

---

### Task 2: Wire setProjectileAnim in useBattleEngine.ts

The player attack path starts around line 178; the opponent attack path starts around line 334. Both currently call `store.setHitEffect(...)` inside the damage loop immediately before `setOpponentFlash`/`setPlayerFlash`. We keep those calls but push them 360ms later (letting the projectile travel first), and only do this for the first hit of multi-hit moves.

**Files:**
- Modify: `src/hooks/useBattleEngine.ts:178-212` (player attack block)
- Modify: `src/hooks/useBattleEngine.ts:334-355` (opponent attack block)

- [ ] **Step 1: Update the player attack damage loop**

Find the block starting with `// Player attack lurch` (line 178). The current code is:

```typescript
      // Player attack lurch
      store.setPlayerAttacking(true)
      await delay(220)
      store.setPlayerAttacking(false)
      // ... type effectiveness calc ...
      // Multi-hit
      const fx = moveInfo?.effect
      const hits = fx?.min_hits != null && fx?.max_hits != null
        ? fx.min_hits + Math.floor(Math.random() * (fx.max_hits - fx.min_hits + 1))
        : 1
      let totalDmg = 0
      let didCrit = false
      for (let h = 0; h < hits; h++) {
        const isCrit = Math.random() < (1 / 16)
        if (isCrit) didCrit = true
        const baseDmg = calculateDamage(playerPokemon.level, moveInfo?.power ?? 0, atkStat, defStat, eff)
        const singleDmg = isCrit ? Math.floor(baseDmg * 1.5) : baseDmg
        store.dealDamageToOpponent(singleDmg)
        totalDmg += singleDmg
        store.showDamagePopup(singleDmg, true)
        store.setHitEffect(moveInfo?.type ?? 'normal', true)
        store.setOpponentFlash(true)
        await delay(120)
        store.setOpponentFlash(false)
        if (hits > 1) await delay(80)
      }
```

Replace the `for` loop body so that the projectile plays only on the first hit:

```typescript
      for (let h = 0; h < hits; h++) {
        const isCrit = Math.random() < (1 / 16)
        if (isCrit) didCrit = true
        const baseDmg = calculateDamage(playerPokemon.level, moveInfo?.power ?? 0, atkStat, defStat, eff)
        const singleDmg = isCrit ? Math.floor(baseDmg * 1.5) : baseDmg
        // First hit: play projectile animation before dealing damage
        if (h === 0) {
          store.setProjectileAnim(moveInfo?.type ?? 'normal', true)
          await delay(360)
        }
        store.dealDamageToOpponent(singleDmg)
        totalDmg += singleDmg
        store.showDamagePopup(singleDmg, true)
        store.setHitEffect(moveInfo?.type ?? 'normal', true)
        store.setOpponentFlash(true)
        await delay(120)
        store.setOpponentFlash(false)
        if (h === 0) store.clearProjectileAnim()
        if (hits > 1) await delay(80)
      }
```

- [ ] **Step 2: Update the opponent attack damage loop**

Find the block starting with `// Opponent lurch toward player` (line 334). The current inner loop is:

```typescript
    for (let h = 0; h < hits; h++) {
      const singleDmg = calculateDamage(opponentPokemon.level, moveInfo?.power ?? 0, atkStat, defStat, eff)
      store.dealDamageToPlayer(singleDmg)
      totalDmg += singleDmg
      store.showDamagePopup(singleDmg, false)
      store.setHitEffect(moveInfo?.type ?? 'normal', false)
      store.setPlayerFlash(true)
      await delay(120)
      store.setPlayerFlash(false)
      if (hits > 1) await delay(80)
    }
```

Replace with:

```typescript
    for (let h = 0; h < hits; h++) {
      const singleDmg = calculateDamage(opponentPokemon.level, moveInfo?.power ?? 0, atkStat, defStat, eff)
      if (h === 0) {
        store.setProjectileAnim(moveInfo?.type ?? 'normal', false)
        await delay(360)
      }
      store.dealDamageToPlayer(singleDmg)
      totalDmg += singleDmg
      store.showDamagePopup(singleDmg, false)
      store.setHitEffect(moveInfo?.type ?? 'normal', false)
      store.setPlayerFlash(true)
      await delay(120)
      store.setPlayerFlash(false)
      if (h === 0) store.clearProjectileAnim()
      if (hits > 1) await delay(80)
    }
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```
git add src/hooks/useBattleEngine.ts
git commit -m "feat: trigger projectileAnim before each attack hit"
```

---

### Task 3: Add TYPE_TINT map and drawProjectile function to Battle.tsx

This adds two things just above the existing `drawHitEffect` function (line 105):
1. A `TYPE_TINT` record mapping move type → RGBA tint colour string
2. A `drawProjectile` function that handles both contact (slash) and ranged (projectile arc + trail) animations

**Files:**
- Modify: `src/screens/Battle.tsx:105` (insert before `drawHitEffect`)

- [ ] **Step 1: Add TYPE_TINT map**

Insert before the `// ── type-based hit effect renderer` comment (line 105):

```typescript
// ── Move type → arena tint colour ─────────────────────────────────────────
const TYPE_TINT: Record<string, string> = {
  fire:     'rgba(255,80,0,0.18)',
  water:    'rgba(60,140,255,0.18)',
  electric: 'rgba(255,220,0,0.18)',
  grass:    'rgba(60,200,60,0.18)',
  ice:      'rgba(180,240,255,0.18)',
  psychic:  'rgba(255,80,180,0.18)',
  poison:   'rgba(160,40,200,0.18)',
  ghost:    'rgba(60,0,100,0.22)',
  dragon:   'rgba(180,40,0,0.18)',
  dark:     'rgba(20,0,40,0.25)',
  rock:     'rgba(160,110,40,0.18)',
  ground:   'rgba(180,140,60,0.18)',
  flying:   'rgba(180,220,255,0.15)',
  steel:    'rgba(180,180,200,0.18)',
  fairy:    'rgba(255,140,200,0.18)',
  bug:      'rgba(140,200,0,0.18)',
  normal:   'rgba(255,255,255,0.12)',
  fighting: 'rgba(255,200,80,0.18)',
}

const CONTACT_TYPES = new Set(['normal', 'fighting'])
```

- [ ] **Step 2: Add drawProjectile function**

Insert directly after the `TYPE_TINT` block (before `drawHitEffect`):

```typescript
// ── Projectile animation renderer (pure, no hooks) ────────────────────────
// p = 0→1 progress. Contact types draw slash marks at (x1,y1).
// Ranged types arc a type-coloured projectile from (x0,y0) to (x1,y1).
function drawProjectile(
  ctx: CanvasRenderingContext2D,
  type: string,
  x0: number, y0: number,
  x1: number, y1: number,
  p: number
) {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  if (CONTACT_TYPES.has(type)) {
    // Slash marks fan out at the target
    const col = type === 'fighting' ? 'rgba(255,200,80,' : 'rgba(255,255,255,'
    const expand = Math.min(1, p * 2.5)
    const fade = Math.max(0, 1 - p * 1.2)
    const angles = [-0.6, 0, 0.6]
    for (const a of angles) {
      const len = 28 * expand
      ctx.save()
      ctx.translate(x1, y1)
      ctx.rotate(Math.PI / 4 + a)
      ctx.strokeStyle = col + fade + ')'
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-len / 2, 0)
      ctx.lineTo(len / 2, 0)
      ctx.stroke()
      ctx.restore()
    }
    return
  }

  // Ranged: arc trajectory
  const arcDir = y1 < y0 ? -1 : 1  // upward arc when attacking upward
  const arcH = 22
  const bx = lerp(x0, x1, p)
  const by = lerp(y0, y1, p) - arcH * Math.sin(p * Math.PI) * arcDir

  // Type-specific colours
  type TypeColors = { ball: string; core: string; trail: string }
  const colors: Record<string, TypeColors> = {
    fire:     { ball: '#ff5000', core: '#ffcc00', trail: '#ff8000' },
    water:    { ball: '#3090ff', core: '#a0d8ff', trail: '#60b0ff' },
    electric: { ball: '#ffe000', core: '#ffffff', trail: '#ffd000' },
    grass:    { ball: '#40c840', core: '#c0ffc0', trail: '#60e060' },
    ice:      { ball: '#a0e8ff', core: '#ffffff', trail: '#c0f0ff' },
    psychic:  { ball: '#ff50b4', core: '#ffc0e8', trail: '#ff80c8' },
    poison:   { ball: '#a028c8', core: '#e080ff', trail: '#c050e0' },
    ghost:    { ball: '#400060', core: '#9040c0', trail: '#600090' },
    dragon:   { ball: '#e04000', core: '#ff8000', trail: '#c800c8' },
    dark:     { ball: '#181028', core: '#604080', trail: '#301848' },
    rock:     { ball: '#a07028', core: '#d0b060', trail: '#c09040' },
    ground:   { ball: '#b48c3c', core: '#e8c870', trail: '#c8a050' },
    flying:   { ball: '#b4dcff', core: '#ffffff', trail: '#d0ecff' },
    steel:    { ball: '#b4b4c8', core: '#e0e0f0', trail: '#c8c8dc' },
    fairy:    { ball: '#ff8cc8', core: '#ffd0e8', trail: '#ffaad8' },
    bug:      { ball: '#8cc800', core: '#d0ff60', trail: '#aae010' },
  }
  const c = colors[type] ?? { ball: '#ffffff', core: '#ffffff', trail: '#dddddd' }

  // Trail dots (draw from behind the projectile)
  const TRAIL_STEPS = 6
  for (let i = TRAIL_STEPS; i >= 1; i--) {
    const tp = Math.max(0, p - i * 0.055)
    const tx = lerp(x0, x1, tp)
    const ty = lerp(y0, y1, tp) - arcH * Math.sin(tp * Math.PI) * arcDir
    const alpha = (1 - i / TRAIL_STEPS) * (1 - p * 0.4) * 0.65
    const radius = Math.max(1, (7 - i) * (1 - p * 0.3))
    ctx.beginPath()
    ctx.arc(tx, ty, radius, 0, Math.PI * 2)
    ctx.fillStyle = c.trail + Math.round(alpha * 255).toString(16).padStart(2, '0').slice(-2)
    // Use rgba instead for readability:
    const ta = Math.round(alpha * 255)
    const tr = parseInt(c.trail.slice(1, 3), 16)
    const tg = parseInt(c.trail.slice(3, 5), 16)
    const tb2 = parseInt(c.trail.slice(5, 7), 16)
    ctx.fillStyle = `rgba(${tr},${tg},${tb2},${alpha.toFixed(2)})`
    ctx.fill()
  }

  // Projectile ball
  const ballR = 7
  ctx.beginPath()
  ctx.arc(bx, by, ballR, 0, Math.PI * 2)
  ctx.fillStyle = c.ball
  ctx.fill()
  // Core highlight
  ctx.beginPath()
  ctx.arc(bx - 2, by - 2, ballR * 0.45, 0, Math.PI * 2)
  ctx.fillStyle = c.core
  ctx.fill()
}
```

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```
git add src/screens/Battle.tsx
git commit -m "feat: add TYPE_TINT map and drawProjectile canvas function"
```

---

### Task 4: Wire the projectile animation in Battle.tsx (canvas + tint + useEffect + JSX)

This adds the runtime plumbing: a ref to a new canvas, a ref to the arena-tint div (so we can set opacity imperatively without React re-renders), and a `useEffect` that drives the rAF loop.

**Files:**
- Modify: `src/screens/Battle.tsx` — refs section (~line 321), useEffect section (~line 372), JSX section (~line 744)

- [ ] **Step 1: Add projCanvasRef and arenaTintRef**

After the existing refs block (around line 324, after `hitRafRef`):

```typescript
  const projCanvasRef = useRef<HTMLCanvasElement>(null)
  const projRafRef = useRef<number>(0)
  const arenaTintRef = useRef<HTMLDivElement>(null)
  const projectileAnim = useBattleStore(s => s.projectileAnim)
```

- [ ] **Step 2: Add the projectile useEffect**

After the existing hit effect useEffect (which ends around line 392), add:

```typescript
  // Projectile animation
  useEffect(() => {
    if (!projectileAnim) {
      // Clear canvas and tint when animation ends
      const canvas = projCanvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, W, SKY_H)
      }
      if (arenaTintRef.current) arenaTintRef.current.style.opacity = '0'
      return
    }

    const canvas = projCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    cancelAnimationFrame(projRafRef.current)

    // Source and destination centres for player-attacks-opponent vs opponent-attacks-player
    const x0 = projectileAnim.forOpponent ? 90  : 259
    const y0 = projectileAnim.forOpponent ? 140 : 55
    const x1 = projectileAnim.forOpponent ? 259 : 90
    const y1 = projectileAnim.forOpponent ? 85  : 170

    const DURATION_MS = 450
    const startTs = performance.now()

    function frame(ts: number) {
      const p = Math.min(1, (ts - startTs) / DURATION_MS)

      ctx.clearRect(0, 0, W, SKY_H)
      drawProjectile(ctx, projectileAnim!.moveType, x0, y0, x1, y1, p)

      // Arena tint: ramp 0→1 over first 40% then hold until 90% then fade
      let tintOpacity = 0
      if (p < 0.4) tintOpacity = p / 0.4
      else if (p < 0.9) tintOpacity = 1
      else tintOpacity = (1 - p) / 0.1
      if (arenaTintRef.current) {
        arenaTintRef.current.style.opacity = String(Math.min(1, tintOpacity))
      }

      if (p < 1) {
        projRafRef.current = requestAnimationFrame(frame)
      } else {
        ctx.clearRect(0, 0, W, SKY_H)
        if (arenaTintRef.current) arenaTintRef.current.style.opacity = '0'
      }
    }

    projRafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(projRafRef.current)
  }, [projectileAnim])
```

- [ ] **Step 3: Add arena tint div and projectile canvas to JSX**

Find the `{/* Hit effect animation canvas */}` comment (around line 744). Insert the arena tint div and projectile canvas **before** it:

```tsx
        {/* Arena tint overlay — opacity set imperatively by projectile rAF */}
        <div
          ref={arenaTintRef}
          style={{
            position: 'absolute', inset: 0, height: SKY_H,
            background: projectileAnim ? (TYPE_TINT[projectileAnim.moveType] ?? 'rgba(255,255,255,0.12)') : 'transparent',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 6,
          }}
        />

        {/* Projectile animation canvas — sits above arena, below sprites */}
        <canvas
          ref={projCanvasRef}
          width={W}
          height={SKY_H}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7 }}
        />

        {/* Hit effect animation canvas */}
        <canvas
          ref={hitCanvasRef}
          ...
```

(Leave the existing hitCanvasRef canvas exactly as-is — only insert before it.)

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```
git add src/screens/Battle.tsx
git commit -m "feat: wire projectile canvas + arena tint + useEffect in Battle.tsx"
```

---

### Task 5: Visual verification and deploy

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Open: http://localhost:5173/games/my-pokemon/

- [ ] **Step 2: Enter a wild battle and verify animation**

1. Walk into grass until a wild battle starts
2. Select a move and answer the question correctly
3. Confirm: attacker lurch → fireball/projectile arcs across → arena tints matching type colour → impact burst fires at target → tint fades
4. Answer incorrectly — confirm opponent's move also shows the projectile traveling toward the player

- [ ] **Step 3: Test a Normal-type move (contact)**

If the player has a Normal-type move (e.g., Tackle, Scratch), use it and confirm slash marks appear at the opponent, not a ball projectile.

- [ ] **Step 4: TypeScript final check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build succeeds (chunk size warning is OK, not an error)

- [ ] **Step 6: Deploy**

```powershell
Copy-Item "dist\*" "C:\Users\derek\Documents\Project\jd-partners-website\games\my-pokemon\" -Recurse -Force
cd "C:\Users\derek\Documents\Project\jd-partners-website"
git add games/my-pokemon
git commit -m "feat(my-pokemon): type-based projectile battle animations"
git push
```

---

## Self-Review

**Spec coverage:**
- ✅ Projectile arc from attacker to target: `drawProjectile` + projectile useEffect
- ✅ Arena tint during travel: `arenaTintRef` driven by rAF, colour from `TYPE_TINT`
- ✅ Contact types (Normal/Fighting) show slash marks: `CONTACT_TYPES` check in `drawProjectile`
- ✅ Sequence: lurch → projectile(360ms) → hitEffect → flash/shake: Task 2 engine changes
- ✅ All 16 type tints + 2 contact types: TYPE_TINT covers all 18
- ✅ Projectile shapes per type: `colors` map in `drawProjectile`
- ✅ Only first hit of multi-hit moves plays projectile: `if (h === 0)` guard in Task 2

**Placeholder scan:** None found.

**Type consistency:**
- `projectileAnim: { moveType: string; forOpponent: boolean } | null` — used consistently in store, engine, and component
- `drawProjectile(ctx, type, x0, y0, x1, y1, p)` — signature consistent between definition (Task 3) and call site (Task 4)
- `projCanvasRef`, `projRafRef`, `arenaTintRef` — defined in Task 4 Step 1, used in Task 4 Steps 2–3
- `TYPE_TINT` — defined in Task 3 Step 1, referenced in Task 4 Step 3 JSX
- `CONTACT_TYPES` — defined in Task 3 Step 1, used in Task 3 Step 2 `drawProjectile`
