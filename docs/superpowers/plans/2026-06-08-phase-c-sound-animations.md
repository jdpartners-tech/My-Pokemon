# Phase C: Sound Effects, BGM & Enhanced Battle Animations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add procedural SFX and BGM via Web Audio API, and add an HP danger pulse to the battle screen.

**Architecture:** A shared `src/utils/audioContext.ts` exports the singleton `AudioContext`. Two hooks — `useGameAudio` (SFX) and `useBgm` (background music) — import from it. Sound triggers are wired via `useEffect` hooks in `Battle.tsx` and `WorldMap.tsx` watching existing store state. No new store fields needed — player flash/shake and damage popups are already implemented.

**Tech Stack:** Web Audio API (no new npm deps), React 18 + TypeScript, existing Zustand battleStore patterns.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/utils/audioContext.ts` | Create | Singleton AudioContext shared by both hooks |
| `src/hooks/useGameAudio.ts` | Create | Procedural SFX — 9 named sounds |
| `src/hooks/useBgm.ts` | Create | Looping BGM — overworld / battle / victory |
| `src/screens/Battle.tsx` | Modify | Wire SFX triggers + BGM + HP danger pulse |
| `src/screens/WorldMap.tsx` | Modify | Wire encounter SFX + heal SFX + overworld BGM |

---

## Task 1: Shared AudioContext utility

**Files:**
- Create: `src/utils/audioContext.ts`

- [ ] **Step 1: Create the file**

```typescript
let _ctx: AudioContext | null = null

export function getAudioCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext()
  if (_ctx.state === 'suspended') _ctx.resume().catch(() => {})
  return _ctx
}
```

- [ ] **Step 2: Type-check**

```bash
cd "C:\Users\derek\Documents\Project\My Pokemon"
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/utils/audioContext.ts
git commit -m "feat: shared AudioContext singleton for Web Audio API"
```

---

## Task 2: useGameAudio hook — procedural SFX

**Files:**
- Create: `src/hooks/useGameAudio.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useCallback } from 'react'
import { getAudioCtx } from '../utils/audioContext'

export type SoundName =
  | 'hit' | 'playerHit' | 'correct' | 'wrong'
  | 'levelUp' | 'catch' | 'encounter' | 'evolve' | 'heal'

function tone(
  ctx: AudioContext,
  type: OscillatorType,
  freq: number,
  endFreq: number,
  duration: number,
  gainVal: number,
  startOffset = 0,
) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.connect(g)
  g.connect(ctx.destination)
  osc.type = type
  const t = ctx.currentTime + startOffset
  osc.frequency.setValueAtTime(freq, t)
  if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration)
  g.gain.setValueAtTime(gainVal, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.start(t)
  osc.stop(t + duration + 0.01)
}

const SOUNDS: Record<SoundName, (ctx: AudioContext) => void> = {
  hit: (ctx) => tone(ctx, 'square', 220, 110, 0.15, 0.3),

  playerHit: (ctx) => tone(ctx, 'sawtooth', 150, 80, 0.2, 0.25),

  correct: (ctx) => {
    tone(ctx, 'sine', 440, 440, 0.12, 0.4)
    tone(ctx, 'sine', 660, 660, 0.2, 0.4, 0.13)
  },

  wrong: (ctx) => tone(ctx, 'square', 180, 150, 0.3, 0.2),

  levelUp: (ctx) => {
    tone(ctx, 'sine', 523, 523, 0.12, 0.4)
    tone(ctx, 'sine', 659, 659, 0.12, 0.4, 0.14)
    tone(ctx, 'sine', 784, 784, 0.28, 0.5, 0.28)
  },

  catch: (ctx) => {
    // 3× rattle, then ping
    for (let i = 0; i < 3; i++) {
      tone(ctx, 'triangle', 200, 150, 0.12, 0.25, i * 0.2)
      tone(ctx, 'triangle', 150, 200, 0.06, 0.15, i * 0.2 + 0.13)
    }
    tone(ctx, 'sine', 880, 880, 0.35, 0.5, 0.7)
  },

  encounter: (ctx) => tone(ctx, 'sawtooth', 330, 440, 0.22, 0.4),

  evolve: (ctx) => {
    const freqs = [261, 329, 392]
    freqs.forEach(f => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = f
      const t = ctx.currentTime
      g.gain.setValueAtTime(0.001, t)
      g.gain.linearRampToValueAtTime(0.15, t + 1.5)
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.5)
      osc.start(t)
      osc.stop(t + 2.6)
    })
  },

  heal: (ctx) => {
    const freqs = [523, 784, 1047]
    freqs.forEach((f, i) => tone(ctx, 'sine', f, f, 0.22, 0.3, i * 0.19))
  },
}

