# Bike Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable bike mode that shows a bike-riding sprite, moves the player 2× faster, and suppresses all wild Pokémon and trainer battles.

**Architecture:** A single `isBiking` boolean state (+ ref mirror) is added to WorldMap. Sprite selection, move speed, encounter checks, and trainer triggers all gate on this flag. Bike sprites are pre-generated PNGs already in `NPC Characters/Male_Biker/` and `NPC Characters/Female_Biker/`.

**Tech Stack:** React 18 + TypeScript + Vite, Zustand, HTML Canvas (WorldMap.tsx), Pillow (sprite generation already done)

---

### Task 1: Copy bike sprites to public/characters/

**Files:**
- Copy: `NPC Characters/Male_Biker/*.png` → `public/characters/`
- Copy: `NPC Characters/Female_Biker/*.png` → `public/characters/`

- [ ] **Step 1: Copy all 8 sprite files**

```powershell
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\NPC Characters\Male_Biker\Male_Biker - Look at the front.png"  "C:\Users\derek\Documents\Project\My Pokemon\public\characters\Male Biker - Look at the front.png"
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\NPC Characters\Male_Biker\Male_Biker - Look at the back.png"   "C:\Users\derek\Documents\Project\My Pokemon\public\characters\Male Biker - Look at the back.png"
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\NPC Characters\Male_Biker\Male_Biker - Look at the left.png"   "C:\Users\derek\Documents\Project\My Pokemon\public\characters\Male Biker - Look at the left.png"
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\NPC Characters\Male_Biker\Male_Biker - Look at the right.png"  "C:\Users\derek\Documents\Project\My Pokemon\public\characters\Male Biker - Look at the right.png"
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\NPC Characters\Female_Biker\Female_Biker - Look at the front.png" "C:\Users\derek\Documents\Project\My Pokemon\public\characters\Female Biker - Look at the front.png"
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\NPC Characters\Female_Biker\Female_Biker - Look at the back.png"  "C:\Users\derek\Documents\Project\My Pokemon\public\characters\Female Biker - Look at the back.png"
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\NPC Characters\Female_Biker\Female_Biker - Look at the left.png"  "C:\Users\derek\Documents\Project\My Pokemon\public\characters\Female Biker - Look at the left.png"
Copy-Item "C:\Users\derek\Documents\Project\My Pokemon\NPC Characters\Female_Biker\Female_Biker - Look at the right.png" "C:\Users\derek\Documents\Project\My Pokemon\public\characters\Female Biker - Look at the right.png"
```

- [ ] **Step 2: Verify 8 files exist**

Run: `Get-ChildItem "public\characters" | Where-Object { $_.Name -like "*Biker*" }`
Expected: 8 files listed

---

### Task 2: Add bike entries to SPRITE_FILES (WorldMap.tsx:64-81)

**Files:**
- Modify: `src/screens/WorldMap.tsx:81`

- [ ] **Step 1: Add 8 bike sprite entries after line 80 (before the closing `}`)**

Insert after `female_run_right: 'characters/Female Character - Run to the right.png',`:

```typescript
  male_bike_down:   'characters/Male Biker - Look at the front.png',
  male_bike_up:     'characters/Male Biker - Look at the back.png',
  male_bike_left:   'characters/Male Biker - Look at the left.png',
  male_bike_right:  'characters/Male Biker - Look at the right.png',
  female_bike_down:  'characters/Female Biker - Look at the front.png',
  female_bike_up:    'characters/Female Biker - Look at the back.png',
  female_bike_left:  'characters/Female Biker - Look at the left.png',
  female_bike_right: 'characters/Female Biker - Look at the right.png',
```

---

### Task 3: Add isBiking state + ref (WorldMap.tsx:328-329)

**Files:**
- Modify: `src/screens/WorldMap.tsx:329`

- [ ] **Step 1: Add isBiking state and ref after the moveTimerRef line**

Insert after `const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)`:

```typescript
  const [isBiking, setIsBiking] = useState(false)
  const isBikingRef = useRef(false)
```

---

### Task 4: Change sprite selection to use bike pose (WorldMap.tsx:1233)

**Files:**
- Modify: `src/screens/WorldMap.tsx:1233`

- [ ] **Step 1: Replace the pose line to gate on isBiking**

