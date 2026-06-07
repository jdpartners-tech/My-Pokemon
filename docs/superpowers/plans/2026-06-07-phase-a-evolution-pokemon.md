# Phase A: Evolution + More Pokemon — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up full-screen evolution animation with tap-to-continue, and add 27 Gen 2 Pokemon to data + wild encounter tables.

**Architecture:** Evolution trigger already exists in `useBattleEngine.ts` but uses a hardcoded delay — replace with a Promise that waits for user tap. Battle.tsx already has sprite animation hooks (`evoStage`) — extend with full-screen overlay. Gen 2 Pokemon data goes into `pokemon.json`; placement goes into map `wildPokemon` arrays.

**Tech Stack:** React 18 + TypeScript, Zustand (`battleStore`), PokeAPI CDN sprites (auto-work by ID — no local files needed), existing `exp.ts` helpers.

---

## File Structure

| File | Change |
|------|--------|
| `src/store/battleStore.ts` | Add `pendingEvolution`, `resolveEvolution`, `acknowledgeEvolution` |
| `src/hooks/useBattleEngine.ts` | Replace `delay(2400)` with Promise wait; set `pendingEvolution` before phase change |
| `src/screens/Battle.tsx` | Add `'done'` evoStage; add full-screen evolution overlay |
| `src/data/pokemon.json` | Append 27 Gen 2 entries |
| `src/maps/flowerMeadow.ts` | Add Hoppip, Espeon, Chikorita |
| `src/maps/viridianForest.ts` | Add Spinarak, Heracross |
| `src/maps/rockyCave.ts` | Add Larvitar, Umbreon |
| `src/maps/trainerRoad.ts` | Add Snubbull |
| `src/maps/mistyLake.ts` | Add Totodile, Marill, Wooper |
| `src/maps/volcanoTrail.ts` | Add Cyndaquil, Magby, Tyranitar |

---

## Task 1: battleStore — pendingEvolution + acknowledgeEvolution

**Files:**
- Modify: `src/store/battleStore.ts`

- [ ] **Step 1: Add fields to BattleState interface**

In `src/store/battleStore.ts`, add these lines inside the `interface BattleState {` block, after the `battleBanner` line:

```typescript
  pendingEvolution: { fromId: number; toId: number } | null
  resolveEvolution: (() => void) | null
  setPendingEvolution: (e: { fromId: number; toId: number } | null) => void
  setResolveEvolution: (fn: (() => void) | null) => void
  acknowledgeEvolution: () => void
```

- [ ] **Step 2: Add to initialState**

In the `const initialState = {` block, after `battleBanner: null,`:

```typescript
  pendingEvolution: null,
  resolveEvolution: null,
```

- [ ] **Step 3: Add implementations in create()**

In the `export const useBattleStore = create<BattleState>((set) => ({` block, after `setBattleBanner: (s) => set({ battleBanner: s }),`:

```typescript
  setPendingEvolution: (e) => set({ pendingEvolution: e }),
  setResolveEvolution: (fn) => set({ resolveEvolution: fn }),
  acknowledgeEvolution: () => set(state => {
    state.resolveEvolution?.()
    return { resolveEvolution: null }
  }),
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "C:\Users\derek\Documents\Project\My Pokemon"
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/store/battleStore.ts
git commit -m "feat: add pendingEvolution + acknowledgeEvolution to battleStore"
```

---

## Task 2: useBattleEngine — Promise-based evolution wait

**Files:**
- Modify: `src/hooks/useBattleEngine.ts` (around line 442)

The existing code in `handleWin()` is:
```typescript
      if (
        pokeInfo?.evolvesAtLevel &&
        newLevel >= pokeInfo.evolvesAtLevel &&
        pokeInfo.evolvesTo != null
      ) {
        const evolvedData = pokemonMap[pokeInfo.evolvesTo]
        store.setPhase('evolving')
        await delay(2400)
        store.evolvePlayer(pokeInfo.evolvesTo, evolvedData?.name ?? getName(playerPokemon))
        store.addLog(`${getName(playerPokemon)} evolved into ${evolvedData?.name ?? 'a new form'}!`)
        await delay(600)
      }
```

- [ ] **Step 1: Replace the evolution block**

Replace the entire block above with:

