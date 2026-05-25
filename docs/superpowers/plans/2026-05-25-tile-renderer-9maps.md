# Tile Renderer + 9 Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the GBA screenshot renderer with a programmatic tile renderer, add 9 interconnected world maps, and add battle party switching when a Pokémon faints.

**Architecture:** Each map tile draws its own image — the collision grid is the visual grid with zero calibration drift. Building images are positioned overlays drawn on top of invisible collision B-tiles. The battle store grows to hold the full party so a fainted Pokémon can be swapped out mid-battle.

**Tech Stack:** React 18, TypeScript, HTML Canvas, Vite, Zustand, Firebase Firestore

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/maps/types.ts` | Add new TileType values + BuildingOverlay interface |
| Modify | `src/maps/palletTown.ts` | Redesign as 17×12 with new tile types |
| Rename+modify | `src/maps/route1.ts` → `src/maps/sunlitMeadow.ts` | Sunlit Meadow map |
| Create | `src/maps/viridianForest.ts` | Viridian Forest map |
| Create | `src/maps/flowerMeadow.ts` | Flower Meadow map |
| Create | `src/maps/mistyLake.ts` | Misty Lake map |
| Create | `src/maps/rockyCave.ts` | Rocky Cave map |
| Create | `src/maps/trainerRoad.ts` | Trainer Road map |
| Create | `src/maps/cinnabarTown.ts` | Cinnabar Town map |
| Create | `src/maps/volcanoTrail.ts` | Volcano Trail map |
| Modify | `src/maps/index.ts` | Register all 9 maps + route1 alias |
| Modify | `src/screens/WorldMap.tsx` | Tile renderer, new sprites, pass party to battle |
| Modify | `src/types/game.ts` | Add 'switch_pokemon' to BattlePhase |
| Modify | `src/store/battleStore.ts` | Add party, switchPokemon |
| Modify | `src/screens/Battle.tsx` | Party selection UI for switch_pokemon phase |
| Modify | `src/hooks/useBattleEngine.ts` | Trigger switch_pokemon instead of lose when party has healthy members |

---

## Task 1: Copy tile and character assets to public/

**Files:**
- Create: `public/tiles/` (directory)
- Create: `public/characters/` (directory)

- [ ] **Step 1: Copy tile PNGs from source folder**

```powershell
New-Item -ItemType Directory -Force "C:\Users\derek\Documents\Project\My Pokemon\.worktrees\build\public\tiles"
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\Tile\*" `
  "C:\Users\derek\Documents\Project\My Pokemon\.worktrees\build\public\tiles\" -Force
```

- [ ] **Step 2: Copy character PNGs from source folders**

```powershell
New-Item -ItemType Directory -Force "C:\Users\derek\Documents\Project\My Pokemon\.worktrees\build\public\characters"
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\Male Characters\*" `
  "C:\Users\derek\Documents\Project\My Pokemon\.worktrees\build\public\characters\" -Force
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\Female Characters\*" `
  "C:\Users\derek\Documents\Project\My Pokemon\.worktrees\build\public\characters\" -Force
```

- [ ] **Step 3: Verify files are present**

```powershell
Get-ChildItem "C:\Users\derek\Documents\Project\My Pokemon\.worktrees\build\public\tiles\" | Select-Object Name
Get-ChildItem "C:\Users\derek\Documents\Project\My Pokemon\.worktrees\build\public\characters\" | Select-Object Name
```

Expected: Background.png, tile_tree.png, tile_land1.png, tile_flower.png, tile_flower2.png, tile_building_big.png, tile_building1.png, tile_pokemon_center.png visible in tiles/. Male and female character PNGs visible in characters/.

- [ ] **Step 4: Commit**

```bash
git add public/tiles/ public/characters/
git commit -m "assets: add tile and character PNGs to public/"
```

---

## Task 2: Update map types

**Files:**
- Modify: `src/maps/types.ts`

- [ ] **Step 1: Replace `src/maps/types.ts` with updated content**

```typescript
export type TileType =
  | 'path' | 'grass' | 'tree' | 'water' | 'building' | 'door' | 'gym'
  | 'land' | 'flower' | 'flower2' | 'fence' | 'brush'

export interface BuildingOverlay {
  x: number         // map tile col of image top-left
  y: number         // map tile row of image top-left
  image: string     // filename in public/tiles/ (e.g. 'tile_building_big.png')
  heightTiles: number  // rendered height in tiles; width is computed proportionally
}

export interface WildEntry {
  pokemonId: number
  minLevel: number
  maxLevel: number
  rate: number
}

export interface TrainerNpc {
  x: number
  y: number
  direction: 'up' | 'down' | 'left' | 'right'
  name: string
  party: Array<{ pokemonId: number; level: number }>
}

export interface Exit {
  x: number
  y: number
  targetMap: string
  targetX: number
  targetY: number
}

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
  waterPokemon?: WildEntry[]
  trainers: TrainerNpc[]
  exits: Exit[]
  doors: DoorInteraction[]
  buildingOverlays?: BuildingOverlay[]
  isInterior?: boolean
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:\Users\derek\Documents\Project\My Pokemon\.worktrees\build"
npx tsc --noEmit
```

Expected: No errors (existing maps use old TileType values which are still in the union).

- [ ] **Step 3: Commit**

```bash
git add src/maps/types.ts
git commit -m "feat(maps): add new tile types and BuildingOverlay interface"
```

---

## Task 3: Rewrite WorldMap tile renderer

**Files:**
- Modify: `src/screens/WorldMap.tsx`

This is the largest task. Replace the GBA background renderer with a 6-pass tile renderer. Keep all existing game logic (movement, exits, doors, battles, trainer detection) unchanged.

- [ ] **Step 1: Add tile image preloading and chroma key cache after the existing `SPRITE_CANVASES` declaration**

Find this block in `WorldMap.tsx` (around line 46):
```typescript
const SPRITE_CANVASES: Record<string, HTMLCanvasElement | undefined> = {}
```

Add immediately after it:

```typescript
// ── Tile image preloading ─────────────────────────────────────────────────
const TILE_FILES: Record<string, string> = {
  grass:    'tiles/Background.png',
  land:     'tiles/tile_land1.png',
  tree:     'tiles/tile_tree.png',
  flower:   'tiles/tile_flower.png',
  flower2:  'tiles/tile_flower2.png',
  bldBig:   'tiles/tile_building_big.png',
  bldSmall: 'tiles/tile_building1.png',
  bldPC:    'tiles/tile_pokemon_center.png',
}
const TILE_IMGS: Record<string, HTMLImageElement> = {}
const TILE_CANVASES: Record<string, HTMLCanvasElement | undefined> = {}

Object.entries(TILE_FILES).forEach(([key, file]) => {
  const img = new Image()
  img.src = `${import.meta.env.BASE_URL}${file}`
  TILE_IMGS[key] = img
})
```

- [ ] **Step 2: Update SPRITE_FILES to point to new character PNGs in public/characters/**

Replace the existing `SPRITE_FILES` constant (around line 36):

```typescript
const SPRITE_FILES: Record<string, string> = {
  male_stand_down:  'characters/Male Character - Look at the front.png',
  male_stand_up:    'characters/Male Character - Look at the back.png',
  male_stand_left:  'characters/Male Character - Look at the left.png',
  male_stand_right: 'characters/Male Character - Look at the right.png',
  male_run_down:    'characters/Male Character - Running to the front.png',
  male_run_up:      'characters/Male Character - Running to the back.png',
  male_run_left:    'characters/Male Character - Running to the left.png',
  male_run_right:   'characters/Male Character - Running to the right.png',
  female_stand_down:  'characters/Female Character - Look at the front.png',
  female_stand_up:    'characters/Female Character - Look at the back.png',
  female_stand_left:  'characters/Female Character - Look at the left.png',
  female_stand_right: 'characters/Female Character - Look at the right.png',
  female_run_down:    'characters/Female Character - Run to the front.png',
  female_run_up:      'characters/Female Character - Run to the back.png',
  female_run_left:    'characters/Female Character - Run to the left.png',
  female_run_right:   'characters/Female Character - Run to the right.png',
}
```

- [ ] **Step 3: Add the blocked-tile set and proportional draw helper after the TILE_IMGS block**

```typescript
const BLOCKED_TILES = new Set<TileType>(['tree', 'building', 'fence', 'brush', 'gym'])