Change:
```typescript
    const pose = isMoving ? 'run' : 'stand'
```
To:
```typescript
    const pose = isBiking ? 'bike' : isMoving ? 'run' : 'stand'
```

Note: `drawMap` takes `isMoving` as a parameter; `isBiking` must be captured from the outer component scope. Since `drawMap` is a `useCallback`, add `isBiking` to its dependency array (or read `isBikingRef.current` instead to avoid stale closure — use `isBikingRef.current`).

Actual change — use the ref to avoid dependency array issues:
```typescript
    const pose = isBikingRef.current ? 'bike' : isMoving ? 'run' : 'stand'
```

---

### Task 5: Add 2-tile movement speed when biking (WorldMap.tsx:1274)

**Files:**
- Modify: `src/screens/WorldMap.tsx:1274`

- [ ] **Step 1: Wrap move() body in a helper and call it twice when biking**

Replace the start of the `move` callback — the current `const newDir` + position calc — with a helper that calls the core step logic. Simplest approach: after the position is committed (after `setPy(ny)`), if biking, call `move(dx, dy)` again immediately.

Instead of recursion, just call the existing step logic by extracting to a `doStep` function, or — simplest — after `setPy(ny)` when biking, fire a second immediate move:

At the end of `move()`, after the encounter check block (line ~1422), add:

```typescript
    if (isBikingRef.current) {
      move(dx, dy)
    }
```

Wait — this would cause double encounter rolls. Better: move 2 tiles in one call by computing `nx2 = nx + dx, ny2 = ny + dy` and stepping there if passable. Cleanest: call `doStep` twice.

The simplest safe approach: wrap the inner position-update logic in a `doStep(fromX, fromY)` helper inside `move()`, call it once normally, then if biking call it again from the new position.

Actual implementation — extract the "compute + validate + move to (nx, ny)" block into a nested `doStep(fromX: number, fromY: number): boolean` that returns true if the player actually moved. Call it once, then if biking and it returned true, call it again.

