# Phase B: Achievements, Daily Login Reward & Sibling Leaderboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three engagement features: a 20-badge achievement system, a 7-day daily login reward ladder with rare Pokémon encounter, and a Kayden vs Kaylie rivalry leaderboard.

**Architecture:** Snapshot-based achievement checker runs on WorldMap mount. Daily reward is client-side date comparison (no Cloud Functions). Leaderboard queries Firestore by profile name. All three hook into the existing WorldMap mount lifecycle and Progress screen.

**Tech Stack:** React 18 + TypeScript, Zustand (`useProfileStore`), Firebase Firestore (`updateProfile`), Tailwind CSS (existing class patterns), no new dependencies.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/game.ts` | Modify | Add 4 new fields to `Profile` |
| `src/data/achievements.ts` | Create | 20 achievement definitions |
| `src/hooks/useLoginReward.ts` | Create | Daily reward logic + rare encounter flag |
| `src/hooks/useAchievements.ts` | Create | Snapshot checker, toast queue |
| `src/components/DailyRewardModal.tsx` | Create | Full-screen daily reward UI |
| `src/components/AchievementToast.tsx` | Create | Toast banner for unlocks |
| `src/components/AchievementsTab.tsx` | Create | Badge grid for Progress screen |
| `src/components/RivalsTab.tsx` | Create | Leaderboard comparison |
| `src/screens/Progress.tsx` | Modify | Add Achievements + Rivals tabs |
| `src/screens/WorldMap.tsx` | Modify | Wire hooks, modal, toasts, rare encounter |
| `src/hooks/useBattleEngine.ts` | Modify | Trigger `evolved` achievement after evolution |

---

## Task 1: Profile schema — add 4 new fields

**Files:**
- Modify: `src/types/game.ts:124-154`

- [ ] **Step 1: Read the current Profile interface**

Open `src/types/game.ts`. The `Profile` interface starts around line 124 and ends around line 154. It currently has fields: `id`, `name`, `age`, `gender`, `pinHash`, `difficulty`, `starterPokemon`, `subjects`, `party`, `box`, `bag`, `pokedex`, `badges`, `money`, `currentRoute`, `playerX`, `playerY`, `stats`, `wrongAnswers`.

- [ ] **Step 2: Add the 4 new fields**

After the `badges: string[]` line, add:

```typescript
  achievements: string[]
  lastLoginDate: string
  loginStreak: number
  visitedRoutes: string[]
```

The full updated tail of the Profile interface should look like:

```typescript
  badges: string[]
  achievements: string[]
  lastLoginDate: string
  loginStreak: number
  visitedRoutes: string[]
  money: number
  currentRoute: string
  playerX: number
  playerY: number
  stats: {
    battlesWon: number
    questionsAnswered: number
    questionsCorrect: number
    questionsWrong: number
  }
  wrongAnswers: Array<{
    question: string
    givenAnswer: string
    correctAnswer: string
    subject: string
  }>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "C:\Users\derek\Documents\Project\My Pokemon"
npx tsc --noEmit
```

Expected: no errors. If you see errors about missing fields on existing profile literals, they are in `src/firebase.ts` or profile-creation code — add `achievements: [], lastLoginDate: '', loginStreak: 0, visitedRoutes: []` wherever a `Profile` object is created from scratch.

- [ ] **Step 4: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: add achievements/loginStreak/lastLoginDate/visitedRoutes to Profile type"
```

---

## Task 2: Achievement definitions

**Files:**
- Create: `src/data/achievements.ts`

- [ ] **Step 1: Create the file with all 20 definitions**

