# Phase A: Evolution + More Pokemon — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Pokemon evolution (full-screen dramatic animation, automatic, no cancel) and expand the Pokemon roster with missing Gen 1 favourites and a curated Gen 2 selection placed on existing maps.

**Architecture:** Evolution hooks into the existing post-levelup flow in `useBattleEngine.ts`, uses the existing `'evolving'` BattlePhase, and adds one field to `battleStore`. New Pokemon are pure data additions to `pokemon.json` plus rate entries in existing map files.

**Tech Stack:** React 18 + TypeScript, Zustand (battleStore), Firebase Firestore, existing `exp.ts` stat helpers.

---

## Section 1: Evolution System

### Data structures

`battleStore.ts` — add one field:
```typescript
pendingEvolution: { fromId: number; toId: number } | null
```
And actions: `setPendingEvolution(e: { fromId: number; toId: number } | null)`

### Trigger (useBattleEngine.ts)

After XP is awarded and `getLevel(newXp) > oldLevel` in `handleAnswer`:
1. Compute `newLevel = getLevel(newXp)`
2. Look up `pokemonData.evolvesAtLevel` and `pokemonData.evolvesTo`
3. If `newLevel >= evolvesAtLevel && evolvesTo !== null`:
   - Call `store.setPendingEvolution({ fromId: pokemon.pokemonId, toId: evolvesTo })`
   - Set `phase = 'evolving'` (do NOT proceed to win/lose phase yet)
4. Otherwise proceed normally to win/lose

### Evolution screen (Battle.tsx)

Rendered when `phase === 'evolving'` and `pendingEvolution !== null`. Full-screen overlay above all battle UI.