```typescript
      if (
        pokeInfo?.evolvesAtLevel &&
        newLevel >= pokeInfo.evolvesAtLevel &&
        pokeInfo.evolvesTo != null
      ) {
        const evolvedData = pokemonMap[pokeInfo.evolvesTo]
        store.setPendingEvolution({ fromId: playerPokemon.pokemonId, toId: pokeInfo.evolvesTo })
        store.setPhase('evolving')
        // Wait for the player to tap Continue on the evolution overlay
        await new Promise<void>(resolve => store.setResolveEvolution(resolve))
        store.evolvePlayer(pokeInfo.evolvesTo, evolvedData?.name ?? getName(playerPokemon))
        store.addLog(`${getName(playerPokemon)} evolved into ${evolvedData?.name ?? 'a new form'}!`)
        store.setPendingEvolution(null)
        await delay(400)
      }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBattleEngine.ts
git commit -m "feat: evolution waits for player tap instead of hardcoded delay"
```

---

## Task 3: Battle.tsx — full-screen evolution overlay

**Files:**
- Modify: `src/screens/Battle.tsx`

- [ ] **Step 1: Add pendingEvolution to the useBattleStore destructure**

Find the destructure block (around line 435) that reads:
```typescript
    isWildBattle, ballAnimPhase, ballCaught, party, answerResult,
    trainerSpriteCol, trainerSpriteRow,
    damagePopup, battleBanner, trainerName,
  } = useBattleStore()
```

Change it to:
```typescript
    isWildBattle, ballAnimPhase, ballCaught, party, answerResult,
    trainerSpriteCol, trainerSpriteRow,
    damagePopup, battleBanner, trainerName, pendingEvolution,
  } = useBattleStore()
```

- [ ] **Step 2: Change evoStage type to include 'done'**

Find the line:
```typescript
  const [evoStage, setEvoStage] = useState<'none' | 'silhouette' | 'flash' | 'reveal'>('none')
```

Replace with:
```typescript
  const [evoStage, setEvoStage] = useState<'none' | 'silhouette' | 'flash' | 'reveal' | 'done'>('none')
```

- [ ] **Step 3: Change the 2800ms timer from 'none' to 'done'**

Find:
```typescript
    // Stage 4: glow fades out (2800ms)
    timers.push(setTimeout(() => setEvoStage('none'), 2800))
```

Replace with:
```typescript
    // Stage 4: glow fades, show congratulations (2800ms)
    timers.push(setTimeout(() => setEvoStage('done'), 2800))
```

- [ ] **Step 4: Add the full-screen evolution overlay**

Find the closing comment and div just before `</div>` at the end of the component (around line 1443):
```typescript
    {/* ── Evolution flash burst ── */}
    {evoStage === 'flash' && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
        background: 'white',
        animation: 'evoFlash 0.35s ease-out forwards',
      }} />
    )}
    </div>
  )
}
```

Replace with:
```typescript
    {/* ── Evolution flash burst ── */}
    {evoStage === 'flash' && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
        background: 'white',
        animation: 'evoFlash 0.35s ease-out forwards',
      }} />
    )}

    {/* ── Full-screen evolution overlay ── */}
    {phase === 'evolving' && pendingEvolution && (
      <div
        onClick={evoStage === 'done' ? () => useBattleStore.getState().acknowledgeEvolution() : undefined}
        onTouchEnd={evoStage === 'done' ? (e) => { e.preventDefault(); useBattleStore.getState().acknowledgeEvolution() } : undefined}
        style={{
          position: 'fixed', inset: 0, zIndex: 55,
          background: '#000',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          cursor: evoStage === 'done' ? 'pointer' : 'default',
        }}
      >
        <div style={{
          color: '#fff', fontSize: 20, fontFamily: 'Georgia, serif',
          marginBottom: 28, textAlign: 'center', padding: '0 24px',
        }}>
          {evoStage === 'done'
            ? `✨ ${pokemonDataMap[pendingEvolution.fromId]?.name ?? 'Pokemon'} evolved into ${pokemonDataMap[pendingEvolution.toId]?.name ?? 'a new form'}!`
            : `What? ${pokemonDataMap[pendingEvolution.fromId]?.name ?? 'Pokemon'} is evolving!`}
        </div>
        <img
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
            evoStage === 'reveal' || evoStage === 'done'
              ? pendingEvolution.toId
              : pendingEvolution.fromId
          }.png`}
          style={{
            width: 128, height: 128, imageRendering: 'pixelated' as const,
            filter: evoStage === 'silhouette' || evoStage === 'flash'
              ? 'brightness(100) saturate(0)'
              : evoStage === 'reveal'
                ? 'brightness(2) saturate(0.3)'
                : 'none',
            transition: evoStage === 'silhouette' ? 'filter 0.4s ease-in' : 'filter 0.5s ease-out',
            animation: evoStage === 'silhouette'
              ? 'evoPulse 0.5s ease-in-out infinite alternate'
              : evoStage === 'reveal'
                ? 'evoReveal 0.9s ease-out'
                : 'none',
          }}
          alt=""
        />
        {evoStage === 'done' && (
          <div style={{
            color: 'rgba(255,255,255,0.45)', fontSize: 13,
            marginTop: 28, fontFamily: 'monospace',
          }}>
            Tap to continue
          </div>
        )}
      </div>
    )}
    </div>
  )
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Build and smoke test in browser**