```typescript
  const move = useCallback((dx: number, dy: number) => {
    const newDir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy < 0 ? 'up' : 'down'
    setDirection(newDir)
    setMoving(true)
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current)
    moveTimerRef.current = setTimeout(() => setMoving(false), 220)

    function doStep(fromX: number, fromY: number): boolean {
      // ... (all current inner logic using fromX/fromY instead of prevPx/prevPy)
      // returns true if player moved to (nx, ny)
    }

    const moved = doStep(pxRef.current, pyRef.current)
    if (moved && isBikingRef.current) doStep(pxRef.current, pyRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

This requires refactoring the entire `move()` body. See Task 5 code below for the full replacement.

---

### Task 6: Suppress wild encounters when biking (WorldMap.tsx:1420)

**Files:**
- Modify: `src/screens/WorldMap.tsx:1420`

- [ ] **Step 1: Add isBiking guard to the encounter check**

Change:
```typescript
    if (((hasLandWild && isLandTile) || (hasWaterWild && isWaterTile)) && Math.random() < ENCOUNTER_RATE) {
```
To:
```typescript
    if (!isBikingRef.current && ((hasLandWild && isLandTile) || (hasWaterWild && isWaterTile)) && Math.random() < ENCOUNTER_RATE) {
```

---

### Task 7: Suppress trainer battles when biking (WorldMap.tsx:1329, 1342)

**Files:**
- Modify: `src/screens/WorldMap.tsx:1329` and `src/screens/WorldMap.tsx:1342`

- [ ] **Step 1: Add isBiking guard to static trainer trigger (line 1329)**

Change:
```typescript
    for (const trainer of map.trainers) {
      const triggered = nx === trainer.x && ny === trainer.y
      if (triggered) {
```
To:
```typescript
    for (const trainer of map.trainers) {
      const triggered = nx === trainer.x && ny === trainer.y
      if (triggered && !isBikingRef.current) {
```

- [ ] **Step 2: Add isBiking guard to wandering trainer trigger (line 1342)**

Change:
```typescript
      if (blocker.isTrainer && blocker.party?.length) {
```
To:
```typescript
      if (blocker.isTrainer && blocker.party?.length && !isBikingRef.current) {
```

---

### Task 8: Add bike toggle button to UI (WorldMap.tsx:1692)

**Files:**
- Modify: `src/screens/WorldMap.tsx:1692`

- [ ] **Step 1: Add 🚲 button next to DPad**

Replace the DPad container div with:

```tsx
          {/* DPad + Bike toggle */}
          <div style={{
            position: 'absolute',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}>
            <button
              onPointerDown={e => {
                e.preventDefault()
                setIsBiking(prev => {
                  isBikingRef.current = !prev
                  return !prev
                })
              }}
              style={{
                background: isBiking ? '#4ecdc4' : '#16213e',
                border: `2px solid ${isBiking ? '#4ecdc4' : 'rgba(78,205,196,0.4)'}`,
                borderRadius: 12,
                padding: '6px 18px',
                color: isBiking ? '#16213e' : 'white',
                fontSize: 20,
                fontWeight: 'bold',
                cursor: 'pointer',
                touchAction: 'none',
              }}
            >
              🚲
            </button>
            <DPad onMove={(dx, dy) => {
              if (shopOpen) { setShopOpen(false); shopDismissedRef.current = true; return }
              if (dialogue) { setDialogue(null); return }
              move(dx, dy)
            }} />
          </div>
```

---

### Task 9: Full move() refactor for 2-tile biking

The cleanest way to support 2-tile movement is to extract the inner step logic into a `doStep` helper. Here is the full replacement for the `move` useCallback (lines 1274–1424):

```typescript
  const move = useCallback((dx: number, dy: number) => {
    const newDir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy < 0 ? 'up' : 'down'
    setDirection(newDir)
    setMoving(true)
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current)
    moveTimerRef.current = setTimeout(() => setMoving(false), 220)

    function doStep(fromX: number, fromY: number): boolean {
      const map = mapRef.current
      const nx = fromX + dx
      const ny = fromY + dy

      const isBorderTile = (x: number, y: number) =>
        x === 0 || x === map.width - 1 || y === 0 || y === map.height - 1

      function doExit(exit: typeof map.exits[number]) {
        mapRef.current = getMap(exit.targetMap)
        setCurrentMapId(exit.targetMap)
        setDialogue(null)
        pxRef.current = exit.targetX
        pyRef.current = exit.targetY
        setPx(exit.targetX)
        setPy(exit.targetY)
        const cp = useProfileStore.getState().profile
        if (cp?.id) {
          const posUpdate = { currentRoute: exit.targetMap, playerX: exit.targetX, playerY: exit.targetY }
          useProfileStore.getState().setProfile({ ...cp, ...posUpdate })
          updateProfileRef.current(cp.id, posUpdate).catch(() => {})
        }
      }

      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) {
        const exit = map.exits.find(e => e.x === fromX && e.y === fromY)
        if (exit) doExit(exit)
        return false
      }

      const tile = map.tiles[ny][nx]

      const interiorExit = map.exits.find(e => e.x === nx && e.y === ny && !isBorderTile(e.x, e.y))
      if (interiorExit) { doExit(interiorExit); return false }

      if (BLOCKED_TILES.has(tile)) return false

      const door = map.doors.find(d => d.x === nx && d.y === ny)
      if (door?.type === 'pokemart') {
        if (shopDismissedRef.current) return false
        setShopOpen(true)
        return false
      }

      if (!isBikingRef.current) {
        for (const trainer of map.trainers) {
          if (nx === trainer.x && ny === trainer.y) {
            setDialogue(`${trainer.name} wants to battle!`)
            setTimeout(() => startTrainerBattleRef.current(trainer), 1500)
            return false
          }
        }
      }

      const blocker = wanderingNpcsRef.current.find(w => w.x === nx && w.y === ny)
      if (blocker) {
        if (blocker.isTrainer && blocker.party?.length && !isBikingRef.current) {
          setDialogue(`${blocker.name} wants to battle!`)
          const t: TrainerNpc = { x: blocker.x, y: blocker.y, direction: 'down', name: blocker.name, party: blocker.party }
          setTimeout(() => startTrainerBattleRef.current(t), 1500)
        } else if (blocker.pokemonId) {
          const opponentInfo = pokemonMap[blocker.pokemonId]
          if (!opponentInfo) return false
          const currentProfile = useProfileStore.getState().profile
          if (!currentProfile?.party?.length) return false
          const level = blocker.level ?? 5
          const opponent = buildPartyPokemon(opponentInfo, level)
          const playerInfo = pokemonMap[currentProfile.party[0].pokemonId]
          if (!playerInfo) return false
          const player = buildPartyPokemon(playerInfo, currentProfile.party[0].level)
          player.currentHp = currentProfile.party[0].currentHp ?? player.maxHp
          player.xp = currentProfile.party[0].xp ?? player.xp
          const _validMoves = filterValidMoves(currentProfile.party[0].moves ?? [])
          const _usedIds = new Set(_validMoves.map(m => m.moveId))
          const _fresh = player.moves.filter(m => !_usedIds.has(m.moveId))
          player.moves = [..._validMoves, ..._fresh].slice(0, 4)
          player.nickname = currentProfile.party[0].nickname
          const fullParty = currentProfile.party.slice(1).map(p => {
            const info = pokemonMap[p.pokemonId]; if (!info) return null
            const bp = buildPartyPokemon(info, p.level)
            bp.currentHp = p.currentHp ?? bp.maxHp; bp.xp = p.xp ?? bp.xp
            const bpValid = filterValidMoves(p.moves ?? [])
            const bpUsed = new Set(bpValid.map(m => m.moveId))
            bp.moves = [...bpValid, ...bp.moves.filter(m => !bpUsed.has(m.moveId))].slice(0, 4)
            bp.nickname = p.nickname; return bp
          }).filter(Boolean) as typeof player[]
          useProfileStore.getState().setProfile({
            ...currentProfile,
            playerX: pxRef.current, playerY: pyRef.current,
            currentRoute: currentMapIdRef.current,
          })
          useBattleStore.getState().setPendingCatchNpcId(blocker.id)
          useBattleStore.getState().startWildBattle(player, opponent, fullParty)
          flashAndNavigate()
        }
        return false
      }

      shopDismissedRef.current = false
      pxRef.current = nx
      pyRef.current = ny
      setPx(nx)
      setPy(ny)

      const currentMapId_ = currentMapIdRef.current
      setMapItems(prev => {
        const idx = prev.findIndex(it => it.mapId === currentMapId_ && it.x === nx && it.y === ny)
        if (idx === -1) return prev
        const item = prev[idx]
        const itemName = item.itemId === 'pokeball' ? 'Pokéball' : 'Potion'
        setDialogue(`You found a ${itemName}!`)
        const currentProfile = useProfileStore.getState().profile
        if (currentProfile?.id) {
          const bag = currentProfile.bag ?? []
          const existingIdx = bag.findIndex(b => b.itemId === item.itemId)
          const newBag = existingIdx >= 0
            ? bag.map((b, i) => i === existingIdx ? { ...b, qty: b.qty + 1 } : b)
            : [...bag, { itemId: item.itemId, qty: 1 }]
          updateProfileRef.current(currentProfile.id, { bag: newBag })
          useProfileStore.getState().setProfile({ ...currentProfile, bag: newBag })
        }
        return prev.filter((_, i) => i !== idx)
      })

      const currentMap = mapRef.current
      const hasLandWild = currentMap.wildPokemon.length > 0
      const hasWaterWild = (currentMap.waterPokemon ?? []).length > 0
      const isLandTile = tile === 'grass' || tile === 'path' || tile === 'land' || tile === 'flower' || tile === 'flower2' || tile === 'flower3' || tile === 'brush2'
      const isWaterTile = tile === 'water'
      if (!isBikingRef.current && ((hasLandWild && isLandTile) || (hasWaterWild && isWaterTile)) && Math.random() < ENCOUNTER_RATE) {
        setTimeout(() => startWildBattleRef.current(nx, ny), 0)
        return false
      }

      return true
    }

    const moved = doStep(pxRef.current, pyRef.current)
    if (moved && isBikingRef.current) doStep(pxRef.current, pyRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
```

---

### Task 10: Build and test

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Test in browser**

Open http://localhost:5173/games/my-pokemon/
- Tap 🚲 button — button should highlight teal
- Move around — player should show bike sprite and move 2 tiles per press
- Confirm no wild battles trigger while biking
- Walk into a trainer tile — confirm no battle
- Tap 🚲 again — reverts to normal sprite and speed
- Confirm wild battles resume normally when not biking