function drawProp(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement | HTMLImageElement,
  destX: number, destY: number, destH: number
) {
  const w = src instanceof HTMLCanvasElement
    ? destH * (src.width / src.height)
    : destH * (src.naturalWidth / src.naturalHeight)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src, destX, destY, w, destH)
}
```

- [ ] **Step 4: Delete the entire GBA background section**

Remove these constants entirely (lines ~72–92 in the original):
```typescript
// ── GBA tileset backgrounds ───────────────────────────────────────────────
const BG_IMGS: Record<string, HTMLImageElement> = {}
const BG_ORIGINS: Record<string, [number, number]> = { ... }
const BG_MAX_SRC: Record<string, [number, number]> = { ... }
const BG_MIN_SRC_Y: Record<string, number> = { ... }
;['pallet', 'route1'].forEach(id => { ... })
```

Also remove the old flat fill colours constant:
```typescript
const TILE_FILL: Record<TileType, string> = { ... }
```

- [ ] **Step 5: Replace the entire exterior draw block inside `drawMap` with the 6-pass tile renderer**

Find this block inside `drawMap` (around line 248):
```typescript
    } else {
      // ── Exterior: GBA tileset or fallback colored tiles ─────────────────
      ...
      // NPC trainers
      for (const t of map.trainers) {
        ...
      }
    }
```

Replace it with:

```typescript
    } else {
      // ── Pass 1: Base tiles ────────────────────────────────────────────────
      for (let vy = 0; vy < ROWS; vy++) {
        for (let vx = 0; vx < COLS; vx++) {
          const mx = playerX - hw + vx
          const my = playerY - hh + vy
          const tile: TileType = (my >= 0 && my < map.height && mx >= 0 && mx < map.width)
            ? map.tiles[my][mx] : 'tree'
          const x = vx * TILE, y = vy * TILE

          const grassImg = TILE_IMGS.grass
          const grassReady = grassImg.complete && grassImg.naturalWidth > 0

          if (tile === 'tree') {
            // tree base = grass underneath (tree image drawn in pass after base)
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
          } else if (tile === 'grass' || tile === 'building' || tile === 'door') {
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
          } else if (tile === 'land' || tile === 'path') {
            const img = TILE_IMGS.land
            if (img.complete && img.naturalWidth > 0) ctx.drawImage(img, x, y, TILE, TILE)
            else { ctx.fillStyle = '#c8a870'; ctx.fillRect(x, y, TILE, TILE) }
          } else if (tile === 'flower') {
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            const fi = TILE_IMGS.flower
            if (fi.complete && fi.naturalWidth > 0) ctx.drawImage(fi, x, y, TILE, TILE)
          } else if (tile === 'flower2') {
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            const fi = TILE_IMGS.flower2
            if (fi.complete && fi.naturalWidth > 0) ctx.drawImage(fi, x, y, TILE, TILE)
          } else if (tile === 'water') {
            ctx.fillStyle = '#48a8e0'; ctx.fillRect(x, y, TILE, TILE)
            ctx.fillStyle = 'rgba(255,255,255,0.45)'
            ctx.beginPath(); ctx.ellipse(x+TILE*0.28, y+TILE*0.38, TILE*0.18, TILE*0.09, 0, 0, Math.PI*2); ctx.fill()
            ctx.beginPath(); ctx.ellipse(x+TILE*0.70, y+TILE*0.65, TILE*0.16, TILE*0.08, 0, 0, Math.PI*2); ctx.fill()
          } else if (tile === 'fence' || tile === 'brush' || tile === 'gym') {
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
          } else {
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
          }
        }
      }

      // ── Pass 1b: Tree images (proportional, drawn over grass base) ────────
      const treeImg = TILE_IMGS.tree
      if (treeImg.complete && treeImg.naturalWidth > 0) {
        const th = TILE * (treeImg.naturalHeight / treeImg.naturalWidth)
        for (let vy = 0; vy < ROWS; vy++) {
          for (let vx = 0; vx < COLS; vx++) {
            const mx = playerX - hw + vx
            const my = playerY - hh + vy
            const tile: TileType = (my >= 0 && my < map.height && mx >= 0 && mx < map.width)
              ? map.tiles[my][mx] : 'tree'
            if (tile !== 'tree') continue
            ctx.imageSmoothingEnabled = false
            ctx.drawImage(treeImg, vx * TILE, vy * TILE + (TILE - th) / 2, TILE, th)
          }
        }
      }

      // ── Pass 2: Building overlays (proportional, chroma-keyed) ───────────
      const overlays = map.buildingOverlays ?? []
      for (const ov of overlays) {
        const key = ov.image.replace('tile_building_big.png', 'bldBig')
                           .replace('tile_building1.png',     'bldSmall')
                           .replace('tile_pokemon_center.png','bldPC')
        const rawImg = TILE_IMGS[key]
        if (!rawImg || !rawImg.complete || !rawImg.naturalWidth) continue
        if (!TILE_CANVASES[key]) TILE_CANVASES[key] = applyChromaKey(rawImg)
        const src = TILE_CANVASES[key]!
        const vx = ov.x - (playerX - hw)
        const vy = ov.y - (playerY - hh)
        drawProp(ctx, src, vx * TILE, vy * TILE, ov.heightTiles * TILE)
      }

      // ── Pass 3: Door visuals ──────────────────────────────────────────────
      for (let vy = 0; vy < ROWS; vy++) {
        for (let vx = 0; vx < COLS; vx++) {
          const mx = playerX - hw + vx
          const my = playerY - hh + vy
          if (my < 0 || my >= map.height || mx < 0 || mx >= map.width) continue
          if (map.tiles[my][mx] !== 'door') continue
          const x = vx * TILE, y = vy * TILE
          ctx.fillStyle = '#9c4f1e'; ctx.fillRect(x + 5, y + 3, TILE - 10, TILE - 5)
          ctx.fillStyle = '#c97233'
          ctx.fillRect(x + 6, y + 4, (TILE - 14) / 2, TILE - 9)
          ctx.fillRect(x + TILE / 2 + 2, y + 4, (TILE - 14) / 2, TILE - 9)
          ctx.fillStyle = '#f0c840'; ctx.fillRect(x + TILE / 2 - 2, y + TILE / 2, 4, 3)
        }
      }

      // ── Pass 4: NPC trainers ──────────────────────────────────────────────
      for (const t of map.trainers) {
        const vx = t.x - playerX + hw
        const vy = t.y - playerY + hh
        if (vx >= 0 && vx < COLS && vy >= 0 && vy < ROWS) {
          ctx.font = `${TILE * 0.7}px serif`
          ctx.textAlign = 'center'
          ctx.fillText('🧑', vx * TILE + TILE / 2, vy * TILE + TILE * 0.8)
        }
      }
    }
