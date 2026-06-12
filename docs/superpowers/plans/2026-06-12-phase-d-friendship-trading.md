# Phase D: Pokémon Friendship & Cross-Device Trading — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a friendship hearts system that grows from battles and boosts damage, plus cross-device Pokémon trading via Firestore real-time listeners.

**Architecture:** `friendship: number` added to `PartyPokemon` (defaults `?? 70` everywhere). Growth hooks live in `useBattleEngine.ts`. Display lives in `Team.tsx` detail view. Trading uses a `trades/` Firestore collection; `useTrades.ts` owns all CRUD + listeners; `WorldMap.tsx` subscribes and shows `TradeOfferToast`; `Trade.tsx` handles the accept flow via a Firestore `runTransaction`.

**Tech Stack:** React 18 + TypeScript, Firestore (addDoc, onSnapshot, runTransaction, query/where), Zustand (`useProfileStore`), React Router (`useNavigate`, `useSearchParams`).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/game.ts` | Modify | Add `friendship` to `PartyPokemon`; add `TradeOffer` interface |
| `src/hooks/useBattleEngine.ts` | Modify | Friendship growth on win/faint; friendship damage bonus; `friendship: 70` on catch |
| `src/screens/Team.tsx` | Modify | Hearts display in detail view; Trade button + profile picker |
| `src/hooks/useTrades.ts` | Create | Firestore CRUD + real-time subscriptions |
| `src/screens/Trade.tsx` | Create | Accept-trade screen with party picker + Firestore transaction |
| `src/components/TradeOfferToast.tsx` | Create | Incoming trade notification banner |
| `src/screens/WorldMap.tsx` | Modify | Wire `useTrades` listener; show toast; cleanup stale offers |
| `src/App.tsx` | Modify | Add `/trade` route |

---

## Task 1: Add types — `friendship` + `TradeOffer`

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Add `friendship` to `PartyPokemon`**

Find the `PartyPokemon` interface (around line 57). Add `friendship` as the last field:

```typescript
export interface PartyPokemon {
  pokemonId: number
  nickname: string | null
  level: number
  xp: number
  currentHp: number
  maxHp: number
  moves: Array<{ moveId: string; pp: number; maxPp: number }>
  heldItem: string | null
  status: StatusCondition
  sleepTurns: number
  friendship: number
}
```

- [ ] **Step 2: Add `TradeOffer` interface**

After the `BagItem` interface (around line 77), add:

```typescript
export interface TradeOffer {
  id: string
  offererProfileId: string
  offererProfileName: string
  targetProfileId: string
  offeredPokemon: PartyPokemon
  offeredPartyIdx: number
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: number
}
```

- [ ] **Step 3: Type-check**

```bash
cd "C:\Users\derek\Documents\Project\My Pokemon"
npx tsc --noEmit
```

Expected: no errors (existing code uses `friendship` nowhere yet, so no breakage).

- [ ] **Step 4: Commit**

```bash
git add src/types/game.ts
git commit -m "feat: add friendship to PartyPokemon and TradeOffer type"
```

---

## Task 2: Friendship growth in `useBattleEngine.ts`

**Files:**
- Modify: `src/hooks/useBattleEngine.ts`

- [ ] **Step 1: Add `friendship: 70` when a Pokémon is caught**

In `attemptCatch()`, find the line where caught Pokémon are added to the party (around line 720):

```typescript
const partyWithCaught = currentParty.length < 6
  ? [...currentParty, { ...opponentPokemon, nickname: null }]
  : currentParty
```

Replace with:

```typescript
const partyWithCaught = currentParty.length < 6
  ? [...currentParty, { ...opponentPokemon, nickname: null, friendship: 70 }]
  : currentParty