```bash
npm run dev
```

Open browser. Start a battle with a Pokemon close to evolving level (or temporarily lower `evolvesAtLevel` for Charmander to test). Win a battle. Confirm:
- Black full-screen overlay appears when evolution triggers
- Sprite flashes white
- Flash burst fires at ~1.6s
- Evolved sprite appears at ~1.9s with glow
- "evolved into!" message appears at ~2.8s
- Tap dismisses overlay and returns to battle-win screen

- [ ] **Step 7: Commit**

```bash
git add src/screens/Battle.tsx
git commit -m "feat: full-screen evolution overlay with tap-to-continue"
```

---

## Task 4: Add 27 Gen 2 Pokemon to pokemon.json

**Files:**
- Modify: `src/data/pokemon.json`

- [ ] **Step 1: Append Gen 2 entries to pokemon.json**

Open `src/data/pokemon.json`. It is a JSON array ending with `}` then `]`. Remove the final `]`, add a comma after the last entry, then append the following entries, then close with `]`:

```json
,
  {
    "id": 152, "name": "Chikorita", "types": ["grass"],
    "baseStats": { "hp": 45, "atk": 49, "def": 65, "spAtk": 49, "spDef": 65, "spd": 45 },
    "catchRate": 45, "baseExp": 64, "evolvesAtLevel": 16, "evolvesTo": 153, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 3, "moveId": "absorb" },
      { "level": 6, "moveId": "razor-leaf" }, { "level": 9, "moveId": "magical-leaf" },
      { "level": 12, "moveId": "synthesis" }, { "level": 15, "moveId": "headbutt" },
      { "level": 22, "moveId": "giga-drain" }, { "level": 29, "moveId": "solar-beam" },
      { "level": 36, "moveId": "body-slam" }, { "level": 40, "moveId": "petal-dance" }
    ]
  },
  {
    "id": 153, "name": "Bayleef", "types": ["grass"],
    "baseStats": { "hp": 60, "atk": 62, "def": 80, "spAtk": 63, "spDef": 80, "spd": 60 },
    "catchRate": 45, "baseExp": 142, "evolvesAtLevel": 32, "evolvesTo": 154, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "absorb" },
      { "level": 1, "moveId": "razor-leaf" }, { "level": 9, "moveId": "magical-leaf" },
      { "level": 12, "moveId": "synthesis" }, { "level": 15, "moveId": "headbutt" },
      { "level": 22, "moveId": "giga-drain" }, { "level": 29, "moveId": "solar-beam" },
      { "level": 36, "moveId": "body-slam" }, { "level": 40, "moveId": "petal-dance" }
    ]
  },
  {
    "id": 154, "name": "Meganium", "types": ["grass"],
    "baseStats": { "hp": 80, "atk": 82, "def": 100, "spAtk": 83, "spDef": 100, "spd": 80 },
    "catchRate": 45, "baseExp": 236, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "absorb" },
      { "level": 1, "moveId": "razor-leaf" }, { "level": 9, "moveId": "magical-leaf" },
      { "level": 12, "moveId": "synthesis" }, { "level": 15, "moveId": "headbutt" },
      { "level": 22, "moveId": "giga-drain" }, { "level": 29, "moveId": "solar-beam" },
      { "level": 36, "moveId": "body-slam" }, { "level": 40, "moveId": "petal-dance" },
      { "level": 48, "moveId": "energy-ball" }
    ]
  },
  {
    "id": 155, "name": "Cyndaquil", "types": ["fire"],
    "baseStats": { "hp": 39, "atk": 52, "def": 43, "spAtk": 60, "spDef": 50, "spd": 65 },
    "catchRate": 45, "baseExp": 62, "evolvesAtLevel": 14, "evolvesTo": 156, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "ember" },
      { "level": 6, "moveId": "quick-attack" }, { "level": 9, "moveId": "fire-spin" },
      { "level": 14, "moveId": "flame-wheel" }, { "level": 20, "moveId": "swift" },
      { "level": 28, "moveId": "flamethrower" }, { "level": 35, "moveId": "heat-wave" },
      { "level": 42, "moveId": "fire-blast" }
    ]
  },
  {
    "id": 156, "name": "Quilava", "types": ["fire"],
    "baseStats": { "hp": 58, "atk": 64, "def": 58, "spAtk": 80, "spDef": 65, "spd": 80 },
    "catchRate": 45, "baseExp": 142, "evolvesAtLevel": 36, "evolvesTo": 157, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "ember" },
      { "level": 1, "moveId": "quick-attack" }, { "level": 9, "moveId": "fire-spin" },
      { "level": 14, "moveId": "flame-wheel" }, { "level": 20, "moveId": "swift" },
      { "level": 28, "moveId": "flamethrower" }, { "level": 35, "moveId": "heat-wave" },
      { "level": 42, "moveId": "fire-blast" }
    ]
  },
  {
    "id": 157, "name": "Typhlosion", "types": ["fire"],
    "baseStats": { "hp": 78, "atk": 84, "def": 78, "spAtk": 109, "spDef": 85, "spd": 100 },
    "catchRate": 45, "baseExp": 240, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "ember" },
      { "level": 1, "moveId": "quick-attack" }, { "level": 9, "moveId": "fire-spin" },
      { "level": 14, "moveId": "flame-wheel" }, { "level": 20, "moveId": "swift" },
      { "level": 28, "moveId": "flamethrower" }, { "level": 35, "moveId": "heat-wave" },
      { "level": 42, "moveId": "fire-blast" }, { "level": 50, "moveId": "eruption" }
    ]
  },
  {
    "id": 158, "name": "Totodile", "types": ["water"],
    "baseStats": { "hp": 50, "atk": 65, "def": 64, "spAtk": 44, "spDef": 48, "spd": 43 },
    "catchRate": 45, "baseExp": 63, "evolvesAtLevel": 18, "evolvesTo": 159, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "scratch" }, { "level": 1, "moveId": "water-gun" },
      { "level": 6, "moveId": "bite" }, { "level": 9, "moveId": "headbutt" },
      { "level": 15, "moveId": "water-pulse" }, { "level": 20, "moveId": "aqua-tail" },
      { "level": 24, "moveId": "slash" }, { "level": 28, "moveId": "surf" },
      { "level": 33, "moveId": "crunch" }, { "level": 40, "moveId": "waterfall" }
    ]
  },
  {
    "id": 159, "name": "Croconaw", "types": ["water"],
    "baseStats": { "hp": 65, "atk": 80, "def": 80, "spAtk": 59, "spDef": 63, "spd": 58 },
    "catchRate": 45, "baseExp": 142, "evolvesAtLevel": 30, "evolvesTo": 160, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "scratch" }, { "level": 1, "moveId": "water-gun" },
      { "level": 1, "moveId": "bite" }, { "level": 9, "moveId": "headbutt" },
      { "level": 15, "moveId": "water-pulse" }, { "level": 20, "moveId": "aqua-tail" },
      { "level": 24, "moveId": "slash" }, { "level": 28, "moveId": "surf" },
      { "level": 33, "moveId": "crunch" }, { "level": 40, "moveId": "waterfall" }
    ]
  },
  {
    "id": 160, "name": "Feraligatr", "types": ["water"],
    "baseStats": { "hp": 85, "atk": 105, "def": 100, "spAtk": 79, "spDef": 83, "spd": 78 },
    "catchRate": 45, "baseExp": 239, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "scratch" }, { "level": 1, "moveId": "water-gun" },
      { "level": 1, "moveId": "bite" }, { "level": 9, "moveId": "headbutt" },
      { "level": 15, "moveId": "water-pulse" }, { "level": 20, "moveId": "aqua-tail" },
      { "level": 24, "moveId": "slash" }, { "level": 28, "moveId": "surf" },
      { "level": 33, "moveId": "crunch" }, { "level": 40, "moveId": "waterfall" },
      { "level": 50, "moveId": "hydro-pump" }
    ]
  },
  {
    "id": 167, "name": "Spinarak", "types": ["bug", "poison"],
    "baseStats": { "hp": 40, "atk": 60, "def": 40, "spAtk": 40, "spDef": 40, "spd": 30 },
    "catchRate": 255, "baseExp": 60, "evolvesAtLevel": 22, "evolvesTo": 168, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "poison-sting" }, { "level": 1, "moveId": "tackle" },
      { "level": 6, "moveId": "bug-bite" }, { "level": 10, "moveId": "fury-cutter" },
      { "level": 16, "moveId": "signal-beam" }, { "level": 22, "moveId": "pin-missile" },
      { "level": 30, "moveId": "bug-buzz" }
    ]
  },
  {
    "id": 168, "name": "Ariados", "types": ["bug", "poison"],
    "baseStats": { "hp": 70, "atk": 90, "def": 70, "spAtk": 60, "spDef": 60, "spd": 40 },
    "catchRate": 90, "baseExp": 140, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "poison-sting" }, { "level": 1, "moveId": "tackle" },
      { "level": 1, "moveId": "bug-bite" }, { "level": 10, "moveId": "fury-cutter" },
      { "level": 16, "moveId": "signal-beam" }, { "level": 22, "moveId": "pin-missile" },
      { "level": 30, "moveId": "bug-buzz" }, { "level": 40, "moveId": "megahorn" }
    ]
  },
  {
    "id": 183, "name": "Marill", "types": ["water"],
    "baseStats": { "hp": 70, "atk": 20, "def": 50, "spAtk": 20, "spDef": 50, "spd": 40 },
    "catchRate": 190, "baseExp": 88, "evolvesAtLevel": 18, "evolvesTo": 184, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "water-gun" },
      { "level": 6, "moveId": "bubble-beam" }, { "level": 10, "moveId": "headbutt" },
      { "level": 16, "moveId": "aqua-tail" }, { "level": 22, "moveId": "body-slam" },
      { "level": 28, "moveId": "waterfall" }, { "level": 35, "moveId": "play-rough" }
    ]
  },
  {
    "id": 184, "name": "Azumarill", "types": ["water"],
    "baseStats": { "hp": 100, "atk": 50, "def": 80, "spAtk": 60, "spDef": 80, "spd": 50 },
    "catchRate": 75, "baseExp": 189, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "water-gun" },
      { "level": 1, "moveId": "bubble-beam" }, { "level": 10, "moveId": "headbutt" },
      { "level": 16, "moveId": "aqua-tail" }, { "level": 22, "moveId": "body-slam" },
      { "level": 28, "moveId": "waterfall" }, { "level": 35, "moveId": "play-rough" },
      { "level": 45, "moveId": "moonblast" }
    ]
  },
  {
    "id": 187, "name": "Hoppip", "types": ["grass", "flying"],
    "baseStats": { "hp": 35, "atk": 35, "def": 40, "spAtk": 35, "spDef": 55, "spd": 50 },
    "catchRate": 255, "baseExp": 56, "evolvesAtLevel": 18, "evolvesTo": 188, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 4, "moveId": "absorb" },
      { "level": 8, "moveId": "razor-leaf" }, { "level": 12, "moveId": "aerial-ace" },
      { "level": 16, "moveId": "swift" }, { "level": 20, "moveId": "energy-ball" },
      { "level": 24, "moveId": "giga-drain" }
    ]
  },
  {
    "id": 188, "name": "Skiploom", "types": ["grass", "flying"],
    "baseStats": { "hp": 55, "atk": 45, "def": 50, "spAtk": 45, "spDef": 65, "spd": 80 },
    "catchRate": 120, "baseExp": 119, "evolvesAtLevel": 27, "evolvesTo": 189, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "absorb" },
      { "level": 1, "moveId": "razor-leaf" }, { "level": 12, "moveId": "aerial-ace" },
      { "level": 16, "moveId": "swift" }, { "level": 20, "moveId": "energy-ball" },
      { "level": 24, "moveId": "giga-drain" }, { "level": 30, "moveId": "petal-dance" }
    ]
  },
  {
    "id": 189, "name": "Jumpluff", "types": ["grass", "flying"],
    "baseStats": { "hp": 75, "atk": 55, "def": 70, "spAtk": 55, "spDef": 95, "spd": 110 },
    "catchRate": 45, "baseExp": 207, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "absorb" },
      { "level": 1, "moveId": "razor-leaf" }, { "level": 12, "moveId": "aerial-ace" },
      { "level": 16, "moveId": "swift" }, { "level": 20, "moveId": "energy-ball" },
      { "level": 24, "moveId": "giga-drain" }, { "level": 30, "moveId": "petal-dance" },
      { "level": 40, "moveId": "solar-beam" }
    ]
  },
  {
    "id": 194, "name": "Wooper", "types": ["water", "ground"],
    "baseStats": { "hp": 55, "atk": 45, "def": 45, "spAtk": 25, "spDef": 25, "spd": 15 },
    "catchRate": 255, "baseExp": 56, "evolvesAtLevel": 20, "evolvesTo": 195, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "water-gun" }, { "level": 4, "moveId": "mud-shot" },
      { "level": 9, "moveId": "headbutt" }, { "level": 14, "moveId": "aqua-tail" },
      { "level": 18, "moveId": "mud-slap" }, { "level": 22, "moveId": "surf" },
      { "level": 30, "moveId": "earthquake" }
    ]
  },
  {
    "id": 195, "name": "Quagsire", "types": ["water", "ground"],
    "baseStats": { "hp": 95, "atk": 85, "def": 85, "spAtk": 65, "spDef": 65, "spd": 35 },
    "catchRate": 90, "baseExp": 151, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "water-gun" }, { "level": 1, "moveId": "mud-shot" },
      { "level": 9, "moveId": "headbutt" }, { "level": 14, "moveId": "aqua-tail" },
      { "level": 18, "moveId": "mud-slap" }, { "level": 22, "moveId": "surf" },
      { "level": 30, "moveId": "earthquake" }, { "level": 40, "moveId": "hydro-pump" }
    ]
  },
  {
    "id": 196, "name": "Espeon", "types": ["psychic"],
    "baseStats": { "hp": 65, "atk": 65, "def": 60, "spAtk": 130, "spDef": 95, "spd": 110 },
    "catchRate": 45, "baseExp": 184, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 3, "moveId": "quick-attack" },
      { "level": 9, "moveId": "psychic" }, { "level": 15, "moveId": "swift" },
      { "level": 20, "moveId": "aerial-ace" }, { "level": 28, "moveId": "signal-beam" },
      { "level": 35, "moveId": "shadow-ball" }, { "level": 45, "moveId": "hyper-beam" }
    ]
  },
  {
    "id": 197, "name": "Umbreon", "types": ["dark"],
    "baseStats": { "hp": 95, "atk": 65, "def": 110, "spAtk": 60, "spDef": 130, "spd": 65 },
    "catchRate": 45, "baseExp": 184, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 3, "moveId": "quick-attack" },
      { "level": 9, "moveId": "bite" }, { "level": 15, "moveId": "headbutt" },
      { "level": 22, "moveId": "snarl" }, { "level": 30, "moveId": "dark-pulse" },
      { "level": 38, "moveId": "crunch" }, { "level": 45, "moveId": "hyper-beam" }
    ]
  },
  {
    "id": 209, "name": "Snubbull", "types": ["fairy"],
    "baseStats": { "hp": 60, "atk": 80, "def": 50, "spAtk": 40, "spDef": 40, "spd": 30 },
    "catchRate": 190, "baseExp": 60, "evolvesAtLevel": 23, "evolvesTo": 210, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 6, "moveId": "bite" },
      { "level": 9, "moveId": "headbutt" }, { "level": 14, "moveId": "stomp" },
      { "level": 20, "moveId": "body-slam" }, { "level": 26, "moveId": "play-rough" },
      { "level": 32, "moveId": "moonblast" }
    ]
  },
  {
    "id": 210, "name": "Granbull", "types": ["fairy"],
    "baseStats": { "hp": 90, "atk": 120, "def": 75, "spAtk": 60, "spDef": 60, "spd": 45 },
    "catchRate": 75, "baseExp": 158, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "bite" },
      { "level": 9, "moveId": "headbutt" }, { "level": 14, "moveId": "stomp" },
      { "level": 20, "moveId": "body-slam" }, { "level": 26, "moveId": "play-rough" },
      { "level": 32, "moveId": "moonblast" }, { "level": 40, "moveId": "close-combat" },
      { "level": 48, "moveId": "dazzling-gleam" }
    ]
  },
  {
    "id": 214, "name": "Heracross", "types": ["bug", "fighting"],
    "baseStats": { "hp": 80, "atk": 125, "def": 75, "spAtk": 40, "spDef": 95, "spd": 85 },
    "catchRate": 45, "baseExp": 175, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "bug-bite" },
      { "level": 6, "moveId": "headbutt" }, { "level": 12, "moveId": "brick-break" },
      { "level": 18, "moveId": "close-combat" }, { "level": 25, "moveId": "megahorn" },
      { "level": 30, "moveId": "stone-edge" }, { "level": 38, "moveId": "bug-buzz" },
      { "level": 45, "moveId": "power-up-punch" }
    ]
  },
  {
    "id": 240, "name": "Magby", "types": ["fire"],
    "baseStats": { "hp": 45, "atk": 75, "def": 37, "spAtk": 70, "spDef": 55, "spd": 83 },
    "catchRate": 45, "baseExp": 73, "evolvesAtLevel": 30, "evolvesTo": 126, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "ember" },
      { "level": 7, "moveId": "quick-attack" }, { "level": 12, "moveId": "fire-fang" },
      { "level": 14, "moveId": "flame-wheel" }, { "level": 22, "moveId": "flamethrower" },
      { "level": 30, "moveId": "fire-blast" }, { "level": 36, "moveId": "heat-wave" }
    ]
  },
  {
    "id": 246, "name": "Larvitar", "types": ["rock", "ground"],
    "baseStats": { "hp": 50, "atk": 64, "def": 50, "spAtk": 45, "spDef": 50, "spd": 41 },
    "catchRate": 45, "baseExp": 60, "evolvesAtLevel": 30, "evolvesTo": 247, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "tackle" }, { "level": 1, "moveId": "bite" },
      { "level": 6, "moveId": "rock-throw" }, { "level": 10, "moveId": "headbutt" },
      { "level": 14, "moveId": "stomp" }, { "level": 20, "moveId": "rock-slide" },
      { "level": 26, "moveId": "crunch" }, { "level": 30, "moveId": "earthquake" },
      { "level": 38, "moveId": "stone-edge" }, { "level": 45, "moveId": "outrage" }
    ]
  },
  {
    "id": 247, "name": "Pupitar", "types": ["rock", "ground"],
    "baseStats": { "hp": 70, "atk": 84, "def": 70, "spAtk": 65, "spDef": 70, "spd": 51 },
    "catchRate": 45, "baseExp": 144, "evolvesAtLevel": 55, "evolvesTo": 248, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "bite" }, { "level": 1, "moveId": "rock-throw" },
      { "level": 10, "moveId": "headbutt" }, { "level": 14, "moveId": "stomp" },
      { "level": 20, "moveId": "rock-slide" }, { "level": 26, "moveId": "crunch" },
      { "level": 30, "moveId": "earthquake" }, { "level": 38, "moveId": "stone-edge" },
      { "level": 40, "moveId": "ancient-power" }, { "level": 45, "moveId": "outrage" }
    ]
  },
  {
    "id": 248, "name": "Tyranitar", "types": ["rock", "dark"],
    "baseStats": { "hp": 100, "atk": 134, "def": 110, "spAtk": 95, "spDef": 100, "spd": 61 },
    "catchRate": 45, "baseExp": 270, "evolvesAtLevel": null, "evolvesTo": null, "gen": 2,
    "learnset": [
      { "level": 1, "moveId": "bite" }, { "level": 1, "moveId": "rock-throw" },
      { "level": 10, "moveId": "headbutt" }, { "level": 14, "moveId": "stomp" },
      { "level": 20, "moveId": "rock-slide" }, { "level": 26, "moveId": "crunch" },
      { "level": 30, "moveId": "earthquake" }, { "level": 38, "moveId": "stone-edge" },
      { "level": 40, "moveId": "ancient-power" }, { "level": 45, "moveId": "outrage" },
      { "level": 50, "moveId": "dark-pulse" }, { "level": 55, "moveId": "hyper-beam" }
    ]
  }
```

