# Heal, EXP, Evolution, Bag & Pokémart — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement five Ruby-accurate game mechanics: Pokémon Center healing, EXP bar with level-up flash, evolution animation, bag/item system, and in-battle item use.

**Architecture:** Each mechanic is self-contained. Tasks are ordered by dependency — items data and bag type must come before Pokémart and in-battle use. EXP bar before evolution animation (shares the same win-sequence flow).

**Tech Stack:** React 18 + TypeScript + Tailwind CSS, Zustand (battleStore + profileStore), Firebase Firestore via `useFirestoreProfile.updateProfile`, existing utilities in `src/utils/exp.ts`.

---

## Key file locations (read these before starting any task)

| File | Purpose |
|------|---------|
| `src/types/game.ts` | Profile, PartyPokemon, BattlePhase types |
| `src/store/battleStore.ts` | Battle state + actions |
| `src/screens/Battle.tsx` | Battle UI — add EXP bar, evolution overlay, BAG button |
| `src/hooks/useBattleEngine.ts` | Battle logic — handleWin, opponentTurn |
| `src/screens/WorldMap.tsx` | Map — add door interactions, Pokémart NPC |
| `src/maps/palletTown.ts` | Pallet Town map data — add pokecenter/shop doors |
| `src/maps/types.ts` | MapData types — add door metadata |
| `src/utils/exp.ts` | `expForLevel(level)` already exists |
| `src/hooks/useFirestoreProfile.ts` | `updateProfile(id, updates)` — use to persist bag/heal changes |

---

## Task 1: Pokémon Center heal

**Files:**
- Modify: `src/maps/types.ts`
- Modify: `src/maps/palletTown.ts`
- Modify: `src/screens/WorldMap.tsx`

Pallet Town already has two buildings with `door` tiles at `(3,4)` and `(10,4)`. The left one `(3,4)` is the Pokémon Center. Currently all doors are treated the same (no interaction). We need door metadata on the map so the engine knows what each door does.

- [ ] **Step 1: Add door interactions to map types**

In `src/maps/types.ts`, add a `DoorInteraction` type and `doors` array to `MapData`:

```ts
export type DoorInteractionType = 'pokecenter' | 'pokemart' | 'home' | 'gym'

export interface DoorInteraction {
  x: number
  y: number
  type: DoorInteractionType
}

export interface MapData {
  id: string
  name: string
  width: number
  height: number
  tiles: TileType[][]
  wildPokemon: WildEntry[]
  trainers: TrainerNpc[]
  exits: Exit[]
  doors: DoorInteraction[]   // ← add this
}
```

- [ ] **Step 2: Add doors to palletTown map data**

In `src/maps/palletTown.ts`, add the `doors` array:

```ts
export const palletTown: MapData = {
  // ... existing fields ...
  doors: [
    { x: 3, y: 4, type: 'pokecenter' },
    { x: 10, y: 4, type: 'home' },
  ],
}
```

Also add `doors: []` to `src/maps/route1.ts` so it satisfies the updated type.

- [ ] **Step 3: Add doors: [] to route1 map**

In `src/maps/route1.ts`, add `doors: []` to the MapData object (it has no special doors).

- [ ] **Step 4: Handle door interactions in WorldMap**

In `src/screens/WorldMap.tsx`, detect when player steps onto a door tile and check the map's `doors` array. Add a `healDialogue` state to show the Pokémon Center message.

Add state near the top of the component:
```tsx
const [healDialogue, setHealDialogue] = useState<string | null>(null)
```

In the `move` callback, after checking for exits and trainer vision, add a door check before the grass encounter check:

```tsx
// Check door interactions
const door = map.doors.find(d => d.x === nx && d.y === ny)
if (door?.type === 'pokecenter') {
  setDialogue("Nurse Joy: Welcome! We'll restore your Pokémon to full health. ♥")
  setTimeout(() => healParty(), 1200)
  return prevPy
}
```

Add a `healParty` function inside the component (below `startTrainerBattle`):