```

- [ ] **Step 2: Apply friendship −10 when active Pokémon faints**

In `opponentTurn()`, find the faint check (around line 390):

```typescript
if (useBattleStore.getState().playerPokemon!.currentHp <= 0) {
  store.addLog(`${getName(playerPokemon)} fainted!`)
  const hasHealthy = useBattleStore.getState().party.some(p => p.currentHp > 0)
  store.setPhase(hasHealthy ? 'switch_pokemon' : 'lose')
  return
}
```

Replace with:

```typescript
if (useBattleStore.getState().playerPokemon!.currentHp <= 0) {
  store.addLog(`${getName(playerPokemon)} fainted!`)
  if (profile?.id) {
    const freshProfile = useProfileStore.getState().profile ?? profile
    const faintedIdx = useBattleStore.getState().partyIndexMap[0] ?? 0
    const updatedParty = (freshProfile.party ?? []).map((p, i) =>
      i === faintedIdx
        ? { ...p, friendship: Math.max(0, (p.friendship ?? 70) - 10) }
        : p
    )
    useProfileStore.getState().setProfile({ ...freshProfile, party: updatedParty })
    updateProfile(profile.id, { party: updatedParty }).catch(() => {})
  }
  const hasHealthy = useBattleStore.getState().party.some(p => p.currentHp > 0)
  store.setPhase(hasHealthy ? 'switch_pokemon' : 'lose')
  return
}
```

- [ ] **Step 3: Apply friendship +5 (active) / +1 (bench) on win**

In `handleWin()`, find where `updatedParty` is finalized and `updateProfile` is called (around line 489–590). After the bench XP loop (after `benchParty.forEach(...)` ends), and before the `updateProfile(profile.id, { party: updatedParty, ... })` call, add:

```typescript
// Friendship: +5 for active winner, +1 for each bench member
updatedParty[activeProfileIdx] = {
  ...updatedParty[activeProfileIdx],
  friendship: Math.min(255, (updatedParty[activeProfileIdx].friendship ?? 70) + 5),
}
benchParty.forEach((_, i) => {
  const profIdx = partyIndexMap[i + 1]
  if (profIdx === undefined || !updatedParty[profIdx]) return
  updatedParty[profIdx] = {
    ...updatedParty[profIdx],
    friendship: Math.min(255, (updatedParty[profIdx].friendship ?? 70) + 1),
  }
})
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useBattleEngine.ts
git commit -m "feat: friendship grows +5/+1 on win, -10 on faint; caught Pokemon start at 70"
```

---

## Task 3: Friendship display in `Team.tsx`

**Files:**
- Modify: `src/screens/Team.tsx`

- [ ] **Step 1: Add hearts helper function**

Near the top of the file (after the imports, before `export default function Team()`), add:

```typescript
function friendshipHearts(friendship: number): string {
  const hearts = Math.floor((friendship ?? 70) / 51)
  return '❤️'.repeat(hearts) + '🤍'.repeat(5 - hearts)
}
```

- [ ] **Step 2: Add friendship display to `DetailView`**

In `DetailView`, after the HP section (the `<div>` block containing `HpBar`, around line 123–127), add:

```tsx
<div className="bg-[#16213e] rounded-xl p-4 w-full max-w-2xl">
  <p className="text-yellow-400 font-bold mb-2 text-sm">Friendship</p>
  <p className="text-2xl">{friendshipHearts(mon.friendship ?? 70)}</p>
  {(mon.friendship ?? 70) >= 250 && (
    <p className="text-pink-400 text-sm mt-1 font-semibold">Best Friends! 💕</p>
  )}