```

- [ ] **Step 6: Update the collision check in the `move` function**

Find (around line 374):
```typescript
    if (tile === 'tree' || tile === 'building') return
```

Replace with:
```typescript
    if (BLOCKED_TILES.has(tile)) return
```

- [ ] **Step 7: Verify the app compiles and renders**

```bash
cd "C:\Users\derek\Documents\Project\My Pokemon\.worktrees\build"
npm run dev
```

Open http://localhost:5173, log in, and navigate to the map. Tiles should render with real images instead of the GBA screenshot. Trees should appear proportional, buildings should be invisible collision boxes (image overlays come in Task 4 when palletTown gets buildingOverlays). Character sprites should now be the new male/female character images.

- [ ] **Step 8: Commit**

```bash
git add src/screens/WorldMap.tsx
git commit -m "feat(renderer): replace GBA background with programmatic tile renderer"
```

---

## Task 4: Redesign palletTown.ts

**Files:**
- Modify: `src/maps/palletTown.ts`

- [ ] **Step 1: Replace palletTown.ts entirely**

```typescript
import { MapData } from './types'

const T = 'tree'     as const
const G = 'grass'    as const
const L = 'land'     as const
const B = 'building' as const
const D = 'door'     as const

export const palletTown: MapData = {
  id: 'pallet',
  name: 'Pallet Town',
  width: 17,
  height: 12,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0: top border
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,G,B,B,B,B,B,B,G,B,B,B,B,B,G,T],  // row  2: buildings
    [T,G,G,B,B,B,B,B,B,G,B,B,B,B,B,G,T],  // row  3
    [T,G,G,B,B,B,B,B,B,G,B,B,B,B,B,G,T],  // row  4
    [T,G,G,B,B,B,B,B,B,G,B,B,B,B,B,G,T],  // row  5
    [T,G,G,B,B,B,B,B,B,G,B,B,B,B,B,G,T],  // row  6
    [T,G,L,L,L,L,D,L,L,L,L,D,L,L,L,L,T],  // row  7: path + doors
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  8
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  9
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 10
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 11: south exits
  ],
  buildingOverlays: [
    { x: 3,  y: 2, image: 'tile_building_big.png', heightTiles: 5 },  // PokéMart (left)
    { x: 10, y: 2, image: 'tile_building1.png',    heightTiles: 5 },  // House (right)
  ],
  wildPokemon: [],
  trainers: [],
  exits: [
    { x: 2,  y: 11, targetMap: 'sunlitMeadow', targetX: 2,  targetY: 0 },
    { x: 3,  y: 11, targetMap: 'sunlitMeadow', targetX: 3,  targetY: 0 },
    { x: 4,  y: 11, targetMap: 'sunlitMeadow', targetX: 4,  targetY: 0 },
    { x: 5,  y: 11, targetMap: 'sunlitMeadow', targetX: 5,  targetY: 0 },
    { x: 6,  y: 11, targetMap: 'sunlitMeadow', targetX: 6,  targetY: 0 },
    { x: 7,  y: 11, targetMap: 'sunlitMeadow', targetX: 7,  targetY: 0 },
    { x: 8,  y: 11, targetMap: 'sunlitMeadow', targetX: 8,  targetY: 0 },
    { x: 9,  y: 11, targetMap: 'sunlitMeadow', targetX: 9,  targetY: 0 },
    { x: 10, y: 11, targetMap: 'sunlitMeadow', targetX: 10, targetY: 0 },
    { x: 6,  y: 7,  targetMap: 'pokecenter',   targetX: 5,  targetY: 6 },
  ],
  doors: [
    { x: 11, y: 7, type: 'pokemart' },
  ],
}
```

- [ ] **Step 2: Verify the map renders correctly in the browser**

Open http://localhost:5173, navigate to the map. You should see:
- Grass tiles filling the open area
- Two building images rendered proportionally at the correct positions
- A land/path row at row 7 with door visuals
- Tree tiles on all borders

- [ ] **Step 3: Commit**

```bash
git add src/maps/palletTown.ts
git commit -m "feat(maps): redesign Pallet Town with tile renderer layout"
```

---

## Task 5: Create sunlitMeadow.ts

**Files:**
- Create: `src/maps/sunlitMeadow.ts`

- [ ] **Step 1: Create the file**

```typescript
import { MapData } from './types'

const T = 'tree'  as const
const G = 'grass' as const
const L = 'land'  as const
const F = 'flower' as const

export const sunlitMeadow: MapData = {
  id: 'sunlitMeadow',
  name: 'Sunlit Meadow',
  width: 15,
  height: 14,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0: north border
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,G,G,G,F,G,G,G,G,G,G,G,G,T],  // row  2
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  3
    [T,G,F,G,G,G,G,G,G,G,G,G,F,G,T],  // row  4
    [T,G,G,G,G,L,G,G,G,G,G,G,G,G,T],  // row  5: land path begins
    [T,G,G,G,G,L,G,G,G,G,G,G,G,G,T],  // row  6
    [T,G,G,F,G,L,G,G,G,F,G,G,G,G,T],  // row  7
    [T,G,G,G,G,L,G,G,G,G,G,G,G,G,T],  // row  8
    [T,G,G,G,G,L,G,G,G,G,G,G,G,G,T],  // row  9
    [T,G,F,G,G,G,G,G,G,G,G,G,G,G,T],  // row 10
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 11
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 12
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 13: south border
  ],
  wildPokemon: [
    { pokemonId: 16,  minLevel: 3,  maxLevel: 6,  rate: 40 },  // Pidgey
    { pokemonId: 19,  minLevel: 2,  maxLevel: 5,  rate: 30 },  // Rattata
    { pokemonId: 39,  minLevel: 4,  maxLevel: 7,  rate: 15 },  // Jigglypuff
    { pokemonId: 52,  minLevel: 4,  maxLevel: 8,  rate: 12 },  // Meowth
    { pokemonId: 143, minLevel: 12, maxLevel: 15, rate: 3  },  // Snorlax ⭐
  ],
  trainers: [],
  exits: [
    // North → Pallet Town row 11
    { x: 2,  y: 0, targetMap: 'pallet', targetX: 2,  targetY: 10 },
    { x: 3,  y: 0, targetMap: 'pallet', targetX: 3,  targetY: 10 },
    { x: 4,  y: 0, targetMap: 'pallet', targetX: 4,  targetY: 10 },
    { x: 5,  y: 0, targetMap: 'pallet', targetX: 5,  targetY: 10 },
    { x: 6,  y: 0, targetMap: 'pallet', targetX: 6,  targetY: 10 },
    { x: 7,  y: 0, targetMap: 'pallet', targetX: 7,  targetY: 10 },
    { x: 8,  y: 0, targetMap: 'pallet', targetX: 8,  targetY: 10 },
    { x: 9,  y: 0, targetMap: 'pallet', targetX: 9,  targetY: 10 },
    { x: 10, y: 0, targetMap: 'pallet', targetX: 10, targetY: 10 },
    // South → Viridian Forest row 13
    { x: 2,  y: 13, targetMap: 'viridianForest', targetX: 2,  targetY: 14 },
    { x: 3,  y: 13, targetMap: 'viridianForest', targetX: 3,  targetY: 14 },
    { x: 4,  y: 13, targetMap: 'viridianForest', targetX: 4,  targetY: 14 },
    { x: 5,  y: 13, targetMap: 'viridianForest', targetX: 5,  targetY: 14 },
    { x: 6,  y: 13, targetMap: 'viridianForest', targetX: 6,  targetY: 14 },
    { x: 7,  y: 13, targetMap: 'viridianForest', targetX: 7,  targetY: 14 },
    { x: 8,  y: 13, targetMap: 'viridianForest', targetX: 8,  targetY: 14 },
    { x: 9,  y: 13, targetMap: 'viridianForest', targetX: 9,  targetY: 14 },
    { x: 10, y: 13, targetMap: 'viridianForest', targetX: 10, targetY: 14 },
  ],
  doors: [],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/maps/sunlitMeadow.ts