```tsx
async function healParty() {
  if (!profile?.id || !profile.party?.length) return
  const healedParty = profile.party.map(p => ({ ...p, currentHp: p.maxHp }))
  try {
    await updateProfile(profile.id, { party: healedParty })
    useProfileStore.getState().setProfile({ ...profile, party: healedParty })
    setDialogue('All your Pokémon have been healed! ♥')
  } catch {
    setDialogue('Healing failed — please try again.')
  }
}
```

Import `useFirestoreProfile` and `useProfileStore` (both already imported in related files — add to WorldMap.tsx imports):

```tsx
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import { useProfileStore } from '../store/profileStore'
```

Add the hook call near the top of the component:
```tsx
const { updateProfile } = useFirestoreProfile()
```

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/maps/types.ts src/maps/palletTown.ts src/maps/route1.ts src/screens/WorldMap.tsx
git commit -m "feat: add Pokemon Center heal interaction on map"
```

---

## Task 2: EXP bar on battle screen + level-up flash

**Files:**
- Modify: `src/store/battleStore.ts`
- Modify: `src/screens/Battle.tsx`
- Modify: `src/hooks/useBattleEngine.ts`

The EXP bar sits below the player HP box. It shows progress from current level's XP floor to next level's XP ceiling. After winning, the bar animates filling before the win phase is set.

- [ ] **Step 1: Add expAnimating flag to battleStore**

In `src/store/battleStore.ts`, add to `BattleState`:
```ts
expAnimating: boolean
leveledUp: boolean
setExpAnimating: (v: boolean) => void
setLeveledUp: (v: boolean) => void
```

In the `create` call, add:
```ts
expAnimating: false,
leveledUp: false,
setExpAnimating: (v) => set({ expAnimating: v }),
setLeveledUp: (v) => set({ leveledUp: v }),
```

In `initialState`, add:
```ts
expAnimating: false,
leveledUp: false,
```

- [ ] **Step 2: Signal level-up in useBattleEngine handleWin**

In `src/hooks/useBattleEngine.ts`, inside `handleWin`, after computing `newLevel`:

```ts
store.setExpAnimating(true)
await delay(1000)   // EXP bar fill animation duration
store.setExpAnimating(false)

if (newLevel > playerPokemon.level) {
  store.setLeveledUp(true)
  store.addLog(`${getName(playerPokemon)} grew to Lv.${newLevel}!`)
  await delay(800)
  store.setLeveledUp(false)
  // ... existing evolution check ...
}
```

- [ ] **Step 3: Add EXP bar to Battle.tsx**

Import `expForLevel` at the top of `src/screens/Battle.tsx`:
```tsx
import { expForLevel } from '../utils/exp'
```

Also destructure `expAnimating` and `leveledUp` from `useBattleStore`:
```tsx
const { playerPokemon, opponentPokemon, phase, question, selectedMoveIndex, log, expAnimating, leveledUp } = useBattleStore()
```

In the player's HP card (bottom-left of battle scene), add the EXP bar after the `currentHp/maxHp` line:

```tsx
{/* EXP bar */}
{(() => {
  const lvFloor = expForLevel(playerPokemon.level)
  const lvCeil  = expForLevel(playerPokemon.level + 1)
  const pct = Math.min(1, (playerPokemon.xp - lvFloor) / (lvCeil - lvFloor))
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[9px] text-gray-500">
        <span>EXP</span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-400 rounded-full"
          style={{
            width: `${pct * 100}%`,
            transition: expAnimating ? 'width 1s ease-out' : 'none',
          }}
        />
      </div>
    </div>
  )
})()}
```

Add level-up flash: wrap the player's stat card `div` with a conditional border:
```tsx
<div className={`bg-white/90 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 min-w-32 transition-all ${leveledUp ? 'ring-2 ring-yellow-400 shadow-yellow-400/60 shadow-lg' : ''}`}>
```

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/store/battleStore.ts src/screens/Battle.tsx src/hooks/useBattleEngine.ts
git commit -m "feat: add EXP bar and level-up flash to battle screen"
```

