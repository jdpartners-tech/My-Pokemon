# Design: Programmatic Tile Renderer + 9 World Maps

**Date:** 2026-05-25  
**Status:** Approved

---

## Problem

The current world map renders a GBA screenshot (littleroot.gif / route101.gif) as a background image, then overlays a separate tile collision array. The two are connected only by a manually-calibrated pixel offset (`BG_ORIGINS`). Any small drift causes characters to walk on rooftops or be blocked by open grass. This has been an ongoing bug that cannot be reliably fixed by recalibration.

## Solution

Replace the GBA background approach with a **programmatic tile renderer**: every tile cell in the map array draws its own image. The collision grid *is* the visual grid — no calibration, no drift.

---

## 1. Tile Image Assets

All images live in `public/tiles/` and `public/characters/`. All images are scaled proportionally (uniform scale factor — never stretch width/height independently). Chroma key removes background colour on all sprites.

### Ground & Decorative Tiles (drawn at 32×32 per cell)

| Tile type | Image file | Behaviour |
|-----------|-----------|-----------|
| `grass` | `Background.png` | Walkable, triggers wild encounters |
| `land` | `tile_land1.png` | Walkable, no encounters |
| `flower` | `Background.png` + `tile_flower.png` overlay | Walkable, decorative |
| `flower2` | `Background.png` + `tile_flower2.png` overlay | Walkable, decorative |
| `tree` | `tile_tree.png` | **Blocked** — proportional scale (width=32px, height from aspect ratio) |
| `fence` | `tile_wooden_fence.png` | **Blocked** |
| `brush` | `tile_brush.png` | **Blocked** |
| `water` | blue fill (no image yet) | Walkable, triggers water encounters |
| `building` | `Background.png` base + building overlay | **Blocked** — image drawn on top |
| `door` | `tile_land1.png` + door overlay | Walkable, triggers map transition or shop |

### Building Overlays (proportional, height = 5 tiles = 160px, width from aspect ratio, chroma-keyed)

| Usage | Image file | Natural size | Rendered at |
|-------|-----------|-------------|-------------|
| Town store / PokéMart | `tile_building_big.png` | 224×166 | ~216×160px |
| House / small building | `tile_building1.png` | 160×159 | ~161×160px |
| Pokémon Center exterior | `tile_pokemon_center.png` | 399×348 | ~184×160px |

Buildings are positioned by map tile coordinate. The underlying `B` (building) tiles in the array define collision. The image is drawn as an overlay spanning its computed pixel width.

---

## 2. Character Sprites

Replace current `hero_*.png` / `heroine_*.png` with new sprites from `public/characters/`. Same render dimensions: **32×42px** (`TILE × TILE*1.3`), chroma key applied.

| Key | New file |
|-----|---------|
| `male_stand_down` | `Male Character - Look at the front.png` |
| `male_stand_up` | `Male Character - Look at the back.png` |
| `male_stand_left` | `Male Character - Look at the left.png` |
| `male_stand_right` | `Male Character - Look at the right.png` |
| `male_run_down` | `Male Character - Running to the front.png` |
| `male_run_up` | `Male Character - Running to the back.png` |
| `male_run_left` | `Male Character - Running to the left.png` |
| `male_run_right` | `Male Character - Running to the right.png` |
| `female_stand_down` | `Female Character - Look at the front.png` |
| `female_stand_up` | `Female Character - Look at the back.png` |
| `female_stand_left` | `Female Character - Look at the left.png` |
| `female_stand_right` | `Female Character - Look at the right.png` |
| `female_run_down` | `Female Character - Run to the front.png` |
| `female_run_up` | `Female Character - Run to the back.png` |
| `female_run_left` | `Female Character - Run to the left.png` |
| `female_run_right` | `Female Character - Run to the right.png` |

---

## 3. MapData Type Changes

Add new tile types to `TileType` union in `src/maps/types.ts`:

```ts
// Add to existing union:
type TileType = 'path' | 'grass' | 'tree' | 'water' | 'building' | 'door' | 'gym'
              | 'land' | 'flower' | 'flower2' | 'fence' | 'brush'
```

Add `buildingOverlays` optional field to `MapData` for positioned building images:

```ts
interface BuildingOverlay {
  x: number        // map tile col (top-left of building)
  y: number        // map tile row (top-left of building)
  image: string    // filename in public/tiles/
  heightTiles: number  // rendered height in tiles (width is proportional)
}
```

---

## 4. Renderer Architecture (WorldMap.tsx)

Replace the GBA background draw call with a per-tile draw loop:

```
Pass 1: Base tiles (grass, land, tree, water, flower — all drawn per cell)
Pass 2: Building overlays (proportional images positioned by tile coord)  
Pass 3: Door visuals (overlaid on door tiles)
Pass 4: NPC trainers
Pass 5: Player sprite (always centred, chroma-keyed)
Pass 6: UI label
```

**Tile image preloading:** All tile images loaded at module level (same pattern as current sprite loading). Chroma key applied once on first load, cached in `TILE_CANVASES`.