```typescript
import type { Profile } from '../types/game'

export interface AchievementDef {
  id: string
  name: string
  icon: string
  description: string   // shown when locked
  flavour: string       // shown when unlocked
  check: (profile: Profile) => boolean
}

function caughtCount(profile: Profile): number {
  return Object.values(profile.pokedex ?? {}).filter(v => v === 'caught').length
}

function seenCount(profile: Profile): number {
  return Object.values(profile.pokedex ?? {}).filter(v => v === 'seen' || v === 'caught').length
}

export const ALL_MAP_IDS = [
  'pallet', 'pokecenter', 'cinnabarPokecenter',
  'sunlitMeadow', 'viridianForest', 'flowerMeadow',
  'mistyLake', 'rockyCave', 'trainerRoad',
  'cinnabarTown', 'volcanoTrail',
]

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Battle ──────────────────────────────────────────────────────────
  {
    id: 'first_battle', name: 'First Victory', icon: '🥇',
    description: 'Win your first battle',
    flavour: 'Every champion starts somewhere!',
    check: p => (p.stats?.battlesWon ?? 0) >= 1,
  },
  {
    id: 'battle_10', name: 'Fighter', icon: '⚔️',
    description: 'Win 10 battles',
    flavour: 'You\'re getting the hang of this.',
    check: p => (p.stats?.battlesWon ?? 0) >= 10,
  },
  {
    id: 'battle_50', name: 'Warrior', icon: '🗡️',
    description: 'Win 50 battles',
    flavour: 'Battle-hardened and fearless.',
    check: p => (p.stats?.battlesWon ?? 0) >= 50,
  },
  {
    id: 'battle_100', name: 'Champion', icon: '👑',
    description: 'Win 100 battles',
    flavour: 'A true Pokémon Champion!',
    check: p => (p.stats?.battlesWon ?? 0) >= 100,
  },

  // ── Scholar ─────────────────────────────────────────────────────────
  {
    id: 'question_10', name: 'Student', icon: '✏️',
    description: 'Answer 10 questions correctly',
    flavour: 'Knowledge is power!',
    check: p => (p.stats?.questionsCorrect ?? 0) >= 10,
  },
  {
    id: 'question_50', name: 'Bookworm', icon: '📝',
    description: 'Answer 50 questions correctly',
    flavour: 'Your brain is your best weapon.',
    check: p => (p.stats?.questionsCorrect ?? 0) >= 50,
  },
  {
    id: 'question_100', name: 'Scholar', icon: '🎓',
    description: 'Answer 100 questions correctly',
    flavour: 'Top of the class!',
    check: p => (p.stats?.questionsCorrect ?? 0) >= 100,
  },
  {
    id: 'accuracy_80', name: 'Sharp Mind', icon: '🎯',
    description: 'Reach 80% accuracy (min 20 answered)',
    flavour: 'Precision is everything.',
    check: p => {
      const answered = p.stats?.questionsAnswered ?? 0
      const correct = p.stats?.questionsCorrect ?? 0
      return answered >= 20 && correct / answered >= 0.8
    },
  },

  // ── Streak ──────────────────────────────────────────────────────────
  {
    id: 'streak_3', name: 'On a Roll', icon: '🔥',
    description: 'Log in 3 days in a row',
    flavour: 'Keep the fire burning!',
    check: p => (p.loginStreak ?? 0) >= 3,
  },
  {
    id: 'streak_7', name: 'Dedicated Trainer', icon: '🌟',
    description: 'Log in 7 days in a row',
    flavour: 'Your dedication is unmatched.',
    check: p => (p.loginStreak ?? 0) >= 7,
  },

  // ── Game Progress ────────────────────────────────────────────────────
  {
    id: 'first_catch', name: 'First Catch', icon: '🎣',
    description: 'Catch your first Pokémon',
    flavour: 'Gotcha!',
    check: p => Object.values(p.pokedex ?? {}).some(v => v === 'caught'),
  },
  {
    id: 'catch_5', name: 'Collector', icon: '📦',
    description: 'Catch 5 Pokémon',
    flavour: 'Building a collection!',
    check: p => caughtCount(p) >= 5,
  },
  {
    id: 'catch_20', name: 'Master Catcher', icon: '🏆',
    description: 'Catch 20 Pokémon',
    flavour: 'You\'ve got quite the team!',
    check: p => caughtCount(p) >= 20,
  },
  {
    id: 'evolved', name: 'Evolved!', icon: '⭐',
    description: 'Evolve a Pokémon',
    flavour: 'The power of growth!',
    check: p => (p.achievements ?? []).includes('evolved'),
  },
  {
    id: 'full_party', name: 'Full Team', icon: '👥',
    description: 'Have 6 Pokémon in your party',
    flavour: 'A full squad is ready for anything.',
    check: p => (p.party ?? []).length >= 6,
  },
  {
    id: 'pokedex_30', name: 'Scout', icon: '📖',
    description: 'See 30 different Pokémon',
    flavour: 'The world is full of Pokémon!',
    check: p => seenCount(p) >= 30,
  },
  {
    id: 'pokedex_50', name: 'Researcher', icon: '📕',
    description: 'See 50 different Pokémon',
    flavour: 'A true Pokémon researcher!',
    check: p => seenCount(p) >= 50,
  },
  {
    id: 'explorer_3', name: 'Explorer', icon: '🗺️',
    description: 'Visit 3 different maps',
    flavour: 'Adventure awaits around every corner.',
    check: p => (p.visitedRoutes ?? []).length >= 3,
  },
  {
    id: 'explorer_all', name: 'Adventurer', icon: '🌍',
    description: 'Visit all maps',
    flavour: 'You\'ve seen it all!',
    check: p => (p.visitedRoutes ?? []).length >= ALL_MAP_IDS.length,
  },
  {
    id: 'rich_trainer', name: 'Rich Trainer', icon: '💰',
    description: 'Hold 2000₽ at once',
    flavour: 'Money talks!',
    check: p => (p.money ?? 0) >= 2000,
  },
]
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/achievements.ts
git commit -m "feat: add 20 achievement definitions"
```