---

## Task 3: Evolution animation

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/store/battleStore.ts`
- Modify: `src/screens/Battle.tsx`
- Modify: `src/hooks/useBattleEngine.ts`

Evolution shows a full-screen white flash while the sprite swaps. Three cycles: flash white → show new sprite → flash white → done.

- [ ] **Step 1: Add 'evolving' to BattlePhase**

In `src/types/game.ts`, add `'evolving'` to `BattlePhase`:
```ts
export type BattlePhase =
  | 'idle' | 'player_turn' | 'question' | 'animating'
  | 'opponent_turn' | 'catch' | 'win' | 'lose' | 'escaped' | 'evolving'
```

- [ ] **Step 2: Trigger evolution phase in useBattleEngine**

In `src/hooks/useBattleEngine.ts` inside `handleWin`, replace the evolution block:

```ts
if (
  pokeInfo?.evolvesAtLevel &&
  newLevel >= pokeInfo.evolvesAtLevel &&
  pokeInfo.evolvesTo != null
) {
  const evolvedData = pokemonMap[pokeInfo.evolvesTo]
  store.setPhase('evolving')           // trigger animation
  await delay(2400)                    // 3 × (400ms white + 400ms normal)
  store.evolvePlayer(pokeInfo.evolvesTo, evolvedData?.name ?? getName(playerPokemon))
  store.addLog(`${getName(playerPokemon)} evolved into ${evolvedData?.name ?? 'a new form'}!`)
  await delay(600)
}
```

- [ ] **Step 3: Add evolution overlay to Battle.tsx**

In `src/screens/Battle.tsx`, add a `flashOn` state to drive the CSS animation:
```tsx
import { useEffect, useState } from 'react'

const [flashOn, setFlashOn] = useState(false)

useEffect(() => {
  if (phase !== 'evolving') { setFlashOn(false); return }
  // 3 flash cycles: white 400ms → off 400ms
  let on = true
  setFlashOn(true)
  const timers: ReturnType<typeof setTimeout>[] = []
  ;[400, 800, 1200, 1600, 2000].forEach((ms, i) => {
    timers.push(setTimeout(() => setFlashOn(i % 2 === 0 ? false : true), ms))
  })
  timers.push(setTimeout(() => setFlashOn(false), 2400))
  return () => timers.forEach(clearTimeout)
}, [phase])
```

Add the overlay at the bottom of the return, inside the outer `div`, before the closing tag:
```tsx
{/* Evolution flash overlay */}
{phase === 'evolving' && (
  <div
    className="absolute inset-0 z-50 pointer-events-none transition-opacity duration-300"
    style={{ backgroundColor: 'white', opacity: flashOn ? 1 : 0 }}
  />
)}
```

Make the outer `div` `relative`:
```tsx
<div className="min-h-screen bg-[#1a1a2e] flex flex-col relative">
```

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/types/game.ts src/store/battleStore.ts src/screens/Battle.tsx src/hooks/useBattleEngine.ts
git commit -m "feat: add evolution white-flash animation"
```

---

## Task 4: Bag system + Pokémart

**Files:**
- Create: `src/data/items.json`
- Modify: `src/types/game.ts`
- Modify: `src/hooks/useFirestoreProfile.ts`
- Modify: `src/maps/types.ts`
- Modify: `src/maps/palletTown.ts`
- Create: `src/components/ShopModal.tsx`
- Modify: `src/screens/WorldMap.tsx`

- [ ] **Step 1: Create items data file**

Create `src/data/items.json`:
```json
[
  {
    "id": "potion",
    "name": "Potion",
    "description": "Restores 20 HP",
    "price": 300,
    "effect": "heal",
    "power": 20
  },
  {
    "id": "super-potion",
    "name": "Super Potion",
    "description": "Restores 50 HP",
    "price": 700,
    "effect": "heal",
    "power": 50
  },
  {
    "id": "hyper-potion",
    "name": "Hyper Potion",
    "description": "Restores 200 HP",
    "price": 1200,
    "effect": "heal",
    "power": 200
  },
  {
    "id": "revive",
    "name": "Revive",
    "description": "Revives a fainted Pokémon to half HP",
    "price": 1500,
    "effect": "revive",
    "power": 0
  }
]
```