**Proportional draw function:**
```ts
function drawProp(ctx, img, destX, destY, destH) {
  const w = destH * (img.naturalWidth / img.naturalHeight)
  ctx.drawImage(img, destX, destY, w, destH)
}
```

**Tree rendering:** Drawn at `width = TILE`, `height = TILE * (img.naturalHeight / img.naturalWidth)`, vertically centred within the tile cell.

---

## 5. Nine World Maps

### Connection diagram

```
Pallet Town ──south──▶ Sunlit Meadow ──north──▶ Viridian Forest ──east──▶ Flower Meadow
                                                                                  │
                                                                               north
                                                                                  ▼
Volcano Trail ◀──north── Cinnabar Town ◀──east── Trainer Road ◀──east── Misty Lake
                                                                              │
                                                                           east
                                                                              ▼
                                                                          Rocky Cave
                                                                              │
                                                                           east──▶ Trainer Road
```

### Map details

#### 1. Pallet Town
- **Tiles:** grass, land path, tree border, two buildings, flowers beside buildings
- **Buildings:** Left = Pokémon Center (`tile_pokemon_center.png`), Right = PokéMart (`tile_building_big.png`)
- **Wild Pokémon:** none
- **Exits:** south (cols 4–10) → Sunlit Meadow row 0; PC door → pokecenter interior; Mart door → shop modal
- **Map size:** 17×12

#### 2. Sunlit Meadow *(was Route 1)*
- **Tiles:** grass, land path down centre, tree borders east/west, occasional flowers
- **Wild Pokémon:**

| Pokémon | ID | Rate | Level |
|---------|-----|------|-------|
| Pidgey | 16 | 40% | 3–6 |
| Rattata | 19 | 30% | 2–5 |
| Jigglypuff | 39 | 15% | 4–7 |
| Meowth | 52 | 12% | 4–8 |
| **Snorlax** ⭐ | 143 | 3% | 12–15 |

- **Exits:** south → Pallet Town row 11; north → Viridian Forest row 11
- **Map size:** 15×14

#### 3. Viridian Forest
- **Tiles:** mostly tree tiles, grass clearings, flowers, dense feel
- **Wild Pokémon:**

| Pokémon | ID | Rate | Level |
|---------|-----|------|-------|
| Caterpie | 10 | 25% | 3–7 |
| Weedle | 13 | 25% | 3–7 |
| Oddish | 43 | 20% | 4–8 |
| Bulbasaur ⭐ | 1 | 15% | 5–9 |
| **Pikachu** ⭐ | 25 | 12% | 4–8 |
| Metapod | 11 | 3% | 7–10 |

- **Exits:** south → Sunlit Meadow row 0; east → Flower Meadow col 0
- **Map size:** 16×16

#### 4. Flower Meadow
- **Tiles:** grass, heavy flower coverage, sparse trees, open feel
- **Wild Pokémon:**

| Pokémon | ID | Rate | Level |
|---------|-----|------|-------|
| Oddish | 43 | 30% | 5–10 |
| Clefairy | 35 | 25% | 5–10 |
| Bellsprout | 69 | 20% | 6–11 |
| Butterfree | 12 | 10% | 8–12 |
| **Eevee** ⭐ | 133 | 12% | 8–12 |
| **Ditto** ⭐ | 132 | 3% | 10–14 |

- **Exits:** west → Viridian Forest; north → Misty Lake col 0
- **Map size:** 15×15

#### 5. Misty Lake
- **Tiles:** grass shore, water tiles (triggers water encounters), trees, land path around lake
- **Land wild Pokémon:**

| Pokémon | ID | Rate | Level |
|---------|-----|------|-------|
| Psyduck | 54 | 35% | 8–13 |
| Poliwag | 60 | 30% | 8–13 |
| Goldeen | 118 | 20% | 10–15 |
| Lapras ⭐ | 131 | 12% | 12–16 |
| **Dragonite** ⭐ | 149 | 3% | 20–25 |

- **Water wild Pokémon:**

| Pokémon | ID | Rate | Level |
|---------|-----|------|-------|
| Magikarp | 129 | 50% | 5–10 |
| Poliwag | 60 | 30% | 8–13 |
| **Gyarados** ⭐ | 130 | 20% | 15–20 |

- **Exits:** south → Flower Meadow; east → Rocky Cave col 0
- **Map size:** 18×16

#### 6. Rocky Cave
- **Tiles:** dark land tiles, brush/fence rocks, tree clusters, narrow passages
- **Wild Pokémon:**

| Pokémon | ID | Rate | Level |
|---------|-----|------|-------|
| Geodude | 74 | 35% | 10–16 |
| Zubat | 41 | 30% | 10–15 |
| Onix | 95 | 20% | 12–18 |
| Graveler | 75 | 12% | 15–20 |
| **Gengar** ⭐ | 94 | 3% | 18–22 |

- **Exits:** west → Misty Lake; east → Trainer Road col 0
- **Map size:** 16×14

#### 7. Trainer Road
- **Tiles:** land path, grass edges, fence lines, 2–3 trainer NPCs
- **Wild Pokémon:**

