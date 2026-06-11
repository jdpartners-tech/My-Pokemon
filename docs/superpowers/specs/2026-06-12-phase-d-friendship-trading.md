# Phase D: Pokémon Friendship & Cross-Device Trading — Design Spec

**Goal:** Make Kayden and Kaylie care about their individual Pokémon (friendship hearts + battle bonus) and trade them across two devices in real time via Firestore.

**Tech Stack:** React 18 + TypeScript, Zustand (`useProfileStore`), Firebase Firestore, existing `useFirestoreProfile` sync pattern.

---

## Section 1: Friendship System

### Data

Add `friendship: number` to `PartyPokemon` in `src/types/game.ts`. Default: `70` on catch (mirrors Gen 2 base value). Range: 0–255.

```typescript
export interface PartyPokemon {
  // ... existing fields ...
  friendship: number
}
```

Existing Pokémon without the field default to `70` at read time (handled in the hook that loads profile data — fallback `?? 70`).

### Growth Triggers

Implemented in `src/hooks/useBattleEngine.ts`, after battle resolution:

| Event | Change |
|-------|--------|
| Win with this Pokémon as active fighter | +5 |
| Win with this Pokémon in party (not active) | +1 |
| This Pokémon faints | −10 (floor 0) |

Updates are written to the party array and synced to Firestore via the existing `updateProfileRef` pattern.

### Display

Hearts derived as `Math.floor(friendship / 51)` → 0–5 range (51 × 5 = 255).

Shown in two places:
1. **Party list** (`src/screens/WorldMap.tsx` party overlay, or wherever the party is currently shown) — small heart row below the Pokémon sprite
2. **Pokémon detail card** (wherever HP/level are shown in the party panel) — larger heart row + "Best Friends!" label when friendship ≥ 250

Render: `'❤️'.repeat(hearts) + '🤍'.repeat(5 - hearts)` or equivalent pixel-style hearts.

### Battle Bonus

In `src/hooks/useBattleEngine.ts`, when calculating player attack damage:

```typescript
const friendshipBonus = activePokemon.friendship >= 200 ? 1.05 : 1.0
damage = Math.floor(baseDamage * friendshipBonus)
```

Applied after all other damage modifiers. Only affects player's active Pokémon (not opponent).

---

## Section 2: Cross-Device Trading

### Entry Point

A **"Trade"** button on the Pokémon detail view in the party panel (wherever a player taps into a party slot). Disabled if the Pokémon is the player's only party member (can't trade away last Pokémon).

### Firestore Data Structure

Collection: `trades/`

```typescript
interface TradeOffer {
  id: string                    // Firestore doc ID
  offererProfileId: string      // who initiated
  offererProfileName: string    // display name
  targetProfileId: string       // who should accept
  offeredPokemon: PartyPokemon  // snapshot of the offered Pokémon
  offeredPartyIdx: number       // index in offerer's party array
  status: 'pending' | 'completed' | 'cancelled'
  createdAt: number             // Date.now() timestamp
}
```

### Trade Flow

**Player A (offerer):**
1. Taps party Pokémon → sees "Trade" button
2. Taps "Trade" → modal shows list of other profiles (fetched from Firestore `profiles/` collection)
3. Selects target profile → trade offer written to `trades/` (status: `'pending'`)
4. UI shows "Waiting for [Kaylie]…" with cancel button
5. When status flips to `'completed'` (real-time listener) → success toast "Trade complete!"

**Player B (recipient):**
1. Real-time listener on `trades/` where `targetProfileId === profile.id && status === 'pending'`
2. When offer arrives → toast notification: "Kayden wants to trade [Pokémon name]! Tap to view."
3. Taps toast → Trade screen opens showing offerer's Pokémon
4. Selects own Pokémon from party → confirmation screen: "[Pikachu] ↔ [Charmander] — Confirm?"
5. Confirms → Firestore transaction:
   - Remove offered Pokémon from offerer's party, insert Player B's chosen Pokémon
   - Remove Player B's chosen Pokémon from their party, insert offered Pokémon
   - Set trade status: `'completed'`
6. Success screen on both devices

### Constraints

- Only one pending outgoing offer per profile at a time (enforced client-side: check before creating)
- Cannot offer last Pokémon in party
- Offer auto-cancelled after 24 hours (checked on login: delete `trades` docs where `createdAt < now - 86400000`)
- Friendship resets to `70` on traded Pokémon (fresh start with new trainer)

### New Files

| File | Responsibility |
|------|----------------|
| `src/hooks/useTrades.ts` | Firestore listener for incoming offers; `createOffer`, `acceptOffer`, `cancelOffer` functions |
| `src/screens/Trade.tsx` | Trade screen: shows incoming offer + party picker for recipient |
| `src/components/TradeOfferToast.tsx` | Notification toast shown to recipient when offer arrives |

### Modified Files

| File | Change |
|------|--------|
| `src/types/game.ts` | Add `friendship` to `PartyPokemon`; add `TradeOffer` interface |
| `src/hooks/useBattleEngine.ts` | Friendship growth on win/faint; friendship bonus to damage |
| `src/screens/WorldMap.tsx` | Wire `useTrades` listener; show hearts in party overlay |
| `src/App.tsx` or router | Add `/trade` route for `Trade.tsx` |

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/types/game.ts` | Modify — add `friendship` to `PartyPokemon`, add `TradeOffer` type |
| `src/hooks/useBattleEngine.ts` | Modify — friendship growth + battle damage bonus |
| `src/hooks/useTrades.ts` | Create — Firestore trade CRUD + real-time listener |
| `src/screens/Trade.tsx` | Create — trade confirmation UI |
| `src/components/TradeOfferToast.tsx` | Create — incoming trade notification |
| `src/screens/WorldMap.tsx` | Modify — hearts display, `useTrades` wired, stale offer cleanup |
| `src/App.tsx` | Modify — add `/trade` route |