export function useGameAudio() {
  const playSound = useCallback((name: SoundName) => {
    try { SOUNDS[name](getAudioCtx()) } catch {}
  }, [])
  return { playSound }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useGameAudio.ts
git commit -m "feat: useGameAudio hook — 9 procedural SFX via Web Audio API"
```

---

## Task 3: useBgm hook — looping background music

**Files:**
- Create: `src/hooks/useBgm.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useCallback, useRef } from 'react'
import { getAudioCtx } from '../utils/audioContext'

export type BgmTrack = 'overworld' | 'battle' | 'victory'

// [frequency_hz, beats]  — 0 Hz = rest
type Note = [number, number]

const BGM: Record<BgmTrack, { notes: Note[]; bpm: number; loop: boolean }> = {
  overworld: {
    bpm: 120,
    loop: true,
    notes: [
      [523, 1], [392, 1], [440, 0.5], [523, 0.5], [329, 1],
      [392, 1], [261, 1], [329, 0.5], [392, 0.5], [523, 2],
      [440, 1], [523, 0.5], [392, 0.5], [329, 1], [261, 2],
    ],
  },
  battle: {
    bpm: 168,
    loop: true,
    notes: [
      [220, 0.5], [329, 0.5], [220, 0.5], [392, 0.5],
      [0,   0.25], [329, 0.25], [261, 0.5], [220, 1],
      [329, 0.5], [440, 0.5], [392, 0.5], [0, 0.25], [329, 0.75],
      [220, 0.5], [261, 0.5], [329, 1], [220, 2],
    ],
  },
  victory: {
    bpm: 120,
    loop: false,
    notes: [
      [261, 0.5], [329, 0.5], [392, 0.5], [523, 1],
      [392, 0.5], [523, 1.5],
    ],
  },
}

function scheduleNotes(
  ctx: AudioContext,
  masterGain: GainNode,
  notes: Note[],
  bpm: number,
  startAt: number,
): number {
  const beat = 60 / bpm
  let t = startAt
  for (const [freq, beats] of notes) {
    const dur = beats * beat
    if (freq > 0) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.connect(g)
      g.connect(masterGain)
      osc.type = 'triangle'
      osc.frequency.value = freq
      g.gain.setValueAtTime(0.35, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.88)
      osc.start(t)
      osc.stop(t + dur)
    }
    t += dur
  }
  return t // time when track ends
}

// Module-level singleton state
let masterGain: GainNode | null = null
let loopTimer: ReturnType<typeof setTimeout> | null = null
let activeTrack: BgmTrack | null = null

function stopLoop() {
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null }
  activeTrack = null
}

function startTrack(track: BgmTrack) {
  stopLoop()
  const ctx = getAudioCtx()
  if (!masterGain || masterGain.context !== ctx) {
    masterGain = ctx.createGain()
    masterGain.connect(ctx.destination)
  }
  masterGain.gain.cancelScheduledValues(ctx.currentTime)
  masterGain.gain.setValueAtTime(0.18, ctx.currentTime)

  const def = BGM[track]
  activeTrack = track

  function scheduleLoop(startAt: number) {
    const endAt = scheduleNotes(ctx, masterGain!, def.notes, def.bpm, startAt)
    if (def.loop && activeTrack === track) {
      // Re-schedule ~100ms before end so there is no gap
      const msUntilReschedule = Math.max(0, (endAt - ctx.currentTime - 0.1) * 1000)
      loopTimer = setTimeout(() => {
        if (activeTrack === track) scheduleLoop(endAt)
      }, msUntilReschedule)
    }
  }

  scheduleLoop(ctx.currentTime + 0.05)
}

function crossfadeTo(track: BgmTrack | null) {
  if (track === activeTrack) return
  const ctx = getAudioCtx()
  if (masterGain) {
    // Fade out over 0.5s
    masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime)
    masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5)
  }
  stopLoop()
  if (track) {
    setTimeout(() => startTrack(track), 500)
  }
}