- [ ] **Step 2: Add BagItem type and bag to Profile**

In `src/types/game.ts`, add after the `BoxPokemon` interface:
```ts
export interface BagItem {
  itemId: string
  qty: number
}

export interface ItemData {
  id: string
  name: string
  description: string
  price: number
  effect: 'heal' | 'revive'
  power: number
}
```

Add `bag: BagItem[]` to `Profile`:
```ts
export interface Profile {
  // ... existing fields ...
  bag: BagItem[]
  // ...
}
```

- [ ] **Step 3: Update createDefaultProfile to include empty bag**

In `src/hooks/useFirestoreProfile.ts`, add `bag: []` to the return of `createDefaultProfile`:
```ts
return {
  name, age, gender, difficulty, starterPokemon,
  subjects: defaultSubjects(),
  party: [],
  box: [],
  bag: [],          // ← add this
  pokedex: { [starterId]: 'caught' },
  // ... rest unchanged ...
}
```

- [ ] **Step 4: Add pokemart door type and shop NPC to palletTown**

In `src/maps/types.ts`, add `'pokemart'` to `DoorInteractionType` (already included in Task 1, no change needed if Task 1 was done).

In `src/maps/palletTown.ts`, update doors to add the Pokémart:
```ts
doors: [
  { x: 3,  y: 4, type: 'pokecenter' },
  { x: 10, y: 4, type: 'pokemart'   },
],
```

- [ ] **Step 5: Create ShopModal component**

Create `src/components/ShopModal.tsx`:

```tsx
import itemsJson from '../data/items.json'
import type { ItemData, Profile } from '../types/game'

const ITEMS = itemsJson as ItemData[]

interface Props {
  profile: Profile
  onBuy: (itemId: string) => void
  onClose: () => void
}

export default function ShopModal({ profile, onBuy, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="w-full max-w-sm bg-[#0f3460] border-t-2 border-yellow-400 rounded-t-2xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-yellow-400 font-bold">Pokémart</h2>
          <span className="text-white text-sm">₽{profile.money.toLocaleString()}</span>
        </div>
        <div className="flex flex-col gap-2">
          {ITEMS.map(item => {
            const owned = profile.bag.find(b => b.itemId === item.id)?.qty ?? 0
            const canAfford = profile.money >= item.price
            return (
              <div key={item.id} className="flex justify-between items-center bg-[#1a1a2e] rounded-xl px-3 py-2">
                <div>
                  <div className="text-white font-bold text-sm">{item.name}</div>
                  <div className="text-gray-400 text-xs">{item.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  {owned > 0 && <span className="text-gray-400 text-xs">×{owned}</span>}
                  <button
                    onClick={() => onBuy(item.id)}
                    disabled={!canAfford}
                    className="bg-yellow-400 disabled:bg-gray-600 text-black disabled:text-gray-400 font-bold text-xs px-3 py-1 rounded-lg"
                  >
                    ₽{item.price}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={onClose} className="text-gray-400 text-sm underline text-center">
          Leave Shop
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Wire ShopModal into WorldMap**

In `src/screens/WorldMap.tsx`:

Add import:
```tsx
import ShopModal from '../components/ShopModal'
import itemsJson from '../data/items.json'
import type { ItemData } from '../types/game'
const ITEMS = itemsJson as ItemData[]
```

Add state:
```tsx
const [shopOpen, setShopOpen] = useState(false)
```

In the `move` callback door check (from Task 1), add the pokemart case:
```tsx
if (door?.type === 'pokecenter') { /* ... Task 1 code ... */ }
if (door?.type === 'pokemart') {
  setShopOpen(true)
  return prevPy
}
```

Add `handleBuy` function:
```tsx
async function handleBuy(itemId: string) {
  if (!profile?.id) return
  const item = ITEMS.find(i => i.id === itemId)
  if (!item || profile.money < item.price) return
  const newMoney = profile.money - item.price
  const existingIdx = profile.bag.findIndex(b => b.itemId === itemId)
  const newBag = existingIdx >= 0
    ? profile.bag.map((b, i) => i === existingIdx ? { ...b, qty: b.qty + 1 } : b)
    : [...profile.bag, { itemId, qty: 1 }]
  const updates = { money: newMoney, bag: newBag }
  try {
    await updateProfile(profile.id, updates)
    useProfileStore.getState().setProfile({ ...profile, ...updates })
  } catch {
    // silent fail — UI still reflects optimistic update
  }
}
```

Add the modal to the return JSX (before the closing `</div>`):
```tsx
{shopOpen && profile && (
  <ShopModal
    profile={profile}
    onBuy={handleBuy}
    onClose={() => setShopOpen(false)}
  />
)}
```

- [ ] **Step 7: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/data/items.json src/types/game.ts src/hooks/useFirestoreProfile.ts \
        src/maps/palletTown.ts src/components/ShopModal.tsx src/screens/WorldMap.tsx
git commit -m "feat: add bag system, items data, and Pokemart shop"
```