- [ ] **Step 2: Verify the JSON is valid**

```bash
node -e "require('./src/data/pokemon.json'); console.log('JSON valid')"
```
Expected: `JSON valid`

- [ ] **Step 3: Verify count**

```bash
node -e "const p=require('./src/data/pokemon.json'); console.log('Count:', p.length)"
```
Expected: `Count: 178`

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/pokemon.json
git commit -m "feat: add 27 Gen 2 Pokemon data entries"
```

---

## Task 5: Add Gen 2 Pokemon to map wild encounter tables

**Files:**
- Modify: `src/maps/flowerMeadow.ts`
- Modify: `src/maps/viridianForest.ts`
- Modify: `src/maps/rockyCave.ts`
- Modify: `src/maps/trainerRoad.ts`
- Modify: `src/maps/mistyLake.ts`
- Modify: `src/maps/volcanoTrail.ts`

- [ ] **Step 1: flowerMeadow.ts — add Hoppip, Espeon, Chikorita**

In `src/maps/flowerMeadow.ts`, find the end of the `wildPokemon` array (the line with Mew `rate: 1`):
```typescript
    { pokemonId: 151, minLevel: 30, maxLevel: 35, rate: 1  },  // Mew ⭐
  ],
```

Replace with:
```typescript
    { pokemonId: 151, minLevel: 30, maxLevel: 35, rate: 1  },  // Mew ⭐
    { pokemonId: 187, minLevel: 5,  maxLevel: 10, rate: 8  },  // Hoppip
    { pokemonId: 152, minLevel: 5,  maxLevel: 10, rate: 5  },  // Chikorita ⭐
    { pokemonId: 196, minLevel: 12, maxLevel: 16, rate: 2  },  // Espeon ⭐
  ],
