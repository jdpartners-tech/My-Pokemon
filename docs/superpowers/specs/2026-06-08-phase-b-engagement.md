# Phase B: Achievements, Daily Login Reward & Sibling Leaderboard — Design Spec

**Goal:** Add three engagement features to the My Pokemon educational RPG: a 20-badge achievement system, a 7-day daily login reward ladder, and a sibling rivalry leaderboard comparing Kayden and Kaylie.

**Architecture:** Snapshot-based achievement checker runs on WorldMap mount. Daily reward is client-side date comparison — no Cloud Functions. Leaderboard queries Firestore profiles by name. All three hook into the existing WorldMap mount lifecycle and the existing Progress screen.

**Tech Stack:** React 18 + TypeScript, Zustand, Firebase Firestore, `updateProfile()` partial writes.

---

## Section 1: Profile Schema Changes

Add three fields to the `Profile` interface in `src/types/game.ts`:

```typescript
achievements: string[]   // IDs of unlocked achievements, e.g. ["first_battle", "catch_5"]
lastLoginDate: string    // ISO date string of last login, e.g. "2026-06-08"
loginStreak: number      // consecutive days logged in (1–7, resets after Day 7)
visitedRoutes: string[]  // route IDs visited at least once, e.g. ["palletTown", "viridianForest"]
```

The existing `badges: string[]` field is left untouched (reserved for Phase C gym badges).

Firestore backwards compatibility: fields missing from old profiles default to `[]` / `""` / `0` via nullish coalescing in all hook code. No migration needed.

---

## Section 2: Achievement Definitions

File: `src/data/achievements.ts`

Each achievement is a plain object:

```typescript
interface AchievementDef {
  id: string
  name: string
  icon: string           // emoji
  description: string    // unlock condition shown when locked
  flavour: string        // shown when unlocked
  check: (profile: Profile) => boolean
}
```

### Full list (20 achievements)

**Battle (4)**
| ID | Name | Icon | Condition |
|----|------|------|-----------|
| `first_battle` | First Victory | 🥇 | `stats.battlesWon >= 1` |
| `battle_10` | Fighter | ⚔️ | `stats.battlesWon >= 10` |
| `battle_50` | Warrior | 🗡️ | `stats.battlesWon >= 50` |
| `battle_100` | Champion | 👑 | `stats.battlesWon >= 100` |

**Scholar (4)**
| ID | Name | Icon | Condition |
|----|------|------|-----------|
| `question_10` | Student | ✏️ | `stats.questionsCorrect >= 10` |
| `question_50` | Bookworm | 📝 | `stats.questionsCorrect >= 50` |
| `question_100` | Scholar | 🎓 | `stats.questionsCorrect >= 100` |
| `accuracy_80` | Sharp Mind | 🎯 | `questionsAnswered >= 20 && (correct/answered) >= 0.8` |

**Streak (2)**
| ID | Name | Icon | Condition |
|----|------|------|-----------|
| `streak_3` | On a Roll | 🔥 | `loginStreak >= 3` |
| `streak_7` | Dedicated Trainer | 🌟 | `loginStreak >= 7` |

**Game Progress (10)**
| ID | Name | Icon | Condition |
|----|------|------|-----------|
| `first_catch` | First Catch | 🎣 | `Object.values(pokedex).some(e => e.caught)` |
| `catch_5` | Collector | 📦 | caught count >= 5 |
| `catch_20` | Master Catcher | 🏆 | caught count >= 20 |
| `evolved` | Evolved! | ⭐ | checked via trigger (see Section 3) |
| `full_party` | Full Team | 👥 | `party.length >= 6 && party.every(p => p.currentHp > 0)` |
| `pokedex_30` | Scout | 📖 | seen count >= 30 |
| `pokedex_50` | Researcher | 📕 | seen count >= 50 |
| `explorer_3` | Explorer | 🗺️ | `visitedRoutes.length >= 3` |
| `explorer_all` | Adventurer | 🌍 | `visitedRoutes.length >= ALL_MAP_IDS.length` |
| `rich_trainer` | Rich Trainer | 💰 | `money >= 2000` |