---

## Task 3: useLoginReward hook

**Files:**
- Create: `src/hooks/useLoginReward.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useRef } from 'react'
import type { Profile, BagItem } from '../types/game'

export interface DayReward {
  day: number
  coins: number
  itemId: string | null
  itemName: string | null
  rareEncounter: boolean
}

export const REWARD_SCHEDULE: Record<number, DayReward> = {
  1: { day: 1, coins: 100,  itemId: null,          itemName: null,           rareEncounter: false },
  2: { day: 2, coins: 150,  itemId: null,          itemName: null,           rareEncounter: false },
  3: { day: 3, coins: 200,  itemId: 'potion',      itemName: 'Potion',       rareEncounter: false },
  4: { day: 4, coins: 250,  itemId: null,          itemName: null,           rareEncounter: false },
  5: { day: 5, coins: 300,  itemId: null,          itemName: null,           rareEncounter: false },
  6: { day: 6, coins: 350,  itemId: 'super-potion', itemName: 'Super Potion', rareEncounter: false },
  7: { day: 7, coins: 500,  itemId: 'rare-candy',  itemName: 'Rare Candy',   rareEncounter: true  },
}

export const RARE_ENCOUNTER_POOL = [147, 131, 133, 113, 143, 140, 138]
// Dratini, Lapras, Eevee, Chansey, Snorlax, Kabuto, Omanyte

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function applyItem(bag: BagItem[], itemId: string): BagItem[] {
  const existing = bag.find(b => b.itemId === itemId)
  if (existing) {
    return bag.map(b => b.itemId === itemId ? { ...b, qty: b.qty + 1 } : b)
  }
  return [...bag, { itemId, qty: 1 }]
}

export function useLoginReward(
  profile: Profile | null,
  profileId: string | undefined,
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>,
  setProfile: (p: Profile) => void,
) {
  const today = new Date().toISOString().slice(0, 10)

  // Compute reward state once on mount — profile ref guards against re-runs
  const computed = useRef(false)
  const [rewardReady, setRewardReady] = useState(false)
  const [todayReward, setTodayReward] = useState<DayReward>(REWARD_SCHEDULE[1])
  const [newStreak, setNewStreak] = useState(1)
  const pendingRareEncounterRef = useRef(false)

  useEffect(() => {
    if (!profile || !profileId || computed.current) return
    if ((profile.lastLoginDate ?? '') === today) return  // already claimed today
    computed.current = true

    const yesterday = addDays(today, -1)
    const streak = (profile.lastLoginDate ?? '') === yesterday
      ? Math.min((profile.loginStreak ?? 0) + 1, 7)
      : 1
    const reward = REWARD_SCHEDULE[streak]
    setNewStreak(streak)
    setTodayReward(reward)
    setRewardReady(true)
  }, [profile, profileId, today])

  function dismissReward() {
    if (!profile || !profileId) return
    const reward = REWARD_SCHEDULE[newStreak]
    const newMoney = (profile.money ?? 0) + reward.coins
    const newBag = reward.itemId ? applyItem(profile.bag ?? [], reward.itemId) : (profile.bag ?? [])
    const updates: Partial<Profile> = {
      money: newMoney,
      bag: newBag,
      lastLoginDate: today,
      loginStreak: newStreak,
    }
    // Optimistic local update
    setProfile({ ...profile, ...updates })
    updateProfile(profileId, updates).catch(() => {})
    if (reward.rareEncounter) pendingRareEncounterRef.current = true
    setRewardReady(false)
  }

  return { rewardReady, todayReward, newStreak, dismissReward, pendingRareEncounterRef }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useLoginReward.ts
git commit -m "feat: useLoginReward hook — 7-day streak with rare encounter"
```