```

- [ ] **Step 2: viridianForest.ts — add Spinarak, Heracross**

In `src/maps/viridianForest.ts`, find:
```typescript
    { pokemonId: 3,   minLevel: 15, maxLevel: 18, rate: 1  },  // Venusaur ⭐
  ],
```

Replace with:
```typescript
    { pokemonId: 3,   minLevel: 15, maxLevel: 18, rate: 1  },  // Venusaur ⭐
    { pokemonId: 167, minLevel: 4,  maxLevel: 8,  rate: 10 },  // Spinarak
    { pokemonId: 214, minLevel: 10, maxLevel: 15, rate: 2  },  // Heracross ⭐
  ],
```

- [ ] **Step 3: rockyCave.ts — add Larvitar, Umbreon**

In `src/maps/rockyCave.ts`, find:
```typescript
    { pokemonId: 142, minLevel: 22, maxLevel: 28, rate: 1  },  // Aerodactyl ⭐
  ],
```

Replace with:
```typescript
    { pokemonId: 142, minLevel: 22, maxLevel: 28, rate: 1  },  // Aerodactyl ⭐
    { pokemonId: 246, minLevel: 15, maxLevel: 20, rate: 2  },  // Larvitar ⭐
    { pokemonId: 197, minLevel: 18, maxLevel: 24, rate: 2  },  // Umbreon ⭐
  ],
