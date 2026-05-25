import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import { useBattleStore } from '../store/battleStore'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import { getMap } from '../maps/index'
import { MapData, TileType, TrainerNpc } from '../maps/types'
import { buildPartyPokemon } from '../utils/exp'
import pokemonJson from '../data/pokemon.json'
import itemsJson from '../data/items.json'
import DPad from '../components/DPad'
import ShopModal from '../components/ShopModal'
import { PokemonData, ItemData } from '../types/game'

const ITEMS = itemsJson as ItemData[]

const TILE = 32
const COLS = 11
const ROWS = 9
const ENCOUNTER_RATE = 0.1

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
  bldShop:  'tiles/tile_building_pokemonshop.png',
}
const TILE_IMGS: Record<string, HTMLImageElement> = {}
const TILE_CANVASES: Record<string, HTMLCanvasElement | undefined> = {}

const BLOCKED_TILES = new Set<TileType>(['tree', 'building', 'fence', 'brush', 'gym'])

function drawProp(
  ctx: CanvasRenderingContext2D,
  src: HTMLCanvasElement | HTMLImageElement,
  destX: number, destY: number, destH: number
) {
  const w = src instanceof HTMLCanvasElement
    ? destH * (src.width / src.height)
    : destH * ((src as HTMLImageElement).naturalWidth / (src as HTMLImageElement).naturalHeight)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src, destX, destY, w, destH)
}

const pokemonMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p])
) as Record<number, PokemonData>

// ── Directional sprites: stand and run poses, both genders ───────────────────
// Each PNG is one sprite (~15-18px native), scaled up to TILE×TILE*1.3 on canvas.
// Key format: "<gender>_<pose>_<dir>"  e.g. "male_run_left"
type DirKey = 'down' | 'up' | 'left' | 'right'
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
const SPRITE_IMGS: Record<string, HTMLImageElement> = {}
const SPRITE_CANVASES: Record<string, HTMLCanvasElement | undefined> = {}

// whiteOnly=true  → only flood-fill from corners that are near-white (building images)
// whiteOnly=false → flood-fill from all corners regardless of color (sprites / tile overlays)
function applyChromaKey(img: HTMLImageElement, whiteOnly = false): HTMLCanvasElement {
  const oc = document.createElement('canvas')
  oc.width = img.naturalWidth; oc.height = img.naturalHeight
  const octx = oc.getContext('2d')!
  octx.drawImage(img, 0, 0)
  const id = octx.getImageData(0, 0, oc.width, oc.height)
  const d = id.data
  const W = oc.width, H = oc.height
  if (d[3] === 0) return oc  // already transparent

  const THRESHOLD = whiteOnly ? 20 : 35
  const visited = new Uint8Array(W * H)
  const stack: number[] = []

  const cornerIdxs = [0, W - 1, (H - 1) * W, (H - 1) * W + W - 1]
  for (const ci of cornerIdxs) {
    if (visited[ci] || d[ci * 4 + 3] === 0) continue
    const bgR = d[ci * 4], bgG = d[ci * 4 + 1], bgB = d[ci * 4 + 2]
    // In white-only mode skip corners that are not near-white
    if (whiteOnly && (bgR < 200 || bgG < 200 || bgB < 200)) continue
    visited[ci] = 1
    stack.push(ci)
    while (stack.length > 0) {
      const idx = stack.pop()!
      d[idx * 4 + 3] = 0
      const x = idx % W, y = (idx / W) | 0
      const neighbors = [
        x > 0     ? idx - 1 : -1,
        x < W - 1 ? idx + 1 : -1,
        y > 0     ? idx - W : -1,
        y < H - 1 ? idx + W : -1,
      ]
      for (const ni of neighbors) {
        if (ni < 0 || visited[ni]) continue
        if (d[ni * 4 + 3] === 0) { visited[ni] = 1; continue }
        if (
          Math.abs(d[ni*4]   - bgR) < THRESHOLD &&
          Math.abs(d[ni*4+1] - bgG) < THRESHOLD &&
          Math.abs(d[ni*4+2] - bgB) < THRESHOLD
        ) {
          visited[ni] = 1
          stack.push(ni)
        }
      }
    }
  }

  octx.putImageData(id, 0, 0)
  return oc
}