**Trigger-based achievements** (`evolved`, `explorer_3`, `explorer_all`) cannot be derived from snapshot alone. They are set via a one-time `updateProfile` call at the relevant code site:
- `evolved`: called after `evolvePlayer()` in `useBattleEngine.ts`
- `explorer_3` / `explorer_all`: snapshot-checkable via `visitedRoutes` field; `visitedRoutes` is updated in `WorldMap.tsx` whenever `currentRoute` changes to a route not already in the array

---

## Section 3: Achievement Hook

File: `src/hooks/useAchievements.ts`

Called once on WorldMap mount after the daily reward modal closes.

```typescript
function useAchievements(profile: Profile, profileId: string): void
```

**Logic:**
1. For each `AchievementDef` in `ACHIEVEMENTS`:
   - If `profile.achievements.includes(def.id)` → skip
   - If `def.check(profile)` → add to `newlyUnlocked[]`
2. If `newlyUnlocked.length > 0`:
   - Call `updateProfile(profileId, { achievements: [...profile.achievements, ...newlyUnlocked.map(d => d.id)] })`
   - Push each to a toast queue (see Section 5)

Run only once per mount via `useEffect` with empty deps after profile is loaded.

---

## Section 4: Daily Login Reward

File: `src/hooks/useLoginReward.ts`

```typescript
function useLoginReward(profile: Profile, profileId: string): {
  rewardReady: boolean
  todayReward: DayReward
  dismissReward: () => void
}
```

**Reward schedule** (7-day cycle, resets after Day 7):

| Day | Coins | Item | Special |
|-----|-------|------|---------|
| 1 | 100 | — | — |
| 2 | 150 | — | — |
| 3 | 200 | Potion (×1) | — |
| 4 | 250 | — | — |
| 5 | 300 | — | — |
| 6 | 350 | Super Potion (×1) | — |
| 7 | 500 | Rare Candy (×1) | Rare Pokémon encounter |

**Logic on mount:**
1. `today = new Date().toISOString().slice(0, 10)` (YYYY-MM-DD)
2. If `profile.lastLoginDate === today` → `rewardReady = false`, skip
3. Else:
   - `yesterday = addDays(today, -1)`
   - `newStreak = profile.lastLoginDate === yesterday ? profile.loginStreak + 1 : 1`
   - `newStreak = newStreak > 7 ? 1 : newStreak` (reset after Day 7)
   - `todayReward = REWARD_SCHEDULE[newStreak]`
   - `rewardReady = true`

**On dismiss (`dismissReward`):**
1. Apply coins: `money + reward.coins`
2. Apply item: if reward has item, add to `bag[]` (find existing slot or append)
3. Update streak achievement check fields
4. `updateProfile(profileId, { money: newMoney, bag: newBag, lastLoginDate: today, loginStreak: newStreak })`
5. If `newStreak === 7`: trigger rare Pokémon encounter (see Section 4a)
6. Set `rewardReady = false`

**Day 7 Rare Pokémon encounter (Section 4a):**

After dismiss, `WorldMap.tsx` checks a `pendingRareEncounter` flag in a local ref and starts a wild battle with a randomly selected Pokémon from the rare pool:

```typescript
const RARE_ENCOUNTER_POOL = [147, 131, 133, 113, 143, 140, 138]
// Dratini, Lapras, Eevee, Chansey, Snorlax, Kabuto, Omanyte
```

The encounter uses the normal `startWildBattle` flow with the selected Pokémon at level 15–25 (random). No special catch rate modification — these are just rare to encounter, not impossible to catch.

---

## Section 5: Daily Reward Modal UI

File: `src/components/DailyRewardModal.tsx`

Full-screen overlay (`position: fixed`, `zIndex: 60`, black background) shown when `rewardReady === true`.