```

- [ ] **Step 4: trainerRoad.ts — add Snubbull**

In `src/maps/trainerRoad.ts`, find:
```typescript
    { pokemonId: 145, minLevel: 45, maxLevel: 50, rate: 1  },  // Zapdos ⭐
  ],
```

Replace with:
```typescript
    { pokemonId: 145, minLevel: 45, maxLevel: 50, rate: 1  },  // Zapdos ⭐
    { pokemonId: 209, minLevel: 16, maxLevel: 21, rate: 6  },  // Snubbull
  ],
```

- [ ] **Step 5: mistyLake.ts — add Totodile, Marill, Wooper**

In `src/maps/mistyLake.ts`, find the end of `wildPokemon`:
```typescript
    { pokemonId: 144, minLevel: 45, maxLevel: 50, rate: 1  },  // Articuno ⭐
  ],
```

Replace with:
```typescript
    { pokemonId: 144, minLevel: 45, maxLevel: 50, rate: 1  },  // Articuno ⭐
    { pokemonId: 158, minLevel: 8,  maxLevel: 13, rate: 5  },  // Totodile ⭐
    { pokemonId: 183, minLevel: 8,  maxLevel: 12, rate: 8  },  // Marill
    { pokemonId: 194, minLevel: 8,  maxLevel: 13, rate: 6  },  // Wooper
  ],