</div>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Team.tsx
git commit -m "feat: show friendship hearts in Pokemon detail view"
```

---

## Task 4: Friendship battle damage bonus in `useBattleEngine.ts`

**Files:**
- Modify: `src/hooks/useBattleEngine.ts`

- [ ] **Step 1: Apply +5% damage bonus at high friendship**

In `handleAnswer()`, find the damage calculation inside the multi-hit loop (around line 192–196):

```typescript
const baseDmg = calculateDamage(playerPokemon.level, moveInfo?.power ?? 0, atkStat, defStat, eff)
const singleDmg = isCrit ? Math.floor(baseDmg * 1.5) : baseDmg
```

Replace with:

```typescript
const baseDmg = calculateDamage(playerPokemon.level, moveInfo?.power ?? 0, atkStat, defStat, eff)
const friendshipMult = (playerPokemon.friendship ?? 70) >= 200 ? 1.05 : 1.0
const singleDmg = Math.floor((isCrit ? Math.floor(baseDmg * 1.5) : baseDmg) * friendshipMult)
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useBattleEngine.ts
git commit -m "feat: +5% damage bonus when Pokemon friendship >= 200"
```

---

## Task 5: `useTrades.ts` — Firestore CRUD + subscriptions

**Files:**
- Create: `src/hooks/useTrades.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useCallback } from 'react'
import {
  collection, doc, addDoc, onSnapshot, runTransaction,
  query, where, deleteDoc, getDocs,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { TradeOffer, PartyPokemon } from '../types/game'

export function useTrades() {
  const subscribeToIncomingOffers = useCallback(
    (profileId: string, onChange: (offers: TradeOffer[]) => void) => {
      const q = query(
        collection(db, 'trades'),
        where('targetProfileId', '==', profileId),
        where('status', '==', 'pending'),
      )
      return onSnapshot(q, snap => {
        onChange(snap.docs.map(d => ({ id: d.id, ...d.data() } as TradeOffer)))
      })
    },
    [],
  )

  const subscribeToOutgoingOffer = useCallback(
    (profileId: string, onChange: (offer: TradeOffer | null) => void) => {
      const q = query(
        collection(db, 'trades'),
        where('offererProfileId', '==', profileId),
        where('status', '==', 'pending'),
      )
      return onSnapshot(q, snap => {
        onChange(snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as TradeOffer))
      })
    },
    [],
  )

  const createOffer = useCallback(
    async (offer: Omit<TradeOffer, 'id'>): Promise<string> => {
      const ref = await addDoc(collection(db, 'trades'), offer)
      return ref.id
    },
    [],
  )

  const cancelOffer = useCallback(
    async (tradeId: string): Promise<void> => {
      await deleteDoc(doc(db, 'trades', tradeId))
    },
    [],
  )

  const acceptOffer = useCallback(
    async (
      tradeId: string,
      offererProfileId: string,
      offeredPartyIdx: number,
      offeredPokemon: PartyPokemon,
      recipientProfileId: string,
      recipientParty: PartyPokemon[],
      recipientPartyIdx: number,
    ): Promise<void> => {
      await runTransaction(db, async txn => {
        const offererRef = doc(db, 'profiles', offererProfileId)
        const recipientRef = doc(db, 'profiles', recipientProfileId)
        const tradeRef = doc(db, 'trades', tradeId)

        const offererSnap = await txn.get(offererRef)
        const offererParty: PartyPokemon[] = offererSnap.data()?.party ?? []

        const recipientPokemon = recipientParty[recipientPartyIdx]
        const newOffererParty = offererParty.map((p, i) =>
          i === offeredPartyIdx ? { ...recipientPokemon, friendship: 70 } : p
        )
        const newRecipientParty = recipientParty.map((p, i) =>
          i === recipientPartyIdx ? { ...offeredPokemon, friendship: 70 } : p
        )

        txn.update(offererRef, { party: newOffererParty })
        txn.update(recipientRef, { party: newRecipientParty })
        txn.update(tradeRef, { status: 'completed' })
      })
    },
    [],
  )

  const cleanupStaleOffers = useCallback(
    async (profileId: string): Promise<void> => {
      const staleTime = Date.now() - 86_400_000
      const q = query(
        collection(db, 'trades'),
        where('offererProfileId', '==', profileId),
        where('status', '==', 'pending'),
      )
      const snap = await getDocs(q)
      for (const d of snap.docs) {
        if ((d.data().createdAt as number) < staleTime) {
          await deleteDoc(d.ref)
        }
      }
    },
    [],
  )

  return {
    subscribeToIncomingOffers,
    subscribeToOutgoingOffer,
    createOffer,
    cancelOffer,
    acceptOffer,
    cleanupStaleOffers,
  }
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTrades.ts
git commit -m "feat: useTrades hook — Firestore trade CRUD and real-time subscriptions"
```

---

## Task 6: `Trade.tsx` — accept-trade screen

**Files:**
- Create: `src/screens/Trade.tsx`

- [ ] **Step 1: Create the screen**

```typescript
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useProfileStore } from '../store/profileStore'
import { useTrades } from '../hooks/useTrades'
import PokemonSprite from '../components/PokemonSprite'
import type { TradeOffer, PartyPokemon } from '../types/game'
import pokemonJson from '../data/pokemon.json'
import type { PokemonData } from '../types/game'

const pokeMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p])
) as Record<number, PokemonData>

function pokeName(p: PartyPokemon) {
  return p.nickname ?? pokeMap[p.pokemonId]?.name ?? 'Pokémon'
}