---

## Task 5: Use item in battle (BAG option)

**Files:**
- Create: `src/components/BagMenu.tsx`
- Modify: `src/screens/Battle.tsx`
- Modify: `src/hooks/useBattleEngine.ts`
- Modify: `src/store/battleStore.ts`

In Ruby, using an item counts as the player's full turn — no question needed. The opponent attacks afterwards.

- [ ] **Step 1: Add useItem action to battleStore**

In `src/store/battleStore.ts`, add to `BattleState`:
```ts
healPlayer: (amount: number) => void
```

Add implementation in `create`:
```ts
healPlayer: (amount) => set((state) => {
  if (!state.playerPokemon) return {}
  return {
    playerPokemon: {
      ...state.playerPokemon,
      currentHp: Math.min(
        state.playerPokemon.maxHp,
        state.playerPokemon.currentHp + amount
      ),
    },
  }
}),
```

- [ ] **Step 2: Add useItemInBattle to useBattleEngine**

In `src/hooks/useBattleEngine.ts`, add import:
```ts
import itemsJson from '../data/items.json'
import type { ItemData } from '../types/game'
const itemMap = Object.fromEntries(
  (itemsJson as ItemData[]).map(i => [i.id, i])
) as Record<string, ItemData>
```

Add `useItemInBattle` function:
```ts
async function useItemInBattle(itemId: string) {
  const item = itemMap[itemId]
  if (!item || !profile?.id) return
  const state = useBattleStore.getState()
  const { playerPokemon } = state
  if (!playerPokemon) return

  // Can only use healing items on non-fainted Pokemon
  if (item.effect === 'heal' && playerPokemon.currentHp <= 0) return
  if (item.effect === 'revive' && playerPokemon.currentHp > 0) return

  store.setPhase('animating')

  if (item.effect === 'heal') {
    store.healPlayer(item.power)
    store.addLog(`Used ${item.name}! ${getName(playerPokemon)} restored ${item.power} HP.`)
  } else if (item.effect === 'revive') {
    const halfHp = Math.floor(playerPokemon.maxHp / 2)
    store.healPlayer(halfHp)
    store.addLog(`Used ${item.name}! ${getName(playerPokemon)} was revived!`)
  }

  // Deduct item from bag and save
  const newBag = profile.bag.map(b =>
    b.itemId === itemId ? { ...b, qty: b.qty - 1 } : b
  ).filter(b => b.qty > 0)
  try {
    await updateProfile(profile.id, { bag: newBag })
    useProfileStore.getState().setProfile({ ...profile, bag: newBag })
  } catch { /* silent */ }

  await delay(600)
  await opponentTurn()
}
```

Import `useProfileStore` in useBattleEngine:
```ts
import { useProfileStore } from '../store/profileStore'
```

Add `useProfileStore` hook call inside `useBattleEngine`:
```ts
const profileStore = useProfileStore()
```