```

- [ ] **Step 6: volcanoTrail.ts — add Cyndaquil, Magby, Tyranitar**

In `src/maps/volcanoTrail.ts`, find:
```typescript
    { pokemonId: 146, minLevel: 50, maxLevel: 55, rate: 2  },  // Moltres ⭐
  ],
```

Replace with:
```typescript
    { pokemonId: 146, minLevel: 50, maxLevel: 55, rate: 2  },  // Moltres ⭐
    { pokemonId: 155, minLevel: 25, maxLevel: 30, rate: 8  },  // Cyndaquil ⭐
    { pokemonId: 240, minLevel: 24, maxLevel: 29, rate: 10 },  // Magby
    { pokemonId: 248, minLevel: 50, maxLevel: 55, rate: 2  },  // Tyranitar ⭐
  ],
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/maps/flowerMeadow.ts src/maps/viridianForest.ts src/maps/rockyCave.ts src/maps/trainerRoad.ts src/maps/mistyLake.ts src/maps/volcanoTrail.ts
git commit -m "feat: add Gen 2 Pokemon to wild encounter tables"
```

---

## Task 6: Build and Deploy

**Files:** None modified — build only.

- [ ] **Step 1: Build**

```bash
npm run build
```
Expected: `✓ built in X.XXs` with no errors.

- [ ] **Step 2: Copy to website**

```bash
cp -r dist/. "../../jd-partners-website/games/mypokemon/"
```

- [ ] **Step 3: Commit and push website**

```bash
cd ../../jd-partners-website
git add games/mypokemon/
git commit -m "deploy: Phase A — evolution overlay + Gen 2 Pokemon"
git push
cd "../My Pokemon"
```

- [ ] **Step 4: Push source**

```bash
git push
```

- [ ] **Step 5: Smoke test on live site**

Open `https://www.jdpartners.co/games/mypokemon/`. Log in as Derek. Start a battle with a low-level Pokemon (e.g. Charmander near level 16). Win enough battles to trigger level 16. Confirm evolution overlay fires, animates, and tapping "Continue" returns to the win screen. Check Pokedex — Pokemon should show new evolved form.