git commit -m "feat(maps): add Sunlit Meadow (route 1 replacement)"
```

---

## Task 6: Create viridianForest.ts

**Files:**
- Create: `src/maps/viridianForest.ts`

- [ ] **Step 1: Create the file**

```typescript
import { MapData } from './types'

const T = 'tree'  as const
const G = 'grass' as const
const F = 'flower' as const

export const viridianForest: MapData = {
  id: 'viridianForest',
  name: 'Viridian Forest',
  width: 16,
  height: 16,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0: north border
    [T,G,G,T,T,T,T,G,G,T,T,T,T,G,T,T],  // row  1
    [T,G,G,T,G,G,T,G,G,G,T,T,G,G,T,T],  // row  2
    [T,G,T,T,G,G,T,T,T,T,G,T,T,G,T,T],  // row  3
    [T,G,G,G,G,G,G,G,G,T,T,G,G,G,T,T],  // row  4
    [T,T,G,G,F,G,G,G,G,G,G,F,G,T,T,T],  // row  5
    [T,T,T,G,G,G,T,T,T,G,G,G,T,T,T,T],  // row  6
    [T,G,G,G,G,T,T,T,G,G,T,G,G,G,T,T],  // row  7
    [T,G,G,T,T,G,G,G,G,T,T,G,G,T,T,T],  // row  8
    [T,G,T,T,T,G,G,F,G,G,G,T,T,G,T,T],  // row  9
    [T,G,G,G,T,T,T,G,G,G,T,G,G,G,T,T],  // row 10
    [T,T,T,G,G,T,T,G,G,G,T,T,G,T,T,T],  // row 11
    [T,T,T,G,G,G,G,G,G,F,G,G,G,T,T,T],  // row 12
    [T,G,G,T,T,G,G,G,G,G,G,G,G,G,T,T],  // row 13
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,T,T],  // row 14: south exits
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 15: south border
  ],
  wildPokemon: [
    { pokemonId: 10,  minLevel: 3,  maxLevel: 7,  rate: 25 },  // Caterpie
    { pokemonId: 13,  minLevel: 3,  maxLevel: 7,  rate: 25 },  // Weedle
    { pokemonId: 43,  minLevel: 4,  maxLevel: 8,  rate: 20 },  // Oddish
    { pokemonId: 1,   minLevel: 5,  maxLevel: 9,  rate: 15 },  // Bulbasaur ⭐
    { pokemonId: 25,  minLevel: 4,  maxLevel: 8,  rate: 12 },  // Pikachu ⭐
    { pokemonId: 11,  minLevel: 7,  maxLevel: 10, rate: 3  },  // Metapod
  ],
  trainers: [],
  exits: [
    // North → Sunlit Meadow row 13
    { x: 2,  y: 0, targetMap: 'sunlitMeadow', targetX: 2,  targetY: 12 },
    { x: 3,  y: 0, targetMap: 'sunlitMeadow', targetX: 3,  targetY: 12 },
    { x: 4,  y: 0, targetMap: 'sunlitMeadow', targetX: 4,  targetY: 12 },
    { x: 5,  y: 0, targetMap: 'sunlitMeadow', targetX: 5,  targetY: 12 },
    { x: 6,  y: 0, targetMap: 'sunlitMeadow', targetX: 6,  targetY: 12 },
    { x: 7,  y: 0, targetMap: 'sunlitMeadow', targetX: 7,  targetY: 12 },
    { x: 8,  y: 0, targetMap: 'sunlitMeadow', targetX: 8,  targetY: 12 },
    { x: 9,  y: 0, targetMap: 'sunlitMeadow', targetX: 9,  targetY: 12 },
    { x: 10, y: 0, targetMap: 'sunlitMeadow', targetX: 10, targetY: 12 },
    // East → Flower Meadow col 0
    { x: 15, y: 5,  targetMap: 'flowerMeadow', targetX: 0, targetY: 5  },
    { x: 15, y: 6,  targetMap: 'flowerMeadow', targetX: 0, targetY: 6  },
    { x: 15, y: 7,  targetMap: 'flowerMeadow', targetX: 0, targetY: 7  },
    { x: 15, y: 8,  targetMap: 'flowerMeadow', targetX: 0, targetY: 8  },
    { x: 15, y: 9,  targetMap: 'flowerMeadow', targetX: 0, targetY: 9  },
    { x: 15, y: 10, targetMap: 'flowerMeadow', targetX: 0, targetY: 10 },
  ],
  doors: [],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/maps/viridianForest.ts
git commit -m "feat(maps): add Viridian Forest"
```

---

## Task 7: Create flowerMeadow.ts

**Files:**
- Create: `src/maps/flowerMeadow.ts`

- [ ] **Step 1: Create the file**

```typescript
import { MapData } from './types'

const T = 'tree'   as const
const G = 'grass'  as const
const F = 'flower' as const
const N = 'flower2' as const

export const flowerMeadow: MapData = {
  id: 'flowerMeadow',
  name: 'Flower Meadow',
  width: 15,
  height: 15,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0
    [T,G,G,F,G,G,G,G,G,F,G,G,G,T,T],  // row  1
    [T,G,F,G,G,F,G,G,G,F,G,F,G,T,T],  // row  2
    [T,F,G,G,F,G,G,F,G,G,F,G,G,F,T],  // row  3
    [T,G,G,F,G,G,G,G,G,G,F,G,G,T,T],  // row  4
    [T,G,F,G,G,G,F,G,F,G,G,G,G,T,T],  // row  5: west exit
    [T,G,G,G,F,G,G,G,G,G,F,G,G,T,T],  // row  6: west exit
    [T,F,G,G,G,G,G,G,G,G,G,F,G,T,T],  // row  7: west exit
    [T,G,G,F,G,G,F,G,G,F,G,G,G,T,T],  // row  8: west exit
    [T,G,F,G,G,F,G,G,G,G,G,F,F,T,T],  // row  9: west exit
    [T,G,G,G,F,G,G,F,G,G,F,G,G,T,T],  // row 10: west exit
    [T,T,G,G,G,F,G,G,G,F,G,G,T,T,T],  // row 11
    [T,T,T,T,G,G,G,G,G,G,G,T,T,T,T],  // row 12
    [T,T,T,T,T,T,G,G,G,T,T,T,T,T,T],  // row 13: north exits (→ Misty Lake)
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 14
  ],
  wildPokemon: [
    { pokemonId: 43,  minLevel: 5,  maxLevel: 10, rate: 30 },  // Oddish
    { pokemonId: 35,  minLevel: 5,  maxLevel: 10, rate: 25 },  // Clefairy
    { pokemonId: 69,  minLevel: 6,  maxLevel: 11, rate: 20 },  // Bellsprout
    { pokemonId: 12,  minLevel: 8,  maxLevel: 12, rate: 10 },  // Butterfree
    { pokemonId: 133, minLevel: 8,  maxLevel: 12, rate: 12 },  // Eevee ⭐
    { pokemonId: 132, minLevel: 10, maxLevel: 14, rate: 3  },  // Ditto ⭐
  ],
  trainers: [],
  exits: [
    // West → Viridian Forest east edge
    { x: 0, y: 5,  targetMap: 'viridianForest', targetX: 14, targetY: 5  },
    { x: 0, y: 6,  targetMap: 'viridianForest', targetX: 14, targetY: 6  },
    { x: 0, y: 7,  targetMap: 'viridianForest', targetX: 14, targetY: 7  },
    { x: 0, y: 8,  targetMap: 'viridianForest', targetX: 14, targetY: 8  },
    { x: 0, y: 9,  targetMap: 'viridianForest', targetX: 14, targetY: 9  },
    { x: 0, y: 10, targetMap: 'viridianForest', targetX: 14, targetY: 10 },
    // North → Misty Lake row 15
    { x: 6,  y: 0, targetMap: 'mistyLake', targetX: 6,  targetY: 14 },
    { x: 7,  y: 0, targetMap: 'mistyLake', targetX: 7,  targetY: 14 },
    { x: 8,  y: 0, targetMap: 'mistyLake', targetX: 8,  targetY: 14 },
  ],
  doors: [],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/maps/flowerMeadow.ts