export default function Trade() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const profile = useProfileStore(s => s.profile)
  const { acceptOffer } = useTrades()

  const [offer, setOffer] = useState<TradeOffer | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [phase, setPhase] = useState<'pick' | 'confirm' | 'success' | 'error'>('pick')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const offerId = params.get('offerId')
    if (!offerId) { navigate('/map'); return }
    getDoc(doc(db, 'trades', offerId)).then(snap => {
      if (!snap.exists() || snap.data().status !== 'pending') {
        navigate('/map')
        return
      }
      setOffer({ id: snap.id, ...snap.data() } as TradeOffer)
    })
  }, [params, navigate])

  if (!profile || !offer) {
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] flex items-center justify-center">
        <p className="text-white">Loading…</p>
      </div>
    )
  }

  const party = profile.party ?? []

  async function confirmTrade() {
    if (selectedIdx === null || !offer || !profile?.id) return
    setBusy(true)
    try {
      await acceptOffer(
        offer.id,
        offer.offererProfileId,
        offer.offeredPartyIdx,
        offer.offeredPokemon,
        profile.id,
        party,
        selectedIdx,
      )
      // Refresh local profile party
      const snap = await getDoc(doc(db, 'profiles', profile.id))
      if (snap.exists()) {
        useProfileStore.getState().setProfile({ id: snap.id, ...snap.data() } as typeof profile)
      }
      setPhase('success')
    } catch {
      setPhase('error')
    }
    setBusy(false)
  }

  if (phase === 'success') {
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-6xl">🎉</div>
        <p className="text-white text-xl font-bold text-center">Trade complete!</p>
        <p className="text-gray-400 text-center">
          You received <span className="text-yellow-400">{pokeName(offer.offeredPokemon)}</span>!
        </p>
        <button
          onClick={() => navigate('/team')}
          className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl"
        >
          View My Team
        </button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center gap-6 p-6">
        <p className="text-red-400 text-xl font-bold">Trade failed</p>
        <p className="text-gray-400 text-center text-sm">The offer may have been cancelled.</p>
        <button onClick={() => navigate('/map')} className="text-yellow-400 font-bold">Back to Map</button>
      </div>
    )
  }

  if (phase === 'confirm' && selectedIdx !== null) {
    const myPokemon = party[selectedIdx]
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center gap-6 p-6">
        <h2 className="text-white text-xl font-bold">Confirm Trade</h2>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <PokemonSprite pokemonId={offer.offeredPokemon.pokemonId} size={80} />
            <p className="text-yellow-400 text-sm font-bold">{pokeName(offer.offeredPokemon)}</p>
            <p className="text-gray-400 text-xs">from {offer.offererProfileName}</p>
          </div>
          <div className="text-white text-3xl">↔</div>
          <div className="flex flex-col items-center gap-2">
            <PokemonSprite pokemonId={myPokemon.pokemonId} size={80} />
            <p className="text-yellow-400 text-sm font-bold">{pokeName(myPokemon)}</p>
            <p className="text-gray-400 text-xs">yours</p>
          </div>
        </div>
        <p className="text-gray-400 text-xs text-center">Friendship resets to 70 for traded Pokémon.</p>
        <div className="flex gap-4">
          <button
            onClick={() => setPhase('pick')}
            className="border border-gray-600 text-gray-400 px-6 py-3 rounded-xl font-bold"
          >
            Back
          </button>
          <button
            onClick={confirmTrade}
            disabled={busy}
            className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl disabled:opacity-50"
          >
            {busy ? 'Trading…' : 'Confirm!'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="bg-[#0f3460] px-4 py-3 flex items-center gap-3 border-b border-yellow-400/20">
        <button onClick={() => navigate('/map')} className="text-yellow-400 font-bold text-xl">✕</button>
        <h1 className="text-yellow-400 font-bold text-lg">Incoming Trade</h1>
      </div>

      <div className="flex flex-col items-center gap-4 p-6">
        <p className="text-gray-400 text-sm text-center">
          <span className="text-white font-bold">{offer.offererProfileName}</span> wants to trade:
        </p>
        <PokemonSprite pokemonId={offer.offeredPokemon.pokemonId} size={100} />
        <p className="text-white text-xl font-bold">{pokeName(offer.offeredPokemon)}</p>
        <p className="text-gray-400 text-sm">Lv. {offer.offeredPokemon.level}</p>
      </div>

      <p className="text-gray-400 text-sm text-center px-4">Choose a Pokémon to trade:</p>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {party.map((mon, idx) => (
          <button
            key={idx}
            onClick={() => { setSelectedIdx(idx); setPhase('confirm') }}
            disabled={party.length <= 1}
            className="flex items-center gap-4 bg-[#16213e] rounded-xl p-4 border border-[#2a3a5a] text-left disabled:opacity-40"
          >
            <PokemonSprite pokemonId={mon.pokemonId} size={48} />
            <div>
              <p className="text-white font-bold">{pokeName(mon)}</p>
              <p className="text-gray-400 text-sm">Lv. {mon.level} · {mon.currentHp}/{mon.maxHp} HP</p>
            </div>
          </button>
        ))}
        {party.length <= 1 && (
          <p className="text-gray-500 text-sm text-center">You need at least 2 Pokémon to trade.</p>
        )}
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
git add src/screens/Trade.tsx
git commit -m "feat: Trade screen — accept incoming trade offer with party picker"
```

---

## Task 7: `TradeOfferToast.tsx` — incoming trade notification

**Files:**
- Create: `src/components/TradeOfferToast.tsx`

- [ ] **Step 1: Create the component**

```typescript
import type { TradeOffer } from '../types/game'
import pokemonJson from '../data/pokemon.json'
import type { PokemonData } from '../types/game'

const pokeMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p])
) as Record<number, PokemonData>