---

## Task 4: useAchievements hook

**Files:**
- Create: `src/hooks/useAchievements.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useState, useEffect, useRef } from 'react'
import { ACHIEVEMENTS, AchievementDef } from '../data/achievements'
import type { Profile } from '../types/game'

export function useAchievements(
  profile: Profile | null,
  profileId: string | undefined,
  rewardReady: boolean,
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>,
  setProfile: (p: Profile) => void,
) {
  const [toastQueue, setToastQueue] = useState<AchievementDef[]>([])
  const checked = useRef(false)

  useEffect(() => {
    // Wait until daily reward has been shown (or skipped) before checking
    if (rewardReady) return
    if (!profile || !profileId || checked.current) return
    checked.current = true

    const unlocked = profile.achievements ?? []
    const newlyUnlocked = ACHIEVEMENTS.filter(
      def => !unlocked.includes(def.id) && def.check(profile)
    )
    if (newlyUnlocked.length === 0) return

    const updatedAchievements = [...unlocked, ...newlyUnlocked.map(d => d.id)]
    setProfile({ ...profile, achievements: updatedAchievements })
    updateProfile(profileId, { achievements: updatedAchievements }).catch(() => {})
    setToastQueue(newlyUnlocked)
  }, [profile, profileId, rewardReady])

  function dismissToast(id: string) {
    setToastQueue(q => q.filter(a => a.id !== id))
  }

  return { toastQueue, dismissToast }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAchievements.ts
git commit -m "feat: useAchievements snapshot checker with toast queue"
```

---

## Task 5: DailyRewardModal component

**Files:**
- Create: `src/components/DailyRewardModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { REWARD_SCHEDULE, DayReward } from '../hooks/useLoginReward'

interface Props {
  streak: number           // current new streak (1–7)
  todayReward: DayReward
  onCollect: () => void
}

export default function DailyRewardModal({ streak, todayReward, onCollect }: Props) {
  const daysUntil3 = Math.max(0, 3 - streak)
  const daysUntil7 = Math.max(0, 7 - streak)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ fontFamily: 'Georgia, serif', color: '#fff', textAlign: 'center', maxWidth: 360, width: '100%' }}>

        {/* Title */}
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>🌟 Daily Login Reward!</div>
        <div style={{ color: '#aaa', fontSize: 14, marginBottom: 24 }}>Day {streak} streak</div>

        {/* Today's reward */}
        <div style={{
          background: '#1a1a2e', borderRadius: 16, padding: '20px 24px',
          border: '2px solid #c8a820', marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, color: '#c8a820', marginBottom: 8, fontWeight: 600 }}>TODAY'S REWARD</div>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🪙</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ffd700' }}>+{todayReward.coins}₽</div>
          {todayReward.itemName && (
            <div style={{ fontSize: 16, color: '#80c060', marginTop: 8 }}>+ {todayReward.itemName} 💊</div>
          )}
          {todayReward.rareEncounter && (
            <div style={{ fontSize: 16, color: '#ff79c6', marginTop: 8 }}>+ Rare Pokémon encounter! 🦕</div>
          )}
        </div>

        {/* Preview strip */}
        <div style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.8 }}>
          {streak < 3 && (
            <div>📅 Day 3 in {daysUntil3} day{daysUntil3 !== 1 ? 's' : ''}: 200₽ + Potion 💊</div>
          )}
          {streak < 7 && (
            <div>🦕 Day 7 in {daysUntil7} day{daysUntil7 !== 1 ? 's' : ''}: 500₽ + Rare Candy + Rare Pokémon!</div>
          )}
          {streak === 7 && (
            <div style={{ color: '#ff79c6', fontWeight: 600 }}>Today's the big day! 🦕 A rare Pokémon awaits!</div>
          )}
        </div>

        {/* 7-dot progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1,2,3,4,5,6,7].map(d => (
            <div key={d} style={{
              width: 12, height: 12, borderRadius: '50%',
              background: d < streak ? '#c8a820' : d === streak ? '#fff' : '#333',
              boxShadow: d === streak ? '0 0 8px #fff' : 'none',
            }} />
          ))}
        </div>

        {/* Collect button */}
        <button
          onClick={onCollect}
          style={{
            background: '#c8a820', color: '#000', border: 'none',
            borderRadius: 12, padding: '14px 48px',
            fontSize: 18, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'Georgia, serif',
          }}
        >
          Collect!
        </button>
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
git add src/components/DailyRewardModal.tsx
git commit -m "feat: DailyRewardModal component with streak preview"
```

