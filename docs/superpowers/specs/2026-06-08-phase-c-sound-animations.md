# Phase C: Sound Effects, Background Music & Enhanced Battle Animations — Design Spec

**Goal:** Add audio feedback and richer battle visuals to make the game feel alive for Kayden and Kaylie. Zero new dependencies — all audio is procedural Web Audio API; all animations are CSS/React state.

**Tech Stack:** Web Audio API (no libraries), React 18 + TypeScript, Zustand (`battleStore`), existing patterns.

---

## Section 1: Sound Effects

### Architecture

File: `src/hooks/useGameAudio.ts`

A module-level singleton `AudioContext` is created once (lazy, on first sound call) so all sounds play with zero latency. The hook exposes a single `playSound(name: SoundName)` function. Components import the hook and call `playSound` directly — no context provider needed.

```typescript
export type SoundName =
  | 'hit' | 'playerHit' | 'correct' | 'wrong'
  | 'levelUp' | 'catch' | 'encounter' | 'evolve' | 'heal'

export function useGameAudio(): { playSound: (name: SoundName) => void }
```

### Sound Definitions

All sounds generated via oscillators + gain envelopes. No audio files.

| Name | Trigger | Implementation |
|------|---------|----------------|
| `hit` | Opponent takes damage | Square wave, 220→110 Hz, 0.15s |
| `playerHit` | Player takes damage | Sawtooth wave, 150→80 Hz, 0.2s |
| `correct` | Right answer | Sine wave, 440→660 Hz, 0.25s (two-tone rise) |
| `wrong` | Wrong answer | Square wave, 180 Hz, 0.3s with wobble |
| `levelUp` | Level up | Sine wave 3-note fanfare: 523→659→784 Hz, 0.15s each |
| `catch` | Pokéball shake + catch | Triangle 200→150→200 Hz rattle (3×), then sine ping 880 Hz |
| `encounter` | Wild encounter starts | Sawtooth stinger 330→440 Hz, 0.2s |
| `evolve` | Evolution overlay opens | Sine chord swell 261+329+392 Hz, 1.5s fade in |
| `heal` | Pokécenter heal | Sine 523→784→1047 Hz, soft 0.5s |

### Integration Points

- `Battle.tsx`: `playSound('hit')` when `opponentFlash` triggers; `playSound('playerHit')` when `playerFlash` triggers; `playSound('correct')` / `playSound('wrong')` in answer handler; `playSound('levelUp')` when `leveledUp` state fires; `playSound('catch')` when ball-catch animation starts; `playSound('evolve')` when evo overlay opens
- `WorldMap.tsx`: `playSound('encounter')` just before `navigate('/battle')`; `playSound('heal')` when pokécenter heal completes
- Both use the same hook instance (module singleton)

---

## Section 2: Background Music

### Architecture

File: `src/hooks/useBgm.ts`

Module-level singleton manages one looping BGM track at a time. Exposes `playBgm(track)` and `stopBgm()`. Track switches cross-fade over 0.5s (fade old out, fade new in).

```typescript
export type BgmTrack = 'overworld' | 'battle' | 'victory'
export function useBgm(): { playBgm: (track: BgmTrack) => void; stopBgm: () => void }
```

### Track Descriptions

All tracks loop seamlessly. Implemented as scheduled oscillator note sequences using `AudioContext.currentTime` offsets that repeat via a recursive scheduler.

| Track | Where | Feel | Tempo |
|-------|-------|------|-------|
| `overworld` | WorldMap | Cheerful major-key melody (C major pentatonic) | 120 BPM |
| `battle` | Battle screen | Faster, punchy, minor key tension | 160 BPM |
| `victory` | Win phase in battle | Short 4-bar jingle, then stops | One-shot |

### Integration Points

- `WorldMap.tsx`: `playBgm('overworld')` on mount; stops on unmount
- `Battle.tsx`: `playBgm('battle')` on mount; `playBgm('victory')` when `phase === 'win'`; stops on unmount
- Both hooks share the same module-level `AudioContext` instance from `useGameAudio`

### Volume

BGM gain: 0.18 (background). SFX gain: 0.5 (foreground). Both respect `AudioContext.state` — if browser suspends audio (iOS autoplay policy), a one-time `resume()` is called on first user interaction (DPad tap or button press).

---

## Section 3: Enhanced Battle Animations

### Player-Side Hit (mirrors existing opponent animations)

**New battleStore fields:**
```typescript
playerFlash: boolean      // white flash overlay on player sprite
playerShakeX: number      // horizontal offset in px (positive = rightward shake)
```

**New battleStore actions:** `setPlayerFlash(v: boolean)`, `setPlayerShakeX(n: number)`

**Trigger:** In `useBattleEngine.ts`, when the opponent's attack resolves and player HP drops, call the same shake/flash sequence that currently runs for opponent hits:
```
setPlayerFlash(true) → 150ms → setPlayerFlash(false)
setPlayerShakeX(8) → 80ms → setPlayerShakeX(-8) → 80ms → setPlayerShakeX(0)
```

**Render:** In `Battle.tsx`, apply to the player sprite div:
- `opacity`: `playerFlash ? 0.3 : 1` (same as existing `opponentFlash` pattern)
- `left`: `playerSpriteBaseLeft + playerShakeX` (same as existing `shakeX` on opponent)

### Damage Number Popup

**State:** Local `useState` in `Battle.tsx`:
```typescript
type DamagePopup = { id: number; amount: number; side: 'player' | 'opponent'; x: number; y: number }
const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([])
```

**Trigger:** Watch `opponentPokemon.currentHp` and `playerPokemon.currentHp` via `useEffect`. When either drops, calculate delta and push a new popup. Auto-remove after 900ms via `setTimeout`.

**Render:** Absolutely positioned over the battle canvas, `pointerEvents: none`, `zIndex: 20`. CSS keyframe animation `dmgFloat`: translate up 30px + fade out over 0.8s.

- Opponent damage: red `-XX` appears above opponent sprite position (~180px from left, ~100px from top)
- Player damage: yellow `-XX` appears above player sprite position (~60px from left, ~220px from top)

### HP Bar Danger Pulse

**Trigger:** When `currentHp / maxHp < 0.25`.

**Render:** Add a CSS keyframe `hpPulse` that animates the HP bar background-color between `#e82020` and `#ff6060` with a 0.8s cycle. Applied as an inline `animation` style on the HP bar fill div when HP is critical. Already has `transition: 'width 0.3s'` — pulse runs independently via keyframe so no conflict.

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/hooks/useGameAudio.ts` | New — procedural SFX via Web Audio API |
| `src/hooks/useBgm.ts` | New — looping BGM tracks via Web Audio API |
| `src/store/battleStore.ts` | Add `playerFlash`, `playerShakeX` fields + setters |
| `src/screens/Battle.tsx` | Wire SFX, BGM, player flash/shake, damage popups, HP pulse |
| `src/screens/WorldMap.tsx` | Wire overworld BGM + encounter SFX + heal SFX |
| `src/hooks/useBattleEngine.ts` | Trigger `playerFlash`/`playerShakeX` on player damage |