interface Props {
  offer: TradeOffer
  onTap: () => void
  onDismiss: () => void
}

export default function TradeOfferToast({ offer, onTap, onDismiss }: Props) {
  const pokeName = offer.offeredPokemon.nickname
    ?? pokeMap[offer.offeredPokemon.pokemonId]?.name
    ?? 'a Pokémon'

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#0f3460',
        border: '2px solid #c8a820',
        borderRadius: 16,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        maxWidth: 320,
        width: 'calc(100vw - 32px)',
        cursor: 'pointer',
      }}
      onClick={onTap}
    >
      <span style={{ fontSize: 28 }}>🔄</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#c8a820', fontWeight: 700, fontSize: 13, margin: 0 }}>
          Trade offer!
        </p>
        <p style={{ color: '#fff', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {offer.offererProfileName} wants to trade {pokeName}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDismiss() }}
        style={{ color: '#4a6a8a', fontWeight: 700, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
      >
        ✕
      </button>
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
git add src/components/TradeOfferToast.tsx
git commit -m "feat: TradeOfferToast component — banner notification for incoming trade"
```

---

## Task 8: Trade button in `Team.tsx`

**Files:**
- Modify: `src/screens/Team.tsx`

- [ ] **Step 1: Add imports**

At the top of `Team.tsx`, after existing imports, add:

```typescript
import { useState as useLocalState, useEffect as useLocalEffect } from 'react'
import { useTrades } from '../hooks/useTrades'
import type { TradeOffer } from '../types/game'
```

Note: `useState` and `useEffect` are already imported as part of `'react'` — just add `useTrades` and `TradeOffer`.

Actually, since `useState` is already imported, just add:

```typescript
import { useTrades } from '../hooks/useTrades'
import type { TradeOffer } from '../types/game'
```

- [ ] **Step 2: Instantiate `useTrades` inside `Team()`**

In the `Team()` component body, after `const [busy, setBusy] = useState(false)`, add:

```typescript
const { subscribeToOutgoingOffer, createOffer, cancelOffer } = useTrades()
const { getAllProfiles } = useFirestoreProfile()
const [outgoingOffer, setOutgoingOffer] = useState<TradeOffer | null>(null)

useEffect(() => {
  if (!profile?.id) return
  const unsub = subscribeToOutgoingOffer(profile.id, setOutgoingOffer)
  return unsub
}, [profile?.id])
```

- [ ] **Step 3: Add `TradeSection` local component**

After the `DetailView` function (around line 139), add:

```typescript
function TradeSection({ partyIdx, pokemon }: { partyIdx: number; pokemon: PartyPokemon }) {
  const [showPicker, setShowPicker] = useState(false)
  const [profiles, setProfiles] = useState<Array<{ id: string; name: string }>>([])
  const [tradeBusy, setTradeBusy] = useState(false)

  async function openPicker() {
    const all = await getAllProfiles()
    setProfiles(all.filter(p => p.id !== profile?.id).map(p => ({ id: p.id!, name: p.name })))
    setShowPicker(true)
  }

  async function sendOffer(targetId: string, targetName: string) {
    if (!profile?.id || tradeBusy) return
    setTradeBusy(true)
    try {
      await createOffer({
        offererProfileId: profile.id,
        offererProfileName: profile.name,
        targetProfileId: targetId,
        offeredPokemon: pokemon,
        offeredPartyIdx: partyIdx,
        status: 'pending',
        createdAt: Date.now(),
      })
      setShowPicker(false)
    } catch { /* silent */ }
    setTradeBusy(false)
  }

  async function doCancel() {
    if (!outgoingOffer) return
    await cancelOffer(outgoingOffer.id).catch(() => {})
  }

  if (outgoingOffer) {
    const isThisSlot = outgoingOffer.offeredPartyIdx === partyIdx
    if (!isThisSlot) return null
    return (
      <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-2xl">
        <p className="text-yellow-400 font-bold mb-2 text-sm">Trade</p>
        <p className="text-gray-400 text-sm mb-3">⏳ Waiting for response…</p>
        <button
          onClick={doCancel}
          className="border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm font-bold"
        >
          Cancel Trade
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-2xl">
      <p className="text-yellow-400 font-bold mb-2 text-sm">Trade</p>
      {showPicker ? (
        <div className="flex flex-col gap-2">
          <p className="text-gray-400 text-sm mb-1">Send to:</p>
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => sendOffer(p.id, p.name)}
              disabled={tradeBusy}
              className="bg-[#0f3460] text-white py-2 px-4 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              {p.name}
            </button>
          ))}
          <button onClick={() => setShowPicker(false)} className="text-gray-500 text-sm mt-1">Cancel</button>
        </div>
      ) : (
        <button
          onClick={openPicker}
          disabled={!!outgoingOffer}
          className="bg-[#0f3460] border border-yellow-400/30 text-yellow-400 px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-40"
        >
          🔄 Trade this Pokémon
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Render `TradeSection` inside `DetailView`**

In `DetailView`, after the friendship display block you added in Task 3, add:

```tsx
{isParty && partyIdx !== undefined && party.length > 1 && (
  <TradeSection partyIdx={partyIdx} pokemon={mon} />
)}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/screens/Team.tsx
git commit -m "feat: Trade button in Pokemon detail — profile picker and pending offer state"
```

---

## Task 9: Wire listener + toast into `WorldMap.tsx` and add `/trade` route

**Files:**
- Modify: `src/screens/WorldMap.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports to `WorldMap.tsx`**

After the existing imports block in `WorldMap.tsx`, add:

```typescript
import { useTrades } from '../hooks/useTrades'
import TradeOfferToast from '../components/TradeOfferToast'
import type { TradeOffer } from '../types/game'
```

- [ ] **Step 2: Instantiate `useTrades` in the `WorldMap` component**

After the line `const { playSound } = useGameAudio()` (from Phase C), add:

```typescript
const { subscribeToIncomingOffers, cleanupStaleOffers } = useTrades()
const [incomingTrade, setIncomingTrade] = useState<TradeOffer | null>(null)
```

- [ ] **Step 3: Add the subscription effect**

After the existing `useEffect(() => { playBgm('overworld') ... }, [])` (Phase C BGM), add:

```typescript
useEffect(() => {
  if (!profile?.id) return
  cleanupStaleOffers(profile.id).catch(() => {})
  const unsub = subscribeToIncomingOffers(profile.id, offers => {
    setIncomingTrade(offers[0] ?? null)
  })
  return unsub
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [profile?.id])
```

- [ ] **Step 4: Render the toast in the WorldMap JSX**

Find the outermost `<div>` in the WorldMap return statement (the fixed inset-0 container). As the very last child inside it, before the closing `</div>`, add:

```tsx
{incomingTrade && (
  <TradeOfferToast
    offer={incomingTrade}
    onTap={() => navigate(`/trade?offerId=${incomingTrade.id}`)}
    onDismiss={() => setIncomingTrade(null)}
  />
)}
```

- [ ] **Step 5: Add `/trade` route to `App.tsx`**

In `src/App.tsx`, add the import:

```typescript
import Trade from './screens/Trade'
```

And inside `<Routes>`, add:

```tsx
<Route path="/trade" element={<Trade />} />
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/screens/WorldMap.tsx src/App.tsx
git commit -m "feat: wire trade listener and toast into WorldMap; add /trade route"
```

---

## Task 10: Build and deploy

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
git commit -m "feat: Phase D — friendship hearts + cross-device trading"
git push
```

Expected: GitHub Actions deploys to `https://www.jdpartners.co/games/mypokemon/`.
