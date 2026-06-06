# Battle Move Animations Design

## Goal

When a Pokémon uses a move, play a type-specific animation that travels from attacker to target, with a subtle arena tint matching the move type. Contact moves (Normal, Fighting) show slash lines at the target instead of a projectile.

## Current State

The following already exists and must not be broken:

- **Attacker lurch**: `playerAttacking` / `opponentAttacking` shifts the attacker sprite ~26–30px toward the opponent (CSS transition, 150ms).
- **Impact burst**: `hitEffect` state drives a 520ms canvas animation (`drawHitEffect`) for all 18 types — rings, particles, sparks at the hit location.
- **Target flash + shake**: `opponentFlash` / `playerFlash` (opacity 0.25) and `shakeX` / `playerShakeX` oscillate on hit.
- **Damage popup**: floating number from the target.

The gap is that nothing travels between attacker and target — lurch jumps straight to impact.

## Animation Sequence

```
Attacker lurch (existing 150ms)
      ↓
Projectile travel OR contact slash (NEW, 450ms)
      ↓  ← existing setHitEffect fires at 80% of projectile progress (360ms in)
Impact burst (existing 520ms, overlaps final 90ms of projectile)
      ↓
Target flash + shake (existing)
```

Total added latency per attack: ~360ms (the portion before impact burst fires).

## Move Classification

Determined by move type — no move-category field exists in the current data model.

| Category | Types | Animation |
|---|---|---|
| Contact | `normal`, `fighting` | Three diagonal slash marks fan out at the target |
| Ranged | All 16 other types | Type-specific projectile arcs from attacker to target |

## Projectile Shapes

| Type | Shape | Trail | Arena Tint |
|---|---|---|---|
| fire | Orange circle (fireball) | Fading orange dots | `rgba(255,80,0,0.18)` |
| water | Blue teardrop ellipse | Fading blue dots | `rgba(60,140,255,0.18)` |
| electric | Yellow circle + zigzag trail | Lightning segments | `rgba(255,220,0,0.18)` |
| grass | Green ellipse (leaf shape, rotates) | Green dots | `rgba(60,200,60,0.18)` |
| ice | White/cyan circle + crystal arms | Fading cyan dots | `rgba(180,240,255,0.18)` |
| psychic | Pink circle (pulsing) | Pink rings | `rgba(255,80,180,0.18)` |
| poison | Purple circle | Purple bubble dots | `rgba(160,40,200,0.18)` |
| ghost | Dark purple circle (semi-transparent) | Dark smoke dots | `rgba(60,0,100,0.22)` |
| dragon | Multicolour circle (hue-rotates) | Mixed colour dots | `rgba(180,40,0,0.18)` |
| dark | Near-black circle | Dark dots | `rgba(20,0,40,0.25)` |
| rock | Brown circle (polygon outline) | Brown dots | `rgba(160,110,40,0.18)` |
| ground | Brown/tan circle | Tan dots | `rgba(180,140,60,0.18)` |
| flying | White circle | White arc swoosh | `rgba(180,220,255,0.15)` |
| steel | Silver circle | Silver dots | `rgba(180,180,200,0.18)` |
| fairy | Pink circle (sparkle) | Pink star dots | `rgba(255,140,200,0.18)` |
| bug | Lime-green circle | Green dots | `rgba(140,200,0,0.18)` |

Contact (Normal/Fighting) slash: three diagonal lines (`\`, `|`, `/` spread 15° apart), drawn at the target hit location, expanding outward over 350ms in the type colour (white for Normal, gold for Fighting).

## Projectile Trajectory

Arc from attacker centre to target centre:

```
x(t) = lerp(x_src, x_dst, t)
y(t) = lerp(y_src, y_dst, t) - ARC_HEIGHT * sin(t * π)
```

`ARC_HEIGHT = 22` for player→opponent (upward arc), `-22` for opponent→player (downward arc so it still arcs visually).

Trail: last 5 positions drawn as fading dots (alpha × `j/5`).

## Arena Tint

A `<div>` absolutely positioned over the battlefield (height = `SKY_H = 120px`), `pointerEvents: none`, `zIndex: 7` (below sprite layer). Its `background` is the type tint colour and its `opacity` is driven by a React state value `arenaTintOpacity` (0–1).

- Ramps 0→1 over first 150ms of projectile travel.
- Holds at 1 until impact burst fires (360ms).
- Fades 1→0 over the 90ms overlap with impact burst.

## Data Flow

```
useBattleEngine.ts                battleStore.ts              Battle.tsx
─────────────────                 ──────────────              ──────────
selectMove fires
  setProjectileAnim(type, forOpp) → projectileAnim state → projCanvasRef useEffect
                                                              rAF loop 450ms
                                                              at p=0.8: setHitEffect(type, forOpp)
                                                                        (existing impact burst fires)
                                                              at p=1.0: clearProjectileAnim()
```

## Files Changed

| File | Change |
|---|---|
| `src/store/battleStore.ts` | Add `projectileAnim` state, `setProjectileAnim(type, forOpp)`, `clearProjectileAnim()` |
| `src/hooks/useBattleEngine.ts` | Call `setProjectileAnim` at start of each attack turn (player and opponent), before damage loop |
| `src/screens/Battle.tsx` | Add `drawProjectile()` function, `projCanvasRef`, `arenaTintOpacity` state, arena tint `<div>`, `useEffect` watching `projectileAnim` |

No new files. No changes to move data, question bank, or any other system.

## Sprite Positions (existing constants)

```typescript
// Opponent: cx=259, cy=85  (used by existing hitEffect)
// Player:   cx=90,  cy=170
// These are also the projectile destinations.
// Projectile sources (approx attacker centre):
//   Player attacks:   src=(90, 140)  dst=(259, 85)
//   Opponent attacks: src=(259, 55)  dst=(90, 170)
```

## Non-Goals

- No per-move overrides (every move of a given type looks the same).
- No status-move animations (Sleep Powder, Toxic, etc.) — they already show the impact burst only.
- No sound effects.
- No changes to move data model.