export function useBgm() {
  const playBgm = useCallback((track: BgmTrack) => {
    try { crossfadeTo(track) } catch {}
  }, [])

  const stopBgm = useCallback(() => {
    try { crossfadeTo(null) } catch {}
  }, [])

  return { playBgm, stopBgm }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBgm.ts
git commit -m "feat: useBgm hook — overworld/battle/victory looping BGM via Web Audio API"
```

---

## Task 4: Wire SFX and BGM into Battle.tsx

**Files:**
- Modify: `src/screens/Battle.tsx`

The existing store already exposes `opponentFlash`, `playerFlash`, `leveledUp`, `ballAnimPhase`, `answerResult`, and `phase`. Wire sounds to these via `useEffect`.

- [ ] **Step 1: Read the current imports block of Battle.tsx**

Open `src/screens/Battle.tsx`. The import block starts at line 1. Note the last import line so you know where to append.

- [ ] **Step 2: Add hook imports**

After the existing imports, add:

```typescript
import { useGameAudio } from '../hooks/useGameAudio'
import { useBgm } from '../hooks/useBgm'
```

- [ ] **Step 3: Instantiate hooks inside the Battle component**

Find the line `const { selectMove, handleAnswer, useItemInBattle, attemptCatch, switchToPartyMember } = useBattleEngine()` (around line 442). After it, add:

```typescript
const { playSound } = useGameAudio()
const { playBgm, stopBgm } = useBgm()
```

- [ ] **Step 4: BGM — play battle track on mount, stop on unmount**

Find the existing `useEffect(() => { if (phase === 'idle') navigate('/map') }, [phase, navigate])` line (around line 520). After it, add:

```typescript
// BGM: battle track on mount, stop on unmount
useEffect(() => {
  playBgm('battle')
  return () => stopBgm()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- [ ] **Step 5: BGM — switch to victory on win**

After the BGM mount effect, add:

```typescript
// BGM: victory jingle when battle is won
useEffect(() => {
  if (phase === 'win') playBgm('victory')
}, [phase])
```

- [ ] **Step 6: SFX — opponent hit sound**

Find the existing `useEffect` for `opponentFlash` (around line 505 — the `handleOpponentHpShake` section). After that block, add:

```typescript
// SFX: opponent takes a hit
useEffect(() => {
  if (opponentFlash) playSound('hit')
}, [opponentFlash])
```

- [ ] **Step 7: SFX — player takes a hit**

After the opponent hit effect, add:

```typescript
// SFX: player takes a hit
useEffect(() => {
  if (playerFlash) playSound('playerHit')
}, [playerFlash])
```

- [ ] **Step 8: SFX — correct / wrong answer**

After the player hit effect, add:

```typescript
// SFX: answer result
useEffect(() => {
  if (!answerResult) return
  playSound(answerResult.wasCorrect ? 'correct' : 'wrong')
}, [answerResult])
```

- [ ] **Step 9: SFX — level up**

After the answer result effect, add:

```typescript
// SFX: level up
useEffect(() => {
  if (leveledUp) playSound('levelUp')
}, [leveledUp])
```

- [ ] **Step 10: SFX — Pokéball thrown (catch attempt)**

After the level up effect, add:

```typescript
// SFX: Pokéball catch sequence
useEffect(() => {
  if (ballAnimPhase === 1) playSound('catch')
}, [ballAnimPhase])
```

- [ ] **Step 11: SFX — evolution starts**

After the catch effect, add:

```typescript
// SFX: evolution begins
useEffect(() => {
  if (phase === 'evolving') playSound('evolve')
}, [phase])
```

- [ ] **Step 12: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 13: Commit**

```bash
git add src/screens/Battle.tsx
git commit -m "feat: wire SFX and BGM into Battle screen"
```

---

## Task 5: Wire SFX and BGM into WorldMap.tsx

**Files:**
- Modify: `src/screens/WorldMap.tsx`

- [ ] **Step 1: Add imports**

Find the existing import block in `src/screens/WorldMap.tsx`. After the last import line, add:

```typescript
import { useGameAudio } from '../hooks/useGameAudio'
import { useBgm } from '../hooks/useBgm'
```

- [ ] **Step 2: Instantiate hooks**

Find the line `const profile = useProfileStore(s => s.profile)` (around line 344). After the hook instantiations block (after `const { toastQueue, dismissToast } = useAchievements(...)`), add:

```typescript
const { playSound } = useGameAudio()
const { playBgm, stopBgm } = useBgm()
```

- [ ] **Step 3: Overworld BGM on mount / stop on unmount**

Find the existing `useEffect(() => { if (!profile?.id) return ... }, [profile?.id])` (the prefetch + visitedRoutes effect around line 396). After it, add:

```typescript
// BGM: overworld music
useEffect(() => {
  playBgm('overworld')
  return () => stopBgm()
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- [ ] **Step 4: Encounter SFX in flashAndNavigate**

Find `function flashAndNavigate(delayMs = 0)` (around line 1566). It calls `setBattleFlash(true)` then navigates. Add `playSound('encounter')` at the start of the function body:

```typescript
function flashAndNavigate(delayMs = 0) {
  playSound('encounter')
  // ... existing code unchanged ...
```

- [ ] **Step 5: Heal SFX in healParty**

Find `async function healParty()` (around line 1690). It ends with `setDialogue("Nurse Joy: ...")`. Add `playSound('heal')` just before or after `setDialogue`:

```typescript
  setDialogue("Nurse Joy: Your Pokémon have been healed! ♥")
  playSound('heal')
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/screens/WorldMap.tsx
git commit -m "feat: wire encounter SFX, heal SFX, and overworld BGM into WorldMap"
```

---

## Task 6: HP bar danger pulse

**Files:**
- Modify: `src/screens/Battle.tsx`

The `HpBar` component is defined as a local function inside `Battle()` around line 704. It already uses `hpBarColor(current, max)` which returns red below 25%.

- [ ] **Step 1: Add the @keyframes CSS and pulse logic to HpBar**

Find the `HpBar` component (around line 704):

```tsx
function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(1, current / max))
  const color = hpBarColor(current, max)
  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <div style={{ background: '#404030', height: 7, width: '100%' }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%', background: color,
          transition: 'width 0.3s',
        }} />
        {/* White gloss highlight — top 3px of filled bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: `${pct * 100}%`, height: 3,
          background: 'rgba(255,255,255,0.35)',
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}
```

Replace it with:

```tsx
function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(1, current / max))
  const color = hpBarColor(current, max)
  const danger = pct < 0.25 && pct > 0
  return (
    <div style={{ flex: 1, position: 'relative' }}>
      <style>{`
        @keyframes hpPulse {
          0%   { opacity: 1; }
          50%  { opacity: 0.45; }
          100% { opacity: 1; }
        }
      `}</style>
      <div style={{ background: '#404030', height: 7, width: '100%' }}>
        <div style={{
          width: `${pct * 100}%`, height: '100%', background: color,
          transition: 'width 0.3s',
          animation: danger ? 'hpPulse 0.8s ease-in-out infinite' : 'none',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: `${pct * 100}%`, height: 3,
          background: 'rgba(255,255,255,0.35)',
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Battle.tsx
git commit -m "feat: HP bar pulses red when below 25%"
```

---

## Task 7: Build and deploy

- [ ] **Step 1: Full build**

```bash
cd "C:\Users\derek\Documents\Project\My Pokemon"
npm run build
```

Expected: clean build, no TypeScript errors, bundle ~1MB.

- [ ] **Step 2: Copy to website repo**

```powershell
Copy-Item -Path "C:\Users\derek\Documents\Project\My Pokemon\dist\*" `
  -Destination "C:\Users\derek\Documents\Project\jd-partners-website\games\mypokemon\" `
  -Recurse -Force
```

- [ ] **Step 3: Clean up old bundles**

```powershell
$assetsDir = "C:\Users\derek\Documents\Project\jd-partners-website\games\mypokemon\assets"
$newJs  = Get-ChildItem $assetsDir -Filter "*.js"  | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$newCss = Get-ChildItem $assetsDir -Filter "*.css" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Get-ChildItem $assetsDir -Filter "*.js"  | Where-Object { $_.Name -ne $newJs.Name  } | Remove-Item -Force
Get-ChildItem $assetsDir -Filter "*.css" | Where-Object { $_.Name -ne $newCss.Name } | Remove-Item -Force
```

- [ ] **Step 4: Commit and push**

```bash
cd "C:\Users\derek\Documents\Project\jd-partners-website"
git add games/mypokemon/
git commit -m "feat: Phase C — SFX, BGM, HP danger pulse"
git push
```

Expected: GitHub Actions deploys to `https://www.jdpartners.co/games/mypokemon/`.