---

## Task 6: AchievementToast component

**Files:**
- Create: `src/components/AchievementToast.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useEffect, useState } from 'react'
import { AchievementDef } from '../data/achievements'

interface Props {
  toastQueue: AchievementDef[]
  onDismiss: (id: string) => void
}

export default function AchievementToast({ toastQueue, onDismiss }: Props) {
  // Auto-dismiss each toast after 3s
  useEffect(() => {
    if (toastQueue.length === 0) return
    const timers = toastQueue.map((a, i) =>
      setTimeout(() => onDismiss(a.id), 3000 + i * 500)
    )
    return () => timers.forEach(clearTimeout)
  }, [toastQueue.map(a => a.id).join(',')])

  if (toastQueue.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 65, display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none', width: 'max-content', maxWidth: '90vw',
    }}>
      {toastQueue.map((a, i) => (
        <div
          key={a.id}
          style={{
            background: 'rgba(0,0,0,0.88)',
            border: '1px solid #c8a820',
            borderRadius: 10,
            padding: '10px 20px',
            color: '#c8a820',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'Georgia, serif',
            textAlign: 'center',
            animation: 'slideDown 0.3s ease-out',
            animationDelay: `${i * 100}ms`,
            animationFillMode: 'both',
          }}
        >
          🏆 Achievement Unlocked: {a.name}!
        </div>
      ))}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
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
git add src/components/AchievementToast.tsx
git commit -m "feat: AchievementToast component with auto-dismiss"
```

---

## Task 7: AchievementsTab component

**Files:**
- Create: `src/components/AchievementsTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { useState } from 'react'
import { ACHIEVEMENTS } from '../data/achievements'
import type { Profile } from '../types/game'

interface Props {
  profile: Profile
}

export default function AchievementsTab({ profile }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const unlocked = profile.achievements ?? []
  const unlockedCount = ACHIEVEMENTS.filter(a => unlocked.includes(a.id)).length

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{
        color: '#4ecdc4', fontWeight: 700, fontSize: 14,
        marginBottom: 12, textAlign: 'center',
      }}>
        {unlockedCount} / {ACHIEVEMENTS.length} unlocked
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
        gap: 10,
      }}>
        {ACHIEVEMENTS.map(a => {
          const isUnlocked = unlocked.includes(a.id)
          const isSelected = selected === a.id
          return (
            <div
              key={a.id}
              onClick={() => setSelected(isSelected ? null : a.id)}
              style={{
                background: isUnlocked ? '#1a2540' : '#111',
                border: isUnlocked ? '1px solid #c8a820' : '1px solid #2a3a5a',
                borderRadius: 12, padding: '10px 6px',
                textAlign: 'center', cursor: 'pointer',
                opacity: isUnlocked ? 1 : 0.45,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ fontSize: isUnlocked ? 28 : 20, filter: isUnlocked ? 'none' : 'grayscale(1)' }}>
                {a.icon}
              </div>
              <div style={{
                color: isUnlocked ? '#fff' : '#555',
                fontSize: 10, marginTop: 4, lineHeight: 1.3, fontWeight: 600,
              }}>
                {a.name}
              </div>
            </div>
          )
        })}
      </div>

      {/* Detail panel for selected achievement */}
      {selected && (() => {
        const a = ACHIEVEMENTS.find(x => x.id === selected)!
        const isUnlocked = unlocked.includes(a.id)
        return (
          <div style={{
            marginTop: 16, background: '#16213e',
            border: '1px solid #2a3a5a', borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>{a.icon}</div>
            <div style={{ color: '#fff', fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>{a.name}</div>
            <div style={{ color: '#4a6a8a', fontSize: 13, textAlign: 'center' }}>
              {isUnlocked ? a.flavour : a.description}
            </div>
          </div>
        )
      })()}
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
git add src/components/AchievementsTab.tsx
git commit -m "feat: AchievementsTab badge grid with tap-to-detail"
```

---

## Task 8: RivalsTab component

**Files:**
- Create: `src/components/RivalsTab.tsx`

The Firestore `db` instance is exported from `src/firebase.ts` as `export { db }`. The `getDocs` and `collection` functions are from `firebase/firestore`.