git commit -m "feat(maps): add Flower Meadow"
```

---

## Task 8: Create mistyLake.ts

**Files:**
- Create: `src/maps/mistyLake.ts`

- [ ] **Step 1: Create the file**

```typescript
import { MapData } from './types'

const T = 'tree'  as const
const G = 'grass' as const
const W = 'water' as const
const L = 'land'  as const

export const mistyLake: MapData = {
  id: 'mistyLake',
  name: 'Misty Lake',
  width: 18,
  height: 16,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,G,G,G,G,G,G,W,W,W,W,G,G,G,T,T,T],  // row  2
    [T,G,G,G,G,G,W,W,W,W,W,W,W,W,G,G,T,T],  // row  3
    [T,G,G,G,G,W,W,W,W,W,W,W,W,W,W,G,T,T],  // row  4
    [T,G,G,G,W,W,W,W,W,W,W,W,W,W,W,W,G,T],  // row  5
    [T,G,G,W,W,W,W,W,W,W,W,W,W,W,W,W,G,T],  // row  6
    [T,G,G,W,W,W,W,W,W,W,W,W,W,W,W,W,G,T],  // row  7
    [T,G,G,W,W,W,W,W,W,W,W,W,W,W,W,W,G,T],  // row  8
    [T,G,G,G,W,W,W,W,W,W,W,W,W,W,W,G,G,T],  // row  9
    [T,G,G,G,G,W,W,W,W,W,W,W,W,W,G,G,G,T],  // row 10
    [T,G,G,G,G,G,G,G,W,W,W,W,G,G,G,G,T,T],  // row 11
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 12
    [T,G,G,L,L,L,L,L,L,L,L,L,L,G,G,G,G,T],  // row 13: land path
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 14: south exits
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 15
  ],
  wildPokemon: [
    { pokemonId: 54,  minLevel: 8,  maxLevel: 13, rate: 35 },  // Psyduck
    { pokemonId: 60,  minLevel: 8,  maxLevel: 13, rate: 30 },  // Poliwag
    { pokemonId: 118, minLevel: 10, maxLevel: 15, rate: 20 },  // Goldeen
    { pokemonId: 131, minLevel: 12, maxLevel: 16, rate: 12 },  // Lapras ⭐
    { pokemonId: 149, minLevel: 20, maxLevel: 25, rate: 3  },  // Dragonite ⭐
  ],
  waterPokemon: [
    { pokemonId: 129, minLevel: 5,  maxLevel: 10, rate: 50 },  // Magikarp
    { pokemonId: 60,  minLevel: 8,  maxLevel: 13, rate: 30 },  // Poliwag
    { pokemonId: 130, minLevel: 15, maxLevel: 20, rate: 20 },  // Gyarados ⭐
  ],
  trainers: [],
  exits: [
    // South → Flower Meadow row 0
    { x: 6, y: 15, targetMap: 'flowerMeadow', targetX: 6, targetY: 1 },
    { x: 7, y: 15, targetMap: 'flowerMeadow', targetX: 7, targetY: 1 },
    { x: 8, y: 15, targetMap: 'flowerMeadow', targetX: 8, targetY: 1 },
    // East → Rocky Cave col 0
    { x: 17, y: 6,  targetMap: 'rockyCave', targetX: 1, targetY: 6  },
    { x: 17, y: 7,  targetMap: 'rockyCave', targetX: 1, targetY: 7  },
    { x: 17, y: 8,  targetMap: 'rockyCave', targetX: 1, targetY: 8  },
    { x: 17, y: 9,  targetMap: 'rockyCave', targetX: 1, targetY: 9  },
    { x: 17, y: 10, targetMap: 'rockyCave', targetX: 1, targetY: 10 },
  ],
  doors: [],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/maps/mistyLake.ts
git commit -m "feat(maps): add Misty Lake"
```

---

## Task 9: Create rockyCave.ts

**Files:**
- Create: `src/maps/rockyCave.ts`

Rocky Cave uses `'building'` as the cave rock wall (blocked, dark) and `'path'` as the cave floor (walkable).

- [ ] **Step 1: Create the file**

```typescript
import { MapData } from './types'

const K = 'building' as const   // cave rock wall — blocked
const R = 'path'     as const   // cave floor — walkable