Return `useItemInBattle` from the hook:
```ts
return { selectMove, handleAnswer, continueBattle, useItemInBattle }
```

- [ ] **Step 3: Create BagMenu component**

Create `src/components/BagMenu.tsx`:

```tsx
import itemsJson from '../data/items.json'
import type { BagItem, ItemData } from '../types/game'

const ITEMS = itemsJson as ItemData[]

interface Props {
  bag: BagItem[]
  onUse: (itemId: string) => void
  onClose: () => void
}

export default function BagMenu({ bag, onUse, onClose }: Props) {
  const usable = bag
    .filter(b => b.qty > 0)
    .map(b => ({ ...b, data: ITEMS.find(i => i.id === b.itemId) }))
    .filter(b => b.data)

  return (
    <div className="absolute inset-0 bg-black/50 z-40 flex items-end">
      <div className="w-full bg-[#0f3460] border-t-2 border-yellow-400 p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-yellow-400 font-bold text-sm">BAG</span>
          <button onClick={onClose} className="text-gray-400 text-xs underline">Back</button>
        </div>
        {usable.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-2">No usable items</p>
        )}
        {usable.map(({ itemId, qty, data }) => (
          <button
            key={itemId}
            onClick={() => onUse(itemId)}
            className="flex justify-between items-center bg-[#1a1a2e] rounded-xl px-3 py-2 text-left"
          >
            <div>
              <div className="text-white font-bold text-sm">{data!.name}</div>
              <div className="text-gray-400 text-xs">{data!.description}</div>
            </div>
            <span className="text-gray-300 text-sm ml-2">×{qty}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Add BAG button and BagMenu to Battle.tsx**

In `src/screens/Battle.tsx`, update the `useBattleEngine` destructure:
```tsx
const { selectMove, handleAnswer, useItemInBattle } = useBattleEngine()
```

Add state:
```tsx
const [bagOpen, setBagOpen] = useState(false)
```

Import profile:
```tsx
import { useProfileStore } from '../store/profileStore'
const profile = useProfileStore(s => s.profile)
```

Import `BagMenu`:
```tsx
import BagMenu from '../components/BagMenu'
```

In the `phase === 'player_turn'` block, add a BAG button alongside the move selector:
```tsx
{phase === 'player_turn' && (
  <>
    <p className="text-yellow-400 font-bold text-sm mb-2">
      What will <span className="capitalize">{playerPokemon.nickname || `Pokemon #${playerPokemon.pokemonId}`}</span> do?
    </p>
    <MoveSelector
      moves={playerPokemon.moves}
      moveData={moveMap}
      onSelect={selectMove}
      disabled={false}
    />
    <button
      onClick={() => setBagOpen(true)}
      className="mt-2 w-full bg-[#1a1a2e] border border-gray-600 text-gray-300 font-bold py-2 rounded-xl text-sm"
    >
      BAG
    </button>
  </>
)}
```

Add the BagMenu overlay (inside the outer div, before the QuestionPopup):
```tsx
{bagOpen && profile && (
  <BagMenu
    bag={profile.bag ?? []}
    onUse={(itemId) => { setBagOpen(false); useItemInBattle(itemId) }}
    onClose={() => setBagOpen(false)}
  />
)}
```

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/components/BagMenu.tsx src/screens/Battle.tsx \
        src/hooks/useBattleEngine.ts src/store/battleStore.ts
git commit -m "feat: add BAG option in battle to use healing items"
```

---

## Final: Build and deploy

- [ ] **Step 1: Build**

```bash
npm run build
```
Expected: no errors, `dist/` generated

- [ ] **Step 2: Copy to website and push**

```bash
# Copy dist/ to the website repo
cp -r dist/* "C:/Users/derek/Documents/Project/jd-partners-website/games/my-pokemon/"
cd "C:/Users/derek/Documents/Project/jd-partners-website"
git add -A && git commit -m "deploy: heal, EXP bar, evolution, bag & Pokemart"
git push
```