- [ ] **Step 1: Check the Firebase import pattern**

Read `src/firebase.ts`. Find how `db` is exported. It should be something like `export { db }` or `export const db = getFirestore(app)`. Note the exact export name.

- [ ] **Step 2: Create the component**

```tsx
import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import type { Profile } from '../types/game'

interface RivalData {
  name: string
  battlesWon: number
  pokedexSeen: number
  loginStreak: number
}

function toRival(doc: Profile & { id?: string }): RivalData {
  const seen = Object.values(doc.pokedex ?? {}).filter(v => v === 'caught' || v === 'seen').length
  return {
    name: doc.name,
    battlesWon: doc.stats?.battlesWon ?? 0,
    pokedexSeen: seen,
    loginStreak: doc.loginStreak ?? 0,
  }
}

export default function RivalsTab() {
  const [kayden, setKayden] = useState<RivalData | null>(null)
  const [kaylie, setKaylie] = useState<RivalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(collection(db, 'profiles')).then(snap => {
      snap.forEach(d => {
        const data = d.data() as Profile
        if (data.name === 'Kayden') setKayden(toRival(data))
        if (data.name === 'Kaylie') setKaylie(toRival(data))
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ color: '#4a6a8a', textAlign: 'center', padding: 24 }}>Loading...</div>
  }

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 12,
      }}>
        {[kayden, kaylie].map((rival, i) => (
          <div key={i} style={{
            background: '#16213e', borderRadius: 14,
            border: '1px solid #2a3a5a', padding: '16px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{i === 0 ? '🔵' : '🩷'}</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              {rival ? rival.name : (i === 0 ? 'Kayden' : 'Kaylie')}
            </div>
            {rival ? (
              <>
                <StatRow
                  emoji="⚔️" label="Battles Won" value={rival.battlesWon}
                  isLeading={
                    kayden && kaylie
                      ? (i === 0 ? rival.battlesWon >= kaylie.battlesWon : rival.battlesWon >= kayden.battlesWon)
                      : false
                  }
                />
                <StatRow
                  emoji="📖" label="Pokédex Seen" value={rival.pokedexSeen}
                  isLeading={
                    kayden && kaylie
                      ? (i === 0 ? rival.pokedexSeen >= kaylie.pokedexSeen : rival.pokedexSeen >= kayden.pokedexSeen)
                      : false
                  }
                />
                <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 10 }}>
                  🔥 {rival.loginStreak}-day streak
                </div>
              </>
            ) : (
              <div style={{ color: '#4a6a8a', fontSize: 13 }}>Not started yet</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatRow({ emoji, label, value, isLeading }: {
  emoji: string; label: string; value: number; isLeading: boolean
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 20 }}>{isLeading ? '👑' : ''}{emoji} {value}</div>
      <div style={{ color: '#4a6a8a', fontSize: 11 }}>{label}</div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/RivalsTab.tsx
git commit -m "feat: RivalsTab leaderboard — Kayden vs Kaylie"
```

---

## Task 9: Update Progress screen — add Achievements and Rivals tabs

**Files:**
- Modify: `src/screens/Progress.tsx`

The current Progress.tsx is a single scrollable page (no tabs). We need to add tab navigation at the top and render the correct tab.

- [ ] **Step 1: Read the full Progress.tsx**

Read `src/screens/Progress.tsx` in full to understand the current structure before editing.

- [ ] **Step 2: Add tab state and imports**

At the top of the file, add imports for the two new tab components:

```typescript
import AchievementsTab from '../components/AchievementsTab'
import RivalsTab from '../components/RivalsTab'
```

Inside the `Progress()` function, add tab state after the existing variables:

```typescript
const [activeTab, setActiveTab] = useState<'stats' | 'achievements' | 'rivals'>('stats')
```

- [ ] **Step 3: Add the tab bar**

Replace the opening `<div className="flex flex-col gap-4 p-4">` block with a tab bar + conditional rendering. Add this immediately after the header `</div>`:

```tsx
{/* Tab bar */}
<div className="flex border-b border-[#2a3a5a] bg-[#0f3460] px-4 flex-shrink-0">
  {([['stats', '📊 Stats'], ['achievements', '🏆 Badges'], ['rivals', '⚔️ Rivals']] as const).map(([tab, label]) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className="px-4 py-3 text-sm font-semibold flex-1"
      style={{
        color: activeTab === tab ? '#c8a820' : '#4a6a8a',
        borderBottom: activeTab === tab ? '2px solid #c8a820' : '2px solid transparent',
        background: 'none', border: 'none',
        borderBottom: activeTab === tab ? '2px solid #c8a820' : '2px solid transparent',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  ))}
</div>

{/* Tab content */}
<div className="flex-1 overflow-y-auto p-4">
  {activeTab === 'stats' && (
    <div className="flex flex-col gap-4">
      {/* existing stats content goes here — move it inside this block */}
    </div>
  )}
  {activeTab === 'achievements' && <AchievementsTab profile={profile} />}
  {activeTab === 'rivals' && <RivalsTab />}
</div>
```

Move the existing stats content (the grid of StatCards, Quiz detail block, Badges block, and My Team block) inside the `activeTab === 'stats'` block.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Progress.tsx
git commit -m "feat: Progress screen — add Achievements and Rivals tabs"
```

---

## Task 10: Wire everything into WorldMap

**Files:**
- Modify: `src/screens/WorldMap.tsx`

WorldMap.tsx is ~1900 lines. Make targeted additions in specific locations.

- [ ] **Step 1: Add imports at the top**

After the existing imports, add:

```typescript
import { useLoginReward, RARE_ENCOUNTER_POOL } from '../hooks/useLoginReward'
import { useAchievements } from '../hooks/useAchievements'
import DailyRewardModal from '../components/DailyRewardModal'
import AchievementToast from '../components/AchievementToast'
```

- [ ] **Step 2: Get profileId and setProfile from store**

Find the line `const { updateProfile } = useFirestoreProfile()` (around line 345). After it, add:

```typescript
const setProfile = useProfileStore(s => s.setProfile)
const profileId = profile?.id
```

- [ ] **Step 3: Call the hooks**

After the existing `useState`/`useRef` declarations block (before the first `useEffect`), add:

```typescript
const { rewardReady, todayReward, newStreak, dismissReward, pendingRareEncounterRef } =
  useLoginReward(profile, profileId, updateProfile, setProfile)

const { toastQueue, dismissToast } =
  useAchievements(profile, profileId, rewardReady, updateProfile, setProfile)