export const rockyCave: MapData = {
  id: 'rockyCave',
  name: 'Rocky Cave',
  width: 16,
  height: 14,
  tiles: [
    [K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K],  // row  0
    [K,R,R,R,K,K,T,T,R,R,R,R,R,R,R,K],  // row  1
    [K,R,K,T,T,R,R,T,K,K,T,T,R,R,K,K],  // row  2
    [K,R,R,T,R,R,R,R,T,T,T,R,R,T,R,K],  // row  3
    [K,T,R,R,R,T,T,R,R,T,R,R,T,T,K,K],  // row  4
    [K,T,T,T,R,R,R,R,R,R,T,T,T,T,R,K],  // row  5
    [K,T,R,R,R,R,R,R,T,R,R,R,T,T,K,K],  // row  6: west exits
    [K,R,R,T,T,R,R,R,R,R,R,R,T,R,R,K],  // row  7: west exits
    [K,R,T,T,T,T,R,R,R,T,R,R,T,R,T,K],  // row  8: west exits
    [K,R,R,R,T,R,R,T,R,R,R,R,T,R,K,K],  // row  9: west exits
    [K,T,T,R,R,R,T,T,R,R,T,R,R,R,T,T],  // row 10: west exits
    [K,T,T,T,R,R,T,T,R,R,R,R,T,T,T,K],  // row 11
    [K,T,T,T,T,R,R,R,R,R,R,T,T,T,T,K],  // row 12
    [K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K],  // row 13
  ],
  wildPokemon: [
    { pokemonId: 74,  minLevel: 10, maxLevel: 16, rate: 35 },  // Geodude
    { pokemonId: 41,  minLevel: 10, maxLevel: 15, rate: 30 },  // Zubat
    { pokemonId: 95,  minLevel: 12, maxLevel: 18, rate: 20 },  // Onix
    { pokemonId: 75,  minLevel: 15, maxLevel: 20, rate: 12 },  // Graveler
    { pokemonId: 94,  minLevel: 18, maxLevel: 22, rate: 3  },  // Gengar ⭐
  ],
  trainers: [],
  exits: [
    // West → Misty Lake east edge
    { x: 0, y: 6,  targetMap: 'mistyLake', targetX: 16, targetY: 6  },
    { x: 0, y: 7,  targetMap: 'mistyLake', targetX: 16, targetY: 7  },
    { x: 0, y: 8,  targetMap: 'mistyLake', targetX: 16, targetY: 8  },
    { x: 0, y: 9,  targetMap: 'mistyLake', targetX: 16, targetY: 9  },
    { x: 0, y: 10, targetMap: 'mistyLake', targetX: 16, targetY: 10 },
    // East → Trainer Road col 0
    { x: 15, y: 5,  targetMap: 'trainerRoad', targetX: 1, targetY: 5  },
    { x: 15, y: 6,  targetMap: 'trainerRoad', targetX: 1, targetY: 6  },
    { x: 15, y: 7,  targetMap: 'trainerRoad', targetX: 1, targetY: 7  },
    { x: 15, y: 8,  targetMap: 'trainerRoad', targetX: 1, targetY: 8  },
    { x: 15, y: 9,  targetMap: 'trainerRoad', targetX: 1, targetY: 9  },
  ],
  doors: [],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/maps/rockyCave.ts
git commit -m "feat(maps): add Rocky Cave"
```

---

## Task 10: Create trainerRoad.ts

**Files:**
- Create: `src/maps/trainerRoad.ts`

- [ ] **Step 1: Create the file**

```typescript
import { MapData } from './types'

const T = 'tree' as const
const G = 'grass' as const
const L = 'land'  as const

export const trainerRoad: MapData = {
  id: 'trainerRoad',
  name: 'Trainer Road',
  width: 18,
  height: 12,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  1
    [T,G,T,T,G,G,G,G,G,T,T,T,G,G,G,T,T,T],  // row  2
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  3
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  4
    [L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L],  // row  5: west exits
    [L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L],  // row  6: west exits
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  7
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row  8
    [T,G,T,T,G,G,G,T,T,G,G,T,T,G,G,T,T,T],  // row  9
    [T,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,G,T],  // row 10
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 11
  ],
  wildPokemon: [
    { pokemonId: 58,  minLevel: 15, maxLevel: 20, rate: 35 },  // Growlithe
    { pokemonId: 37,  minLevel: 15, maxLevel: 20, rate: 30 },  // Vulpix
    { pokemonId: 66,  minLevel: 15, maxLevel: 22, rate: 25 },  // Machop
    { pokemonId: 56,  minLevel: 14, maxLevel: 20, rate: 10 },  // Mankey
  ],
  trainers: [
    {
      x: 6, y: 3, direction: 'down',
      name: 'Biker Koji',
      party: [{ pokemonId: 58, level: 20 }, { pokemonId: 37, level: 20 }],
    },
    {
      x: 12, y: 8, direction: 'down',
      name: 'Lass Mika',
      party: [{ pokemonId: 35, level: 18 }, { pokemonId: 39, level: 19 }, { pokemonId: 52, level: 18 }],
    },
  ],
  exits: [
    // West → Rocky Cave east edge
    { x: 0, y: 5, targetMap: 'rockyCave', targetX: 14, targetY: 5 },
    { x: 0, y: 6, targetMap: 'rockyCave', targetX: 14, targetY: 6 },
    // East → Cinnabar Town col 0
    { x: 17, y: 5, targetMap: 'cinnabarTown', targetX: 1, targetY: 5 },
    { x: 17, y: 6, targetMap: 'cinnabarTown', targetX: 1, targetY: 6 },
  ],
  doors: [],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/maps/trainerRoad.ts
git commit -m "feat(maps): add Trainer Road with 2 trainers"
```

---

## Task 11: Create cinnabarTown.ts

**Files:**
- Create: `src/maps/cinnabarTown.ts`

- [ ] **Step 1: Create the file**

```typescript
import { MapData } from './types'

const T = 'tree'     as const
const L = 'land'     as const
const B = 'building' as const
const D = 'door'     as const
const F = 'flower'   as const

export const cinnabarTown: MapData = {
  id: 'cinnabarTown',
  name: 'Cinnabar Town',
  width: 17,
  height: 12,
  tiles: [
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row  0: north exits (→ Volcano Trail)
    [T,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,T],  // row  1
    [T,L,F,G,B,B,B,B,B,B,G,B,B,B,B,B,T],  // row  2
    [T,L,L,G,B,B,B,B,B,B,G,B,B,B,B,B,T],  // row  3
    [T,L,F,G,B,B,B,B,B,B,G,B,B,B,B,B,T],  // row  4
    [T,L,L,G,B,B,B,B,B,B,G,B,B,B,B,B,T],  // row  5: west exits
    [T,L,L,G,B,B,B,B,B,B,G,B,B,B,B,B,T],  // row  6: west exits
    [T,L,L,L,L,L,D,L,L,L,L,D,L,L,L,L,T],  // row  7: path + doors
    [T,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,T],  // row  8
    [T,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,T],  // row  9
    [T,L,L,L,L,L,L,L,L,L,L,L,L,L,L,L,T],  // row 10
    [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T],  // row 11
  ],
  buildingOverlays: [
    { x: 4,  y: 2, image: 'tile_pokemon_center.png', heightTiles: 5 },  // Pokémon Center
    { x: 11, y: 2, image: 'tile_building_big.png',   heightTiles: 5 },  // Gym
  ],
  wildPokemon: [],
  trainers: [],
  exits: [
    // West → Trainer Road east edge
    { x: 0, y: 5, targetMap: 'trainerRoad', targetX: 16, targetY: 5 },
    { x: 0, y: 6, targetMap: 'trainerRoad', targetX: 16, targetY: 6 },
    // North → Volcano Trail row 11
    { x: 4,  y: 0, targetMap: 'volcanoTrail', targetX: 4,  targetY: 10 },
    { x: 5,  y: 0, targetMap: 'volcanoTrail', targetX: 5,  targetY: 10 },
    { x: 6,  y: 0, targetMap: 'volcanoTrail', targetX: 6,  targetY: 10 },
    { x: 7,  y: 0, targetMap: 'volcanoTrail', targetX: 7,  targetY: 10 },
    { x: 8,  y: 0, targetMap: 'volcanoTrail', targetX: 8,  targetY: 10 },
    { x: 6,  y: 7, targetMap: 'pokecenter',   targetX: 5,  targetY: 6  },
  ],
  doors: [
    { x: 11, y: 7, type: 'gym' },
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/maps/cinnabarTown.ts
git commit -m "feat(maps): add Cinnabar Town"
```

---

## Task 12: Create volcanoTrail.ts

**Files:**
- Create: `src/maps/volcanoTrail.ts`

Volcano Trail uses `'path'` as the walkable volcanic floor and `'building'` as the blocked rock walls.

- [ ] **Step 1: Create the file**

```typescript
import { MapData } from './types'

const K = 'building' as const  // blocked volcanic rock
const V = 'path'     as const  // walkable volcanic ground

export const volcanoTrail: MapData = {
  id: 'volcanoTrail',
  name: 'Volcano Trail',
  width: 16,
  height: 16,
  tiles: [
    [K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K],  // row  0
    [K,V,V,K,K,V,V,V,V,V,V,K,K,V,V,K],  // row  1
    [K,V,K,K,K,V,V,K,K,K,K,V,V,K,V,K],  // row  2
    [K,V,V,V,V,K,K,V,V,K,K,V,V,V,V,K],  // row  3
    [K,K,K,K,V,V,V,V,V,V,V,V,K,K,K,K],  // row  4
    [K,K,V,V,K,K,K,K,V,V,K,K,V,V,K,K],  // row  5
    [K,V,V,K,K,V,V,K,K,V,K,K,V,V,K,K],  // row  6
    [K,V,K,K,V,V,V,V,V,V,K,K,V,K,K,K],  // row  7
    [K,V,V,V,V,K,K,V,V,V,V,V,K,K,K,K],  // row  8
    [K,K,K,V,V,V,K,K,K,V,V,K,K,V,V,K],  // row  9
    [K,K,V,V,K,V,V,V,V,V,K,V,V,V,K,K],  // row 10: south exits
    [K,V,V,K,K,K,K,V,V,K,K,K,K,V,V,K],  // row 11
    [K,V,K,K,K,V,V,V,V,K,K,V,K,K,V,K],  // row 12
    [K,V,V,V,V,K,K,K,K,V,V,K,V,V,V,K],  // row 13
    [K,K,V,V,V,V,V,V,V,V,V,V,V,K,K,K],  // row 14
    [K,K,K,K,K,K,K,K,K,K,K,K,K,K,K,K],  // row 15
  ],
  wildPokemon: [
    { pokemonId: 77,  minLevel: 20, maxLevel: 28, rate: 30 },  // Ponyta
    { pokemonId: 126, minLevel: 22, maxLevel: 28, rate: 30 },  // Magmar
    { pokemonId: 38,  minLevel: 25, maxLevel: 30, rate: 20 },  // Ninetales
    { pokemonId: 59,  minLevel: 25, maxLevel: 32, rate: 15 },  // Arcanine
    { pokemonId: 6,   minLevel: 35, maxLevel: 40, rate: 4  },  // Charizard ⭐
    { pokemonId: 150, minLevel: 45, maxLevel: 50, rate: 1  },  // Mewtwo ⭐
  ],
  trainers: [],
  exits: [
    // South → Cinnabar Town row 0
    { x: 4, y: 15, targetMap: 'cinnabarTown', targetX: 4, targetY: 1 },
    { x: 5, y: 15, targetMap: 'cinnabarTown', targetX: 5, targetY: 1 },
    { x: 6, y: 15, targetMap: 'cinnabarTown', targetX: 6, targetY: 1 },
    { x: 7, y: 15, targetMap: 'cinnabarTown', targetX: 7, targetY: 1 },
    { x: 8, y: 15, targetMap: 'cinnabarTown', targetX: 8, targetY: 1 },
  ],
  doors: [],
}
```

- [ ] **Step 2: Commit**

```bash
git add src/maps/volcanoTrail.ts
git commit -m "feat(maps): add Volcano Trail"
```

---

## Task 13: Register all 9 maps in index.ts

**Files:**
- Modify: `src/maps/index.ts`

- [ ] **Step 1: Replace index.ts entirely**

```typescript
import { palletTown }     from './palletTown'
import { sunlitMeadow }   from './sunlitMeadow'
import { viridianForest } from './viridianForest'
import { flowerMeadow }   from './flowerMeadow'
import { mistyLake }      from './mistyLake'
import { rockyCave }      from './rockyCave'
import { trainerRoad }    from './trainerRoad'
import { cinnabarTown }   from './cinnabarTown'
import { volcanoTrail }   from './volcanoTrail'
import { pokeCenter }     from './pokeCenter'
import { MapData }        from './types'

export const MAPS: Record<string, MapData> = {
  pallet:         palletTown,
  sunlitMeadow,
  viridianForest,
  flowerMeadow,
  mistyLake,
  rockyCave,
  trainerRoad,
  cinnabarTown,
  volcanoTrail,
  pokecenter:     pokeCenter,
  // Backward-compatibility alias — old saved positions using 'route1' load Sunlit Meadow
  route1:         sunlitMeadow,
}

export function getMap(id: string): MapData {
  return MAPS[id] ?? palletTown
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:\Users\derek\Documents\Project\My Pokemon\.worktrees\build"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Test map navigation in the browser**

Open http://localhost:5173, walk south from Pallet Town — should transition to Sunlit Meadow. Walk further south to reach Viridian Forest. Check that the map name label updates correctly on each transition.

- [ ] **Step 4: Commit**

```bash
git add src/maps/index.ts
git commit -m "feat(maps): register all 9 world maps, alias route1 → sunlitMeadow"
```

---

## Task 14: Add party switching to battleStore and game types

**Files:**
- Modify: `src/types/game.ts`
- Modify: `src/store/battleStore.ts`

- [ ] **Step 1: Add `'switch_pokemon'` to BattlePhase in `src/types/game.ts`**

Find line 174:
```typescript
export type BattlePhase =
  | 'idle' | 'player_turn' | 'question' | 'animating'
  | 'opponent_turn' | 'catch' | 'win' | 'lose' | 'escaped' | 'evolving'
```

Replace with:
```typescript
export type BattlePhase =
  | 'idle' | 'player_turn' | 'question' | 'animating'
  | 'opponent_turn' | 'catch' | 'win' | 'lose' | 'escaped' | 'evolving'
  | 'switch_pokemon'
```

- [ ] **Step 2: Add `party` and `switchPokemon` to battleStore interface**

In `src/store/battleStore.ts`, add to the `BattleState` interface after `trainerName: string | null`:

```typescript
  party: PartyPokemon[]
  switchPokemon: (index: number) => void
```

- [ ] **Step 3: Add `party: []` to `initialState` in battleStore.ts**

Find:
```typescript
const initialState = {
  phase: 'idle' as BattlePhase,
  playerPokemon: null,
  opponentPokemon: null,
  isWildBattle: false,
```

Add `party: [] as PartyPokemon[],` after `isWildBattle: false,`:

```typescript
const initialState = {
  phase: 'idle' as BattlePhase,
  playerPokemon: null,
  opponentPokemon: null,
  isWildBattle: false,
  party: [] as PartyPokemon[],
```

- [ ] **Step 4: Update `startWildBattle` and `startTrainerBattle` signatures to accept party**

Replace the two `start*` actions:

```typescript
  startWildBattle: (player, opponent, party) => set({
    ...initialState,
    phase: 'player_turn',
    playerPokemon: player,
    opponentPokemon: opponent,
    party,
    isWildBattle: true,
    trainerName: null,
    log: [`A wild ${opponent.pokemonId} appeared!`],
    usedQuestionIds: new Set(),
  }),

  startTrainerBattle: (player, opponent, trainerName, party) => set({
    ...initialState,
    phase: 'player_turn',
    playerPokemon: player,
    opponentPokemon: opponent,
    party,
    isWildBattle: false,
    trainerName,
    log: [`${trainerName} sent out ${opponent.pokemonId}!`],
    usedQuestionIds: new Set(),
  }),
```

- [ ] **Step 5: Update the interface signatures to match**

In the `BattleState` interface, replace:
```typescript
  startWildBattle: (player: PartyPokemon, opponent: PartyPokemon) => void
  startTrainerBattle: (player: PartyPokemon, opponent: PartyPokemon, trainerName: string) => void
```
With:
```typescript
  startWildBattle: (player: PartyPokemon, opponent: PartyPokemon, party: PartyPokemon[]) => void
  startTrainerBattle: (player: PartyPokemon, opponent: PartyPokemon, trainerName: string, party: PartyPokemon[]) => void
```

- [ ] **Step 6: Add `switchPokemon` action to the store**

After the `resetBattle` action, add:

```typescript
  switchPokemon: (index) => set((state) => {
    const chosen = state.party[index]
    if (!chosen || chosen.currentHp <= 0) return {}
    return { playerPokemon: chosen, phase: 'player_turn' }
  }),
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: Errors in WorldMap.tsx where startWildBattle/startTrainerBattle are called with old signatures — fix those in the next task.

- [ ] **Step 8: Commit**

```bash
git add src/types/game.ts src/store/battleStore.ts
git commit -m "feat(battle): add party and switchPokemon to battle store"
```

---

## Task 15: Add party switch UI to Battle.tsx

**Files:**
- Modify: `src/screens/Battle.tsx`

- [ ] **Step 1: Add the switch_pokemon UI block**

In `Battle.tsx`, find the lose phase block (around line 573):
```tsx
        {/* ── LOSE ── */}
        {phase === 'lose' && (
```

Add this block immediately **before** the lose block:

```tsx
        {/* ── SWITCH POKÉMON ── */}
        {phase === 'switch_pokemon' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '16px 0', flex: 1, justifyContent: 'center' }}>
            <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: 15, fontFamily: MONO, marginBottom: 4 }}>
              Choose your next Pokémon!
            </div>
            {party.map((p, i) => {
              const info = pokemonDataMap[p.pokemonId]
              const name = (p.nickname || info?.name || `#${p.pokemonId}`).toUpperCase()
              const fainted = p.currentHp <= 0
              return (
                <button
                  key={i}
                  disabled={fainted}
                  onClick={() => switchPokemon(i)}
                  style={{
                    width: 220, padding: '8px 12px',
                    background: fainted ? '#2a2a2a' : '#16213e',
                    border: `2px solid ${fainted ? '#555' : '#4ecdc4'}`,
                    borderRadius: 6, cursor: fainted ? 'not-allowed' : 'pointer',
                    color: fainted ? '#666' : '#e6edf3',
                    fontFamily: MONO, fontSize: 12,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}
                >
                  <span>{name} {fainted ? '(fainted)' : ''}</span>
                  <span style={{ color: fainted ? '#666' : '#58d040' }}>
                    {fainted ? '0' : p.currentHp}/{p.maxHp} HP
                  </span>
                </button>
              )
            })}
          </div>
        )}
```

- [ ] **Step 2: Destructure `party` and `switchPokemon` from the battle store**

Find the existing destructuring of the battle store near the top of the `Battle` function component. It will look like:
```typescript
  const { phase, playerPokemon, opponentPokemon, ... } = useBattleStore(s => s)
```

Add `party` and `switchPokemon` to the destructuring:
```typescript
  const party        = useBattleStore(s => s.party)
  const switchPokemon = useBattleStore(s => s.switchPokemon)
```

- [ ] **Step 3: Verify the screen renders without errors**

```bash
npx tsc --noEmit
```

Expected: Errors only in WorldMap.tsx (battle call sites not yet updated). Battle.tsx itself should compile.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Battle.tsx
git commit -m "feat(battle): add party switch selection UI"
```

---

## Task 16: Wire party into battle calls and fix faint logic

**Files:**
- Modify: `src/screens/WorldMap.tsx`
- Modify: `src/hooks/useBattleEngine.ts`

- [ ] **Step 1: Update `startWildBattle` in WorldMap.tsx to pass the full party**

In `WorldMap.tsx`, find the `startWildBattle` function. It ends with:
```typescript
    useBattleStore.getState().startWildBattle(player, opponent)
```

Replace with:
```typescript
    const fullParty = currentProfile.party.map(slot => {
      const info = pokemonMap[slot.pokemonId]
      if (!info) return null
      const built = buildPartyPokemon(info, slot.level)
      built.currentHp = slot.currentHp ?? built.maxHp
      built.xp = slot.xp ?? built.xp
      built.moves = slot.moves?.length > 0 ? [...slot.moves] : built.moves
      built.nickname = slot.nickname
      return built
    }).filter((p): p is NonNullable<typeof p> => p !== null)
    useBattleStore.getState().startWildBattle(player, opponent, fullParty)
```

- [ ] **Step 2: Update `startTrainerBattle` in WorldMap.tsx similarly**

Find:
```typescript
    useBattleStore.getState().startTrainerBattle(player, opponent, trainer.name)
```

Replace with:
```typescript
    const fullParty = currentProfile.party.map(slot => {
      const info = pokemonMap[slot.pokemonId]
      if (!info) return null
      const built = buildPartyPokemon(info, slot.level)
      built.currentHp = slot.currentHp ?? built.maxHp
      built.xp = slot.xp ?? built.xp
      built.moves = slot.moves?.length > 0 ? [...slot.moves] : built.moves
      built.nickname = slot.nickname
      return built
    }).filter((p): p is NonNullable<typeof p> => p !== null)
    useBattleStore.getState().startTrainerBattle(player, opponent, trainer.name, fullParty)
```

- [ ] **Step 3: Update faint check in `useBattleEngine.ts` to trigger switch instead of lose**

Find (around line 175):
```typescript
    if (useBattleStore.getState().playerPokemon!.currentHp <= 0) {
      store.addLog(`${getName(playerPokemon)} fainted!`)
      store.setPhase('lose')
      return
    }
```

Replace with:
```typescript
    if (useBattleStore.getState().playerPokemon!.currentHp <= 0) {
      store.addLog(`${getName(playerPokemon)} fainted!`)
      const { party } = useBattleStore.getState()
      const hasHealthy = party.some(p => p !== useBattleStore.getState().playerPokemon && p.currentHp > 0)
      if (hasHealthy) {
        store.setPhase('switch_pokemon')
      } else {
        store.setPhase('lose')
      }
      return
    }
```

- [ ] **Step 4: Verify everything compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Test the full flow in the browser**

1. Start the dev server: `npm run dev`
2. Navigate to the map, trigger a wild battle
3. Let your Pokémon take enough damage to faint
4. Verify the party selection screen appears with all party members listed
5. Select a healthy Pokémon — battle should resume at `player_turn`
6. If all Pokémon faint, verify "You blacked out" still appears

- [ ] **Step 6: Commit**

```bash
git add src/screens/WorldMap.tsx src/hooks/useBattleEngine.ts
git commit -m "feat(battle): wire full party into battles, trigger switch on faint"
```

---

## Self-Review Against Spec

**Spec section → Task coverage:**

| Spec section | Covered by |
|---|---|
| Tile image assets (Background.png, tile_tree, etc.) | Task 1 (copy), Task 3 (load) |
| Building overlays (proportional, chroma-keyed) | Task 3 (renderer pass 2), Tasks 4 & 11 (overlays defined) |
| Character sprites (new male/female PNGs) | Task 1 (copy), Task 3 (SPRITE_FILES updated) |
| MapData type changes (new tiles, BuildingOverlay) | Task 2 |
| 6-pass renderer | Task 3 |
| All 9 maps with correct Pokémon | Tasks 4–12 |
| Map connections (exits in both directions) | Tasks 4–13 |
| route1 alias | Task 13 |
| Battle party switching | Tasks 14–16 |
| switch_pokemon phase | Tasks 14–16 |
| Firestore party HP save after battle | Handled by existing `useFirestoreProfile` — battleStore already writes back via profileStore on win/lose (no new code needed; party HP is read from profileStore when battle starts, written back by existing win/lose handlers) |

**Firestore HP save note:** The existing flow reads HP from `currentProfile.party` at battle start. After battle, the existing `win` / `lose` handlers in `useBattleEngine` already call `updateProfile` to save XP and HP back. The `switch_pokemon` phase only changes who is active in the store — when the battle eventually ends (win or lose), the existing save runs as normal. No additional Firestore code is needed.