Object.entries(SPRITE_FILES).forEach(([key, file]) => {
  const img = new Image()
  img.src = `${import.meta.env.BASE_URL}${file}`
  SPRITE_IMGS[key] = img
})

Object.entries(TILE_FILES).forEach(([key, file]) => {
  const img = new Image()
  img.src = `${import.meta.env.BASE_URL}${file}`
  TILE_IMGS[key] = img
})


// ── Pokémon Center interior canvas drawing ────────────────────────────────
function drawPokeCenter(ctx: CanvasRenderingContext2D, cW: number, cH: number) {
  // Floor — warm cream with wood planks
  ctx.fillStyle = '#e8d870'
  ctx.fillRect(0, 0, cW, cH)
  ctx.strokeStyle = '#c8b850'
  ctx.lineWidth = 1
  for (let y = 0; y < cH; y += 16) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cW, y); ctx.stroke()
  }

  // Back wall (top 2 tile rows)
  const wallH = TILE * 2
  ctx.fillStyle = '#f0e8e0'
  ctx.fillRect(0, 0, cW, wallH)

  // Wall tile grid
  ctx.strokeStyle = '#d8d0c0'
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, wallH); ctx.stroke()
  }

  // Pokéball emblem on back wall
  const ex = cW / 2, ey = TILE * 1.1, er = TILE * 0.85
  ctx.fillStyle = '#c82820'
  ctx.beginPath(); ctx.arc(ex, ey, er, Math.PI, 0); ctx.fill()
  ctx.fillStyle = '#f0f0f0'
  ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI); ctx.fill()
  ctx.strokeStyle = '#282818'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(ex - er, ey); ctx.lineTo(ex + er, ey); ctx.stroke()
  ctx.fillStyle = '#f8f8f8'
  ctx.beginPath(); ctx.arc(ex, ey, er * 0.26, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#282818'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(ex, ey, er * 0.26, 0, Math.PI * 2); ctx.stroke()

  // "P.C" label left of emblem
  ctx.fillStyle = '#c82820'
  ctx.font = "bold 13px 'Courier New', monospace"
  ctx.textAlign = 'left'
  ctx.fillText('P.C', TILE * 0.5, TILE * 0.8)

  // Counter (row 2)
  const ctrY = wallH, ctrH = TILE
  ctx.fillStyle = '#a07840'
  ctx.fillRect(TILE * 2.5, ctrY, cW - TILE * 5, ctrH)
  ctx.fillStyle = '#e8d8a0'
  ctx.fillRect(TILE * 2.5, ctrY, cW - TILE * 5, 5)

  // Healing machine (right of counter)
  const hmX = cW - TILE * 3.2, hmY = ctrY - TILE * 0.3
  ctx.fillStyle = '#c8d8f0'
  ctx.fillRect(hmX, hmY, TILE * 1.8, TILE * 1.6)
  ctx.fillStyle = '#a0b8e0'
  ctx.fillRect(hmX + 4, hmY + 4, TILE * 1.8 - 8, 18)
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i === 0 ? '#ff2010' : '#404030'
    ctx.beginPath(); ctx.arc(hmX + 8 + i * 8, hmY + 13, 3.5, 0, Math.PI * 2); ctx.fill()
  }

  // Nurse Joy
  const njX = Math.floor(cW / 2), njY = ctrY + 2
  // body
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(njX - 8, njY - 10, 16, 14)
  // head
  ctx.fillStyle = '#f0c0a0'; ctx.fillRect(njX - 7, njY - 22, 14, 12)
  // hair
  ctx.fillStyle = '#e89898'; ctx.fillRect(njX - 8, njY - 24, 16, 6)
  // cap
  ctx.fillStyle = '#f8f8f8'; ctx.fillRect(njX - 6, njY - 30, 12, 6)
  ctx.fillStyle = '#c82010'; ctx.fillRect(njX - 4, njY - 32, 8, 4)
  // eyes
  ctx.fillStyle = '#282818'
  ctx.fillRect(njX - 4, njY - 15, 2, 2)
  ctx.fillRect(njX + 2, njY - 15, 2, 2)

  // Side benches
  ctx.fillStyle = '#a06830'
  ctx.fillRect(0, TILE * 4, TILE, TILE * 2)
  ctx.fillRect(cW - TILE, TILE * 4, TILE, TILE * 2)
  ctx.fillStyle = '#c88840'
  ctx.fillRect(0, TILE * 4, TILE, 5)
  ctx.fillRect(cW - TILE, TILE * 4, TILE, 5)

  // Entry mat at bottom
  ctx.fillStyle = '#5888a0'
  ctx.fillRect(cW / 2 - TILE, cH - TILE, TILE * 2, TILE)
  ctx.strokeStyle = '#3868808'
  ctx.lineWidth = 2
  ctx.strokeRect(cW / 2 - TILE, cH - TILE, TILE * 2, TILE)

  // Pokéball on mat
  ctx.fillStyle = '#c82820'
  ctx.beginPath(); ctx.arc(cW / 2, cH - TILE / 2, 10, Math.PI, 0); ctx.fill()
  ctx.fillStyle = '#f0f0f0'
  ctx.beginPath(); ctx.arc(cW / 2, cH - TILE / 2, 10, 0, Math.PI); ctx.fill()
  ctx.strokeStyle = '#282818'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(cW / 2, cH - TILE / 2, 10, 0, Math.PI * 2); ctx.stroke()
}