**Layout:**
- Title: `"🌟 Daily Login Reward!"` (Georgia serif, white, centered)
- Today's reward displayed large: coin amount + item icon (if any)
- Preview strip below: days remaining until Day 3 and Day 7 milestones, e.g.:
  - `"Day 3 in 2 days: 200₽ + Potion 💊"`
  - `"Day 7 in 6 days: 500₽ + Rare Candy + Rare Pokémon! 🦕"`
  - (If already past Day 3: only show Day 7 preview)
  - (If today IS Day 7: show `"Today's the big day! 🦕 Rare Pokémon awaits!"`)
- 7-day progress dots at bottom (filled = completed, current = glowing)
- `"Collect!"` button triggers `dismissReward()`

---

## Section 6: Achievement Toast

File: `src/components/AchievementToast.tsx`

Small banner that slides in from the top of the screen:

- `"🏆 Achievement Unlocked: [Name]!"` in gold (#c8a820) on dark background
- Appears 400ms after WorldMap becomes interactive
- If multiple unlock simultaneously, they stack vertically and each fades after 3s (staggered 500ms apart)
- `position: fixed`, top of screen, `zIndex: 65`

The toast queue is managed in a `useAchievements` context or a simple local state array in `WorldMap.tsx`.

---

## Section 7: Achievements Tab (Progress Screen)

File: `src/components/AchievementsTab.tsx`

Added as a new tab in `src/screens/Progress.tsx`.

**Layout:**
- Grid of 20 badge cards (4 per row on desktop, 2 per row on mobile)
- Unlocked: full colour, icon large, name below, flavour text on tap
- Locked: greyscale/dim, icon small, condition text shown
- Counter at top: `"12 / 20 unlocked"`

---

## Section 8: Rivals Tab (Progress Screen)

File: `src/components/RivalsTab.tsx`

Added as a second new tab in `src/screens/Progress.tsx` alongside Achievements.

**Data:**
- On mount: `getDocs(collection(db, 'profiles'))`, filter where `doc.name === 'Kayden'` or `doc.name === 'Kaylie'`
- If a profile isn't found, show `"Not started yet"` for that side

**Layout — side-by-side comparison:**
```
[ Kayden ]          [ Kaylie ]
⚔️ 42 battles      ⚔️ 31 battles  ← Kayden leads (crown 👑)
📖 67 seen         📖 71 seen     ← Kaylie leads (crown 👑)
🔥 Streak: 4 days  🔥 Streak: 2 days
```
- Crown icon on whichever side leads each stat
- If tied: both get crown
- Streak shown for flavour (not competitive)

---

## Section 9: WorldMap integration

Changes to `src/screens/WorldMap.tsx`:

1. Call `useLoginReward(profile, profileId)` — shows `DailyRewardModal` when `rewardReady`
2. After modal dismissed, call `useAchievements(profile, profileId)` — queues toasts
3. Render `<AchievementToast>` at top of component return
4. On route change: check `explorer_3` / `explorer_all` trigger achievements
5. On Day 7 dismiss: start rare encounter via `startWildBattle(rareOpponent, ...)`

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/types/game.ts` | Add `achievements`, `lastLoginDate`, `loginStreak`, `visitedRoutes` to `Profile` |
| `src/data/achievements.ts` | New — 20 achievement definitions |
| `src/hooks/useLoginReward.ts` | New — daily reward logic |
| `src/hooks/useAchievements.ts` | New — snapshot checker + toast queue |
| `src/components/DailyRewardModal.tsx` | New — reward modal UI |
| `src/components/AchievementToast.tsx` | New — toast banner |
| `src/components/AchievementsTab.tsx` | New — badge grid |
| `src/components/RivalsTab.tsx` | New — leaderboard comparison |
| `src/screens/Progress.tsx` | Add Achievements + Rivals tabs |
| `src/screens/WorldMap.tsx` | Wire hooks, render toast, trigger rare encounter |
| `src/hooks/useBattleEngine.ts` | Trigger `evolved` achievement after `evolvePlayer()` |