```

- [ ] **Step 4: Track visitedRoutes on map change**

Find where `setCurrentMapId` is called when the player moves to a new map (search for `currentRoute: exit.targetMap`). It's around line 1408:

```typescript
const posUpdate = { currentRoute: exit.targetMap, playerX: exit.targetX, playerY: exit.targetY }
```

After setting the new map, add a visitedRoutes update. Find the nearest `updateProfileRef.current(cp.id, posUpdate)` call and add:

```typescript
const cp = useProfileStore.getState().profile
if (cp && !(cp.visitedRoutes ?? []).includes(exit.targetMap)) {
  const newVisited = [...(cp.visitedRoutes ?? []), exit.targetMap]
  useProfileStore.getState().setProfile({ ...cp, visitedRoutes: newVisited })
  updateProfileRef.current(cp.id, { ...posUpdate, visitedRoutes: newVisited }).catch(() => {})
} else {
  updateProfileRef.current(cp.id, posUpdate).catch(() => {})
}
```

Also ensure the player's starting map is in visitedRoutes on first load. Find the main `useEffect` that runs once on mount (where `prefetchQuestionsForProfile` is called) and add:

```typescript
// Track starting map in visitedRoutes
const p = useProfileStore.getState().profile
if (p && !(p.visitedRoutes ?? []).includes(currentMapId)) {
  const newVisited = [...(p.visitedRoutes ?? []), currentMapId]
  useProfileStore.getState().setProfile({ ...p, visitedRoutes: newVisited })
  updateProfileRef.current(p.id, { visitedRoutes: newVisited }).catch(() => {})
}
```

- [ ] **Step 5: Handle Day 7 rare encounter after reward dismiss**

Find `function startWildBattle(playerX: number, playerY: number)` (around line 1586). Add a new function just before it:

```typescript
function startRareEncounter() {
  if (!profile) return
  const rarePokemonId = RARE_ENCOUNTER_POOL[Math.floor(Math.random() * RARE_ENCOUNTER_POOL.length)]
  const level = 15 + Math.floor(Math.random() * 11)  // 15–25
  const pokemonData = pokemonMap[rarePokemonId]
  if (!pokemonData) return
  const opponent = buildPartyPokemon(pokemonData, level)
  const currentProfile = useProfileStore.getState().profile
  if (!currentProfile) return
  const fullParty = currentProfile.party ?? []
  const partyIndexMap = fullParty.map((_, i) => i)
  const player = fullParty[0]
  if (!player) return
  useBattleStore.getState().startWildBattle(player, opponent, fullParty, partyIndexMap)
  navigate('/battle')
}
```

In the `dismissReward` handler wiring, add an effect to trigger rare encounter after reward is dismissed:

```typescript
useEffect(() => {
  if (!rewardReady && pendingRareEncounterRef.current) {
    pendingRareEncounterRef.current = false
    setTimeout(() => startRareEncounter(), 400)
  }
}, [rewardReady])
```

- [ ] **Step 6: Render the modal and toast**

In the component's `return` statement, find the closing `</div>` of the root element and add before it:

```tsx
{rewardReady && (
  <DailyRewardModal
    streak={newStreak}
    todayReward={todayReward}
    onCollect={dismissReward}
  />
)}
<AchievementToast toastQueue={toastQueue} onDismiss={dismissToast} />
```

- [ ] **Step 7: Type-check and build**

```bash
npx tsc --noEmit
npm run build
```

Expected: no TypeScript errors and clean build.

- [ ] **Step 8: Commit**

```bash
git add src/screens/WorldMap.tsx
git commit -m "feat: wire daily reward, achievements, and rare encounter into WorldMap"
```

---

## Task 11: Trigger `evolved` achievement in useBattleEngine

**Files:**
- Modify: `src/hooks/useBattleEngine.ts`

- [ ] **Step 1: Find the evolvePlayer call**

Search for `store.evolvePlayer` in `src/hooks/useBattleEngine.ts`. It's in the `handleWin` function around line 450:

```typescript
store.evolvePlayer(pokeInfo.evolvesTo, evolvedData?.name ?? getName(playerPokemon))
```

- [ ] **Step 2: Add achievement unlock after evolution**

After `store.evolvePlayer(...)`, add:

```typescript
// Unlock 'evolved' achievement if not already unlocked
const currentProfile = useProfileStore.getState().profile
const updateProfile = updateProfileRef.current
if (currentProfile?.id && !(currentProfile.achievements ?? []).includes('evolved')) {
  const updated = [...(currentProfile.achievements ?? []), 'evolved']
  useProfileStore.getState().setProfile({ ...currentProfile, achievements: updated })
  updateProfile(currentProfile.id, { achievements: updated }).catch(() => {})
}
```

- [ ] **Step 3: Verify useProfileStore is imported**

Check the top of `useBattleEngine.ts` for `import { useProfileStore }`. If it's not there, add:

```typescript
import { useProfileStore } from '../store/profileStore'
```

Also verify that `updateProfileRef` exists in the file. If the hook uses `updateProfile` directly (not via ref), adapt accordingly — use whatever pattern the file already follows for calling `updateProfile`.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBattleEngine.ts
git commit -m "feat: unlock evolved achievement after first evolution"
```

---

## Task 12: Build and deploy

**Files:**
- No code changes

- [ ] **Step 1: Final build**

```bash
cd "C:\Users\derek\Documents\Project\My Pokemon"
npm run build
```

Expected: clean build, bundle ~1MB.

- [ ] **Step 2: Copy to website repo**

```powershell
Copy-Item -Path "C:\Users\derek\Documents\Project\My Pokemon\dist\*" `
  -Destination "C:\Users\derek\Documents\Project\jd-partners-website\games\mypokemon\" `
  -Recurse -Force
```

- [ ] **Step 3: Clean up old bundles**

```powershell
$assetsDir = "C:\Users\derek\Documents\Project\jd-partners-website\games\mypokemon\assets"
$newJs = Get-ChildItem $assetsDir -Filter "*.js" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$newCss = Get-ChildItem $assetsDir -Filter "*.css" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Get-ChildItem $assetsDir -Filter "*.js" | Where-Object { $_.Name -ne $newJs.Name } | Remove-Item -Force
Get-ChildItem $assetsDir -Filter "*.css" | Where-Object { $_.Name -ne $newCss.Name } | Remove-Item -Force
```

- [ ] **Step 4: Commit and push**

```bash
cd "C:\Users\derek\Documents\Project\jd-partners-website"
git add games/mypokemon/
git commit -m "feat: Phase B — achievements, daily reward, sibling leaderboard"
git push
```

Expected: GitHub Actions deploys to `https://www.jdpartners.co/games/mypokemon/`.