**Layout:**
- Background: black, full screen
- Top text: `"What? [OldName] is evolving!"` (white, centered, Georgia serif)
- Center: Pokemon sprite (96×96px, pixelated) — CSS keyframe flashes white 6× over 2s, then swaps to evolved sprite and flashes in over 0.5s
- Bottom text after animation: `"✨ [OldName] evolved into [NewName]!"` (gold #c8a820, bold)
- Tap anywhere / press Enter to continue

**CSS animation:**
```css
@keyframes evo-flash {
  0%, 100% { filter: brightness(1); }
  50%       { filter: brightness(10) saturate(0); }
}
```
6 iterations × 333ms = 2s total. After animation: swap sprite src, play 0.5s fade-in.

### Post-evolution update

On dismiss (tap/Enter):
1. Build `evolvedData = pokemonMap[toId]`
2. `newMaxHp = calculateMaxHp(evolvedData.baseStats.hp, currentLevel)`
3. Keep existing moves; append any new learnset moves the evolved form learns at `<= currentLevel` that aren't already in the moveset, up to 4 total
4. Update `playerPokemon` in battleStore: `pokemonId = toId`, `maxHp = newMaxHp`, `currentHp = min(currentHp, newMaxHp)`, updated moves
5. Update profile party: find the slot via `partyIndexMap[0]`, apply same changes
6. `updateProfile(profileId, { party: updatedParty })` — Firestore save
7. Clear `pendingEvolution = null`
8. Set phase to `'win'` or `'lose'` (whichever was pending — store a `postEvolutionPhase: 'win' | 'lose'` field to remember)

### battleStore additions summary
```typescript
pendingEvolution: { fromId: number; toId: number } | null
postEvolutionPhase: 'win' | 'lose' | null
setPendingEvolution(e: { fromId: number; toId: number } | null): void
setPostEvolutionPhase(p: 'win' | 'lose' | null): void
```

---

## Section 2: More Pokemon

### pokemon.json additions

Each entry follows the existing `PokemonData` shape:
```typescript
{
  id, name, types, baseStats: { hp, atk, def, spAtk, spDef, spd },
  catchRate, baseExp, evolvesAtLevel, evolvesTo, learnset, gen
}
```

**Gen 1 additions (14 Pokemon):**

| ID | Name | evolvesAtLevel | evolvesTo |
|----|------|----------------|-----------|
| 35 | Clefairy | 36 | 36 (Clefable) |
| 36 | Clefable | null | null |
| 39 | Jigglypuff | null | 40 (item-based, set null) |
| 40 | Wigglytuff | null | null |
| 52 | Meowth | 28 | 53 (Persian) |
| 53 | Persian | null | null |
| 58 | Growlithe | null | 59 (item, set null — Arcanine already in data) |
| 115 | Kangaskhan | null | null |
| 128 | Tauros | null | null |
| 132 | Ditto | null | null |
| 133 | Eevee | null | null (multiple evolutions — handled separately) |
| 134 | Vaporeon | null | null |
| 135 | Jolteon | null | null |
| 142 | Aerodactyl | null | null |
| 143 | Snorlax | null | null |

Note: Eevee evolutions (Vaporeon 134, Jolteon 135, Flareon 136) are already in some map wild tables; ensure their `PokemonData` entries exist.

**Gen 2 additions (19 Pokemon):**

| ID | Name | evolvesAtLevel | evolvesTo |
|----|------|----------------|-----------|
| 152 | Chikorita | 16 | 153 |
| 153 | Bayleef | 32 | 154 |
| 154 | Meganium | null | null |
| 155 | Cyndaquil | 14 | 156 |
| 156 | Quilava | 36 | 157 |
| 157 | Typhlosion | null | null |
| 158 | Totodile | 18 | 159 |
| 159 | Croconaw | 30 | 160 |
| 160 | Feraligatr | null | null |
| 167 | Spinarak | 22 | 168 (Ariados) |
| 168 | Ariados | null | null |
| 183 | Marill | 18 | 184 (Azumarill) |
| 184 | Azumarill | null | null |
| 187 | Hoppip | 18 | 188 (Skiploom) |
| 188 | Skiploom | 27 | 189 (Jumpluff) |
| 189 | Jumpluff | null | null |
| 194 | Wooper | 20 | 195 (Quagsire) |
| 195 | Quagsire | null | null |
| 196 | Espeon | null | null |
| 197 | Umbreon | null | null |
| 209 | Snubbull | 23 | 210 (Granbull) |
| 210 | Granbull | null | null |
| 214 | Heracross | null | null |
| 240 | Magby | 30 | 126 (Magmar — already exists) |
| 246 | Larvitar | 30 | 247 |
| 247 | Pupitar | 55 | 248 |
| 248 | Tyranitar | null | null |

### Map wild table additions

**palletTown.ts:**
- Meowth (#52) rate 8, lv 3–7
- Eevee (#133) rate 3 ⭐, lv 5–8

**sunlitMeadow.ts:**
- Clefairy (#35) rate 6, lv 4–8
- Espeon (#196) rate 3 ⭐, lv 18–24

**flowerMeadow.ts:**
- Jigglypuff (#39) rate 10, lv 8–13
- Hoppip (#187) rate 8, lv 8–12
- Chikorita (#152) rate 6 ⭐, lv 8–13

**viridianForest.ts:**
- Spinarak (#167) rate 10, lv 6–11
- Ditto (#132) rate 4 ⭐, lv 10–15
- Heracross (#214) rate 3 ⭐, lv 14–18

**rockyCave.ts:**
- Snorlax (#143) rate 4 ⭐, lv 20–28
- Umbreon (#197) rate 3 ⭐, lv 18–24
- Larvitar (#246) rate 3 ⭐, lv 20–28

**trainerRoad.ts:**
- Growlithe (#58) rate 8, lv 18–24
- Tauros (#128) rate 6, lv 20–26
- Snubbull (#209) rate 8, lv 18–24

**cinnabarTown.ts:**
- Kangaskhan (#115) rate 5 ⭐, lv 25–32

**mistyLake.ts (wildPokemon — grass):**
- Totodile (#158) rate 6 ⭐, lv 8–13
- Marill (#183) rate 8, lv 8–14
- Wooper (#194) rate 8, lv 8–13

**volcanoTrail.ts:**
- Cyndaquil (#155) rate 8 ⭐, lv 25–30
- Magby (#240) rate 10, lv 25–30
- Aerodactyl (#142) rate 3 ⭐, lv 35–42
- Tyranitar (#248) rate 2 ⭐, lv 50–55

---

## File changes summary

| File | Change |
|------|--------|
| `src/store/battleStore.ts` | Add `pendingEvolution`, `postEvolutionPhase` fields + setters |
| `src/hooks/useBattleEngine.ts` | Trigger evolution check after level-up in `handleAnswer` |
| `src/screens/Battle.tsx` | Render evolution overlay when `phase === 'evolving'` |
| `src/data/pokemon.json` | Add ~40 new Pokemon entries (Gen 1 gaps + Gen 2 selection) |
| `src/maps/palletTown.ts` | Add Meowth, Eevee to wild tables |
| `src/maps/sunlitMeadow.ts` | Add Clefairy, Espeon |
| `src/maps/flowerMeadow.ts` | Add Jigglypuff, Hoppip, Chikorita |
| `src/maps/viridianForest.ts` | Add Spinarak, Ditto, Heracross |
| `src/maps/rockyCave.ts` | Add Snorlax, Umbreon, Larvitar |
| `src/maps/trainerRoad.ts` | Add Growlithe, Tauros, Snubbull |
| `src/maps/cinnabarTown.ts` | Add Kangaskhan |
| `src/maps/mistyLake.ts` | Add Totodile, Marill, Wooper |
| `src/maps/volcanoTrail.ts` | Add Cyndaquil, Magby, Aerodactyl, Tyranitar |