export default function WorldMap() {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.profile)
  const { updateProfile } = useFirestoreProfile()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentMapId, setCurrentMapId] = useState(() => profile?.currentRoute ?? 'pallet')
  const [px, setPx] = useState(() => profile?.playerX ?? 7)
  const [py, setPy] = useState(() => profile?.playerY ?? 9)
  const [direction, setDirection] = useState<'down'|'up'|'left'|'right'>('down')
  const [moving, setMoving] = useState(false)
  const moveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dialogue, setDialogue] = useState<string | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const shopDismissedRef = useRef(false)
  const [battleFlash, setBattleFlash] = useState(false)
  const updateProfileRef = useRef(updateProfile)
  useEffect(() => { updateProfileRef.current = updateProfile }, [updateProfile])
  const mapRef = useRef<MapData>(getMap('pallet'))
  const prevMapIdRef = useRef<string>('pallet')
  const pxRef = useRef(profile?.playerX ?? 7)
  const pyRef = useRef(profile?.playerY ?? 9)
  const currentMapIdRef = useRef(profile?.currentRoute ?? 'pallet')
  const startWildBattleRef = useRef<(x: number, y: number) => void>(() => {})
  const startTrainerBattleRef = useRef<(t: TrainerNpc) => void>(() => {})

  useEffect(() => { if (!profile) navigate('/') }, [profile, navigate])

  // Auto-heal when entering pokecenter
  useEffect(() => {
    if (currentMapId === 'pokecenter' && prevMapIdRef.current !== 'pokecenter') {
      healParty()
    }
    prevMapIdRef.current = currentMapId
    currentMapIdRef.current = currentMapId
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMapId])

  const drawMap = useCallback((playerX: number, playerY: number, dir: string, isMoving = false) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const map = mapRef.current
    const hw = Math.floor(COLS / 2)
    const hh = Math.floor(ROWS / 2)
    const cW = COLS * TILE
    const cH = ROWS * TILE

    ctx.clearRect(0, 0, cW, cH)
    ctx.imageSmoothingEnabled = false

    // ── Interior maps: canvas-drawn background ────────────────────────────
    if (map.isInterior) {
      if (map.id === 'pokecenter') {
        drawPokeCenter(ctx, cW, cH)
      } else {
        ctx.fillStyle = '#c8a870'
        ctx.fillRect(0, 0, cW, cH)
      }
    } else {
      // ── Pass 1: Base tiles ────────────────────────────────────────────────
      const grassImg = TILE_IMGS.grass
      const grassReady = grassImg?.complete && grassImg.naturalWidth > 0

      for (let vy = 0; vy < ROWS; vy++) {
        for (let vx = 0; vx < COLS; vx++) {
          const mx = playerX - hw + vx
          const my = playerY - hh + vy
          const tile: TileType = (my >= 0 && my < map.height && mx >= 0 && mx < map.width)
            ? map.tiles[my][mx] : 'tree'
          const x = vx * TILE, y = vy * TILE

          if (tile === 'land' || tile === 'path') {
            const img = TILE_IMGS.land
            if (img?.complete && img.naturalWidth > 0) ctx.drawImage(img, x, y, TILE, TILE)
            else { ctx.fillStyle = '#c8a870'; ctx.fillRect(x, y, TILE, TILE) }
          } else if (tile === 'flower') {
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
            const fi = TILE_IMGS.flower
            if (fi?.complete && fi.naturalWidth > 0) {
              if (!TILE_CANVASES['flower']) TILE_CANVASES['flower'] = applyChromaKey(fi)
              ctx.drawImage(TILE_CANVASES['flower']!, x, y, TILE, TILE)
            }
          } else if (tile === 'flower2') {
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
            const fi = TILE_IMGS.flower2
            if (fi?.complete && fi.naturalWidth > 0) {
              if (!TILE_CANVASES['flower2']) TILE_CANVASES['flower2'] = applyChromaKey(fi)
              ctx.drawImage(TILE_CANVASES['flower2']!, x, y, TILE, TILE)
            }
          } else if (tile === 'water') {
            ctx.fillStyle = '#48a8e0'; ctx.fillRect(x, y, TILE, TILE)
            ctx.fillStyle = 'rgba(255,255,255,0.45)'
            ctx.beginPath(); ctx.ellipse(x+TILE*0.28, y+TILE*0.38, TILE*0.18, TILE*0.09, 0, 0, Math.PI*2); ctx.fill()
            ctx.beginPath(); ctx.ellipse(x+TILE*0.70, y+TILE*0.65, TILE*0.16, TILE*0.08, 0, 0, Math.PI*2); ctx.fill()
          } else {
            // grass, tree, building, door, fence, brush, gym — all use grass base
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
          }
        }
      }

      // ── Pass 1b: Tree images (proportional, chroma-keyed, drawn over grass base) ─
      const treeImg = TILE_IMGS.tree
      if (treeImg?.complete && treeImg.naturalWidth > 0) {
        if (!TILE_CANVASES['tree']) {
          if (treeImg.complete) TILE_CANVASES['tree'] = applyChromaKey(treeImg)
          else treeImg.onload = () => drawMap(playerX, playerY, dir, isMoving)
        }
        const treeSrc = TILE_CANVASES['tree'] ?? treeImg
        const th = TILE * (treeImg.naturalHeight / treeImg.naturalWidth)
        for (let vy = 0; vy < ROWS; vy++) {
          for (let vx = 0; vx < COLS; vx++) {
            const mx = playerX - hw + vx
            const my = playerY - hh + vy
            const tile: TileType = (my >= 0 && my < map.height && mx >= 0 && mx < map.width)
              ? map.tiles[my][mx] : 'tree'
            if (tile !== 'tree') continue
            ctx.imageSmoothingEnabled = false
            ctx.drawImage(treeSrc, vx * TILE, vy * TILE + (TILE - th) / 2, TILE, th)
          }
        }
      }

      // ── Pass 2: Building overlays (proportional, chroma-keyed) ───────────
      const IMG_KEY: Record<string, string> = {
        'tile_building_big.png':   'bldBig',
        'tile_building1.png':      'bldSmall',
        'tile_pokemon_center.png': 'bldPC',
        'tile_building_pokemonshop.png': 'bldShop',
      }
      for (const ov of (map.buildingOverlays ?? [])) {
        const key = IMG_KEY[ov.image]
        if (!key) continue
        const rawImg = TILE_IMGS[key]
        if (!rawImg?.complete || !rawImg.naturalWidth) {
          if (rawImg) rawImg.onload = () => drawMap(playerX, playerY, dir, isMoving)
          continue
        }
        if (!TILE_CANVASES[key]) TILE_CANVASES[key] = applyChromaKey(rawImg, true)
        const src = TILE_CANVASES[key]!
        const vx = ov.x - (playerX - hw)
        const vy = ov.y - (playerY - hh)
        drawProp(ctx, src, vx * TILE, vy * TILE, ov.heightTiles * TILE)
      }

      // ── Pass 3: NPC trainers ──────────────────────────────────────────────
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

    // ── Player sprite ─────────────────────────────────────────────────────
    const gender = profile?.gender === 'female' ? 'female' : 'male'
    const pose = isMoving ? 'run' : 'stand'
    const dirKey = (['down','up','left','right'].includes(dir) ? dir : 'down') as DirKey
    const spriteKey = `${gender}_${pose}_${dirKey}`
    const rawImg = SPRITE_IMGS[spriteKey]

    if (rawImg.complete && rawImg.naturalWidth > 0 && !SPRITE_CANVASES[spriteKey]) {
      SPRITE_CANVASES[spriteKey] = applyChromaKey(rawImg)
    }

    // For interior maps, player position is direct; for exterior, player is centered
    const dw = TILE, dh = Math.round(TILE * 1.3)
    let dx: number, dy: number
    if (map.isInterior) {
      dx = playerX * TILE + TILE / 2 - dw / 2
      dy = playerY * TILE + TILE / 2 - dh / 2
    } else {
      dx = hw * TILE + TILE / 2 - dw / 2
      dy = hh * TILE + TILE / 2 - dh / 2
    }

    const charCanvas = SPRITE_CANVASES[spriteKey]
    if (charCanvas) {
      ctx.save()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(charCanvas, 0, 0, charCanvas.width, charCanvas.height, dx, dy, dw, dh)
      ctx.restore()
    } else {
      ctx.font = `${TILE * 0.7}px serif`
      ctx.textAlign = 'center'
      ctx.fillText(gender === 'female' ? '👧' : '🧒', hw * TILE + TILE / 2, hh * TILE + TILE * 0.8)
      rawImg.onload = () => drawMap(playerX, playerY, dir, isMoving)
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.gender])

  useEffect(() => {
    mapRef.current = getMap(currentMapId)
    drawMap(px, py, direction, moving)
  }, [currentMapId, px, py, direction, moving, drawMap])

  const move = useCallback((dx: number, dy: number) => {
    const newDir = dx > 0 ? 'right' : dx < 0 ? 'left' : dy < 0 ? 'up' : 'down'
    setDirection(newDir)
    setMoving(true)
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current)
    moveTimerRef.current = setTimeout(() => setMoving(false), 220)

    const map = mapRef.current
    const prevPx = pxRef.current
    const prevPy = pyRef.current
    const nx = prevPx + dx
    const ny = prevPy + dy

    if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) return
    const tile = map.tiles[ny][nx]

    const exit = map.exits.find(e => e.x === nx && e.y === ny)
    if (exit) {
      mapRef.current = getMap(exit.targetMap)
      setCurrentMapId(exit.targetMap)
      setDialogue(null)
      pxRef.current = exit.targetX
      pyRef.current = exit.targetY
      setPx(exit.targetX)
      setPy(exit.targetY)
      // Persist player position so it survives logout/login
      const cp = useProfileStore.getState().profile
      if (cp?.id) {
        const posUpdate = { currentRoute: exit.targetMap, playerX: exit.targetX, playerY: exit.targetY }
        useProfileStore.getState().setProfile({ ...cp, ...posUpdate })
        updateProfileRef.current(cp.id, posUpdate).catch(() => {})
      }
      return
    }

    if (BLOCKED_TILES.has(tile)) return

    const door = map.doors.find(d => d.x === nx && d.y === ny)
    if (door?.type === 'pokemart') {
      if (shopDismissedRef.current) return  // player dismissed — don't reopen until they move away
      setShopOpen(true)
      return
    }

    for (const trainer of map.trainers) {
      if (
        trainer.direction === 'down' &&
        trainer.x === nx &&
        ny > trainer.y &&
        ny <= trainer.y + 3
      ) {
        setDialogue(`${trainer.name} wants to battle!`)
        setTimeout(() => startTrainerBattleRef.current(trainer), 1500)
        return
      }
    }

    shopDismissedRef.current = false  // player moved away — allow shop to reopen next approach
    pxRef.current = nx
    pyRef.current = ny
    setPx(nx)
    setPy(ny)

    if ((tile === 'grass' || tile === 'water') && Math.random() < ENCOUNTER_RATE) {
      setTimeout(() => startWildBattleRef.current(nx, ny), 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (shopOpen) { setShopOpen(false); shopDismissedRef.current = true }
        return
      }
      const DIRS: Record<string, [number, number]> = {
        ArrowUp:[0,-1], ArrowDown:[0,1], ArrowLeft:[-1,0], ArrowRight:[1,0],
        w:[0,-1], s:[0,1], a:[-1,0], d:[1,0],
      }
      if (e.key in DIRS) {
        e.preventDefault()
        if (dialogue) { setDialogue(null); return }
        const [dx, dy] = DIRS[e.key]
        move(dx, dy)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialogue, move, shopOpen])

  function flashAndNavigate(delayMs = 0) {
    setTimeout(() => {
      let count = 0
      const tick = () => {
        count++
        setBattleFlash(f => !f)
        if (count < 6) setTimeout(tick, 80)
        else { setBattleFlash(false); navigate('/battle') }
      }
      tick()
    }, delayMs)
  }

  function startWildBattle(playerX: number, playerY: number) {
    const map = mapRef.current
    const tile = map.tiles[playerY]?.[playerX]
    if (tile !== 'grass' && tile !== 'water') return
    const pool = tile === 'water' ? (map.waterPokemon ?? []) : map.wildPokemon
    const currentProfile = useProfileStore.getState().profile
    if (!currentProfile?.party?.length || !pool.length) return
    const total = pool.reduce((s, w) => s + w.rate, 0)
    let roll = Math.random() * total
    let wild = pool[0]
    for (const w of pool) { roll -= w.rate; if (roll <= 0) { wild = w; break } }
    const level = wild.minLevel + Math.floor(Math.random() * (wild.maxLevel - wild.minLevel + 1))
    const opponentInfo = pokemonMap[wild.pokemonId]
    if (!opponentInfo) return
    const opponent = buildPartyPokemon(opponentInfo, level)
    const playerInfo = pokemonMap[currentProfile.party[0].pokemonId]
    if (!playerInfo) return
    const player = buildPartyPokemon(playerInfo, currentProfile.party[0].level)
    player.currentHp = currentProfile.party[0].currentHp ?? player.maxHp
    player.xp = currentProfile.party[0].xp ?? player.xp
    player.moves = currentProfile.party[0].moves?.length > 0 ? [...currentProfile.party[0].moves] : player.moves
    player.nickname = currentProfile.party[0].nickname
    const fullParty = currentProfile.party.slice(1).map(p => {
      const info = pokemonMap[p.pokemonId]
      if (!info) return null
      const bp = buildPartyPokemon(info, p.level)
      bp.currentHp = p.currentHp ?? bp.maxHp
      bp.xp = p.xp ?? bp.xp
      bp.moves = p.moves?.length > 0 ? [...p.moves] : bp.moves
      bp.nickname = p.nickname
      return bp
    }).filter(Boolean) as typeof player[]
    useProfileStore.getState().setProfile({
      ...currentProfile,
      playerX,
      playerY,
      currentRoute: currentMapIdRef.current,
    })
    useBattleStore.getState().startWildBattle(player, opponent, fullParty)
    flashAndNavigate()
  }
  startWildBattleRef.current = startWildBattle

  function startTrainerBattle(trainer: TrainerNpc) {
    const currentProfile = useProfileStore.getState().profile
    if (!currentProfile?.party?.length) return
    const firstEnemy = trainer.party[0]
    const opponentInfo = pokemonMap[firstEnemy.pokemonId]
    if (!opponentInfo) return
    const opponent = buildPartyPokemon(opponentInfo, firstEnemy.level)
    const playerInfo = pokemonMap[currentProfile.party[0].pokemonId]
    if (!playerInfo) return
    const player = buildPartyPokemon(playerInfo, currentProfile.party[0].level)
    player.currentHp = currentProfile.party[0].currentHp ?? player.maxHp
    player.xp = currentProfile.party[0].xp ?? player.xp
    player.moves = currentProfile.party[0].moves?.length > 0 ? [...currentProfile.party[0].moves] : player.moves
    player.nickname = currentProfile.party[0].nickname
    const fullParty = currentProfile.party.slice(1).map(p => {
      const info = pokemonMap[p.pokemonId]
      if (!info) return null
      const bp = buildPartyPokemon(info, p.level)
      bp.currentHp = p.currentHp ?? bp.maxHp
      bp.xp = p.xp ?? bp.xp
      bp.moves = p.moves?.length > 0 ? [...p.moves] : bp.moves
      bp.nickname = p.nickname
      return bp
    }).filter(Boolean) as typeof player[]
    useProfileStore.getState().setProfile({
      ...currentProfile,
      playerX: pxRef.current,
      playerY: pyRef.current,
      currentRoute: currentMapIdRef.current,
    })
    useBattleStore.getState().startTrainerBattle(player, opponent, trainer.name, fullParty)
    flashAndNavigate(400)
  }
  startTrainerBattleRef.current = startTrainerBattle

  async function healParty() {
    if (!profile?.id || !profile.party?.length) return
    const healedParty = profile.party.map(p => ({ ...p, currentHp: p.maxHp }))
    try {
      await updateProfile(profile.id, { party: healedParty })
      useProfileStore.getState().setProfile({ ...profile, party: healedParty })
      setDialogue("Nurse Joy: Your Pokémon have been healed! ♥")
    } catch {
      setDialogue('Healing failed — please try again.')
    }
  }

  async function handleBuy(itemId: string) {
    if (!profile?.id) return
    const item = ITEMS.find(i => i.id === itemId)
    if (!item || profile.money < item.price) return
    const newMoney = profile.money - item.price
    const existingIdx = (profile.bag ?? []).findIndex(b => b.itemId === itemId)
    const newBag = existingIdx >= 0
      ? (profile.bag ?? []).map((b, i) => i === existingIdx ? { ...b, qty: b.qty + 1 } : b)
      : [...(profile.bag ?? []), { itemId, qty: 1 }]
    const updates = { money: newMoney, bag: newBag }
    try {
      await updateProfile(profile.id, updates)
      useProfileStore.getState().setProfile({ ...profile, ...updates })
    } catch { /* silent */ }
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center gap-2 p-2">
      <div className="flex justify-end items-center w-full max-w-sm">
        <div className="flex gap-2">
          <button onClick={() => navigate('/team')}
            className="bg-[#16213e] border border-[#4ecdc4]/40 text-[#4ecdc4] text-xs px-3 py-1 rounded-lg">
            Team
          </button>
          <button onClick={() => navigate('/pokedex')}
            className="bg-[#16213e] border border-[#4ecdc4]/40 text-[#4ecdc4] text-xs px-3 py-1 rounded-lg">
            Pokédex
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={COLS * TILE}
        height={ROWS * TILE}
        className="border-2 border-yellow-400/30 rounded-xl"
        style={{ imageRendering: 'pixelated', width: '100%', maxWidth: `${COLS * TILE * 1.5}px` }}
      />

      {dialogue && (
        <div
          onClick={() => setDialogue(null)}
          className="bg-[#16213e] border-2 border-yellow-400 rounded-xl p-3 w-full max-w-sm text-white text-sm cursor-pointer"
        >
          {dialogue}
        </div>
      )}

      <DPad onMove={(dx, dy) => { if (dialogue) setDialogue(null); else move(dx, dy) }} />

      {shopOpen && profile && (
        <ShopModal
          profile={profile}
          onBuy={handleBuy}
          onClose={() => { setShopOpen(false); shopDismissedRef.current = true }}
        />
      )}

      {battleFlash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
          background: 'white', opacity: 0.85,
        }} />
      )}
    </div>
  )
}