| Pokémon | ID | Rate | Level |
|---------|-----|------|-------|
| Growlithe | 58 | 35% | 15–20 |
| Vulpix | 37 | 30% | 15–20 |
| Machop | 66 | 25% | 15–22 |
| Mankey | 56 | 10% | 14–20 |

- **Trainer battles:** 2 trainers with mixed Gen 1 parties (levels 18–24)
- **Exits:** west → Rocky Cave; east → Cinnabar Town col 0
- **Map size:** 18×12

#### 8. Cinnabar Town
- **Tiles:** land/path, buildings (PC + Gym), flower decoration
- **Buildings:** Pokémon Center (left), Gym (right, `tile_building_big`)
- **Wild Pokémon:** none
- **Exits:** west → Trainer Road; north → Volcano Trail row 11; PC door → pokecenter
- **Map size:** 17×12

#### 9. Volcano Trail
- **Tiles:** dark land, brush rocks, fence lava barriers, dramatic feel
- **Wild Pokémon:**

| Pokémon | ID | Rate | Level |
|---------|-----|------|-------|
| Ponyta | 77 | 30% | 20–28 |
| Magmar | 126 | 30% | 22–28 |
| Ninetales | 38 | 20% | 25–30 |
| Arcanine | 59 | 15% | 25–32 |
| **Charizard** ⭐ | 6 | 4% | 35–40 |
| **Mewtwo** ⭐ | 150 | 1% | 45–50 |

- **Exits:** south → Cinnabar Town row 0
- **Map size:** 16×16

⭐ = IGN Top 30 Gen 1 Pokémon featured

---

## 6. Battle Enhancement — Party Switching

### Problem

When the active Pokémon faints the player is immediately shown "You blacked out" with no chance to send out another party member.

### Solution

Add a `'switch_pokemon'` phase to `battleStore`. When the active Pokémon's HP reaches 0, check whether any other party member has HP > 0. If yes, enter `'switch_pokemon'` phase and show a party selection screen. If no healthy Pokémon remain, enter `'lose'` as before.

### battleStore changes (`src/store/battleStore.ts`)

```ts
// Add to state:
party: PartyPokemon[]          // full party passed in at battle start
switchPokemon: (index: number) => void

// Add to phase union:
type BattlePhase = 'idle' | 'player_turn' | 'opponent_turn' | 'animating'
                 | 'question' | 'catch' | 'win' | 'lose' | 'evolving'
                 | 'switch_pokemon'   // ← new
```

**`startBattle(wildPokemon, playerPokemon, party)`** — store the full party alongside the active Pokémon.

**On faint:** instead of going straight to `'lose'`, check `party.some(p => p !== playerPokemon && p.currentHp > 0)`. If true → `phase = 'switch_pokemon'`. If false → `phase = 'lose'`.

**`switchPokemon(index)`** — sets `playerPokemon = party[index]`, then `phase = 'player_turn'`.

**After `'win'` or `'lose'`** — save ALL party members' current HP to Firestore (not just the active one).

### Party selection UI (`src/screens/BattleScreen.tsx`)

When `phase === 'switch_pokemon'`:
- Show overlay: "Choose your next Pokémon!"
- List all party members with name, level, HP bar
- Fainted members (currentHp ≤ 0) are greyed out and not selectable
- Selecting a healthy member calls `switchPokemon(index)` and battle resumes at `'player_turn'`

### Files changed

- `src/store/battleStore.ts` — add `party`, `switchPokemon`, `'switch_pokemon'` phase
- `src/screens/BattleScreen.tsx` — add party selection UI for `'switch_pokemon'` phase
- `src/screens/WorldMap.tsx` — pass full party into `startBattle()`

---

## 7. Files Changed / Created

### Modified
- `src/maps/types.ts` — add new tile types + `BuildingOverlay` interface
- `src/screens/WorldMap.tsx` — replace GBA renderer with tile renderer; pass party to startBattle
- `src/maps/palletTown.ts` — redesign with new tile types and layout
- `src/maps/route1.ts` → rename to `sunlitMeadow.ts`, update layout + Pokemon
- `src/maps/index.ts` — register all 9 maps
- `src/store/battleStore.ts` — add party switching (section 6)
- `src/screens/BattleScreen.tsx` — add party selection UI (section 6)

### New files
- `src/maps/viridianForest.ts`
- `src/maps/flowerMeadow.ts`
- `src/maps/mistyLake.ts`
- `src/maps/rockyCave.ts`
- `src/maps/trainerRoad.ts`
- `src/maps/cinnabarTown.ts`
- `src/maps/volcanoTrail.ts`

### Assets (copy to public/)
- `public/tiles/` — all tile PNG files from `Tile/` folder
- `public/characters/` — all character PNGs from `Male Characters/` and `Female Characters/`

---

## 7. Out of Scope

- Adding Gen 2–7 Pokémon to the database
- New battle mechanics or move changes
- Interior maps beyond the existing Pokémon Center
- Route 1 → Sunlit Meadow renaming in Firestore saved positions (existing saves will still load correctly via the existing `currentRoute` field; old `route1` id maps to new `sunlitMeadow` via an alias in `getMap()`)
