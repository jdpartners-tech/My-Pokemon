import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import { useBattleStore } from '../store/battleStore'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import { getMap, MAPS } from '../maps/index'
import { MapData, TileType, TrainerNpc } from '../maps/types'
import { buildPartyPokemon, filterValidMoves } from '../utils/exp'
import pokemonJson from '../data/pokemon.json'
import itemsJson from '../data/items.json'
import DPad from '../components/DPad'
import ShopModal from '../components/ShopModal'
import MiniMap from '../components/MiniMap'
import BagMenu from '../components/BagMenu'
import { PokemonData, ItemData } from '../types/game'

const ITEMS = itemsJson as ItemData[]


const TILE = 32
const COLS = 11
const ROWS = 9
const ENCOUNTER_RATE = 0.02

// ── Tile image preloading ─────────────────────────────────────────────────
const TILE_FILES: Record<string, string> = {
  grass:    'tiles/Background.png',
  land:     'tiles/tile_land1.png',
  tree:     'tiles/tile_tree.png?v=2',
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
function drawPokeCenter(ctx: CanvasRenderingContext2D, cW: number, cH: number, injuredCount = 0) {
  // ── Floor ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#e8d870'
  ctx.fillRect(0, 0, cW, cH)
  ctx.strokeStyle = '#c8b050'; ctx.lineWidth = 1
  for (let y = 0; y < cH; y += 16) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cW, y); ctx.stroke()
  }

  // ── Back wall ─────────────────────────────────────────────────────────────
  const wallH = TILE * 2
  ctx.fillStyle = '#eee8ff'
  ctx.fillRect(0, 0, cW, wallH)
  ctx.strokeStyle = '#d0c8e8'
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, wallH); ctx.stroke()
  }

  // ── Pokéball emblem ───────────────────────────────────────────────────────
  const ex = cW / 2, ey = TILE * 1.1, er = TILE * 0.82
  ctx.fillStyle = '#e03020'; ctx.beginPath(); ctx.arc(ex, ey, er, Math.PI, 0); ctx.fill()
  ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI); ctx.fill()
  ctx.strokeStyle = '#201808'; ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(ex - er, ey); ctx.lineTo(ex + er, ey); ctx.stroke()
  ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(ex, ey, er * 0.26, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#201808'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.arc(ex, ey, er * 0.26, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#c82820'
  ctx.font = "bold 12px 'Courier New', monospace"
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'
  ctx.fillText('P·C', TILE * 0.4, TILE * 0.85)

  // ── Counter ───────────────────────────────────────────────────────────────
  const ctrY = wallH
  ctx.fillStyle = '#8a5c28'; ctx.fillRect(TILE * 2.5, ctrY, cW - TILE * 5, TILE)
  ctx.fillStyle = '#c89050'; ctx.fillRect(TILE * 2.5, ctrY, cW - TILE * 5, 6)
  ctx.fillStyle = '#7a4c18'; ctx.fillRect(TILE * 2.5, ctrY + TILE - 3, cW - TILE * 5, 3)

  // ── Healing machine ───────────────────────────────────────────────────────
  const hmX = cW - TILE * 3.1, hmY = ctrY - TILE * 0.25
  const hmW = TILE * 1.9, hmH = TILE * 1.6
  ctx.fillStyle = '#b8d0f0'; ctx.fillRect(hmX, hmY, hmW, hmH)
  ctx.fillStyle = '#88a8d8'; ctx.fillRect(hmX + 2, hmY + 2, hmW - 4, hmH - 4)
  ctx.fillStyle = '#203858'; ctx.fillRect(hmX + 4, hmY + 5, hmW - 8, 20)
  ctx.fillStyle = '#60d8f0'
  ctx.font = "bold 7px 'Courier New'"
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('HEAL', hmX + hmW / 2, hmY + 15)
  // Lights: red = injured, green = healthy
  for (let i = 0; i < 6; i++) {
    const isInjured = i < injuredCount
    ctx.shadowColor = isInjured ? '#ff6040' : '#50e860'
    ctx.shadowBlur = isInjured ? 5 : 3
    ctx.fillStyle = isInjured ? '#ff3010' : (i < 6 ? '#20c030' : '#303020')
    ctx.beginPath(); ctx.arc(hmX + 8 + i * 9, hmY + hmH - 10, 3.5, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
  }
  ctx.fillStyle = '#304868'; ctx.fillRect(hmX + 3, hmY + hmH - 18, hmW - 6, 6)

  // ── Nurse Joy ─────────────────────────────────────────────────────────────
  const njX = Math.floor(cW / 2), njY = ctrY + 3

  // Shadow under feet
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.beginPath(); ctx.ellipse(njX, njY + 4, 9, 3, 0, 0, Math.PI * 2); ctx.fill()

  // Body — white uniform with pink trim
  ctx.fillStyle = '#f0f0f8'; ctx.fillRect(njX - 9, njY - 12, 18, 16)
  ctx.fillStyle = '#f0a0b8'
  ctx.fillRect(njX - 9, njY - 12, 18, 4)
  ctx.fillRect(njX - 9, njY - 12, 3, 16)
  ctx.fillRect(njX + 6, njY - 12, 3, 16)
  // Red cross on uniform
  ctx.fillStyle = '#e02020'
  ctx.fillRect(njX - 1, njY - 10, 2, 6)
  ctx.fillRect(njX - 3, njY - 8, 6, 2)

  // Neck
  ctx.fillStyle = '#f5c8a8'; ctx.fillRect(njX - 3, njY - 15, 6, 4)

  // Head — oval face
  ctx.fillStyle = '#f5c8a8'
  ctx.beginPath(); ctx.ellipse(njX, njY - 22, 8, 10, 0, 0, Math.PI * 2); ctx.fill()

  // Pink hair buns (Nurse Joy signature)
  ctx.fillStyle = '#e888a8'
  ctx.beginPath(); ctx.arc(njX - 9, njY - 24, 5, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(njX + 9, njY - 24, 5, 0, Math.PI * 2); ctx.fill()
  ctx.fillRect(njX - 8, njY - 31, 16, 8)
  ctx.beginPath(); ctx.arc(njX, njY - 31, 8, Math.PI, 0); ctx.fill()

  // Cap — white with red cross
  ctx.fillStyle = '#f8f8f8'
  ctx.fillRect(njX - 7, njY - 35, 14, 7)
  ctx.beginPath(); ctx.arc(njX, njY - 35, 7, Math.PI, 0); ctx.fill()
  ctx.strokeStyle = '#d0c8c0'; ctx.lineWidth = 1
  ctx.strokeRect(njX - 7, njY - 35, 14, 7)
  ctx.fillStyle = '#e02020'
  ctx.fillRect(njX - 1, njY - 33, 2, 5); ctx.fillRect(njX - 3, njY - 31, 6, 2)

  // Eyes with highlight
  ctx.fillStyle = '#302820'
  ctx.beginPath(); ctx.arc(njX - 3, njY - 22, 1.8, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(njX + 3, njY - 22, 1.8, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath(); ctx.arc(njX - 2.2, njY - 22.5, 0.6, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(njX + 3.8, njY - 22.5, 0.6, 0, Math.PI * 2); ctx.fill()

  // Smile
  ctx.strokeStyle = '#c07060'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(njX, njY - 18, 3, 0.2, Math.PI - 0.2); ctx.stroke()

  // Rosy cheeks
  ctx.fillStyle = 'rgba(240,100,120,0.3)'
  ctx.beginPath(); ctx.ellipse(njX - 5, njY - 19, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.ellipse(njX + 5, njY - 19, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill()

  // Arms & hands
  ctx.fillStyle = '#f0f0f8'
  ctx.fillRect(njX - 14, njY - 11, 5, 12); ctx.fillRect(njX + 9, njY - 11, 5, 12)
  ctx.fillStyle = '#f5c8a8'
  ctx.beginPath(); ctx.arc(njX - 11, njY + 2, 3, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(njX + 12, njY + 2, 3, 0, Math.PI * 2); ctx.fill()

  // ── Side benches ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#905020'
  ctx.fillRect(0, TILE * 4, TILE, TILE * 2); ctx.fillRect(cW - TILE, TILE * 4, TILE, TILE * 2)
  ctx.fillStyle = '#c07838'
  ctx.fillRect(0, TILE * 4, TILE, 5); ctx.fillRect(cW - TILE, TILE * 4, TILE, 5)
  ctx.fillStyle = '#704010'
  ctx.fillRect(0, TILE * 6 - 3, TILE, 3); ctx.fillRect(cW - TILE, TILE * 6 - 3, TILE, 3)

  // ── Entry mat ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#4878a0'; ctx.fillRect(cW / 2 - TILE, cH - TILE, TILE * 2, TILE)
  ctx.fillStyle = '#a0c8e8'; ctx.fillRect(cW / 2 - TILE, cH - TILE, TILE * 2, 4)
  ctx.strokeStyle = '#286880'; ctx.lineWidth = 2
  ctx.strokeRect(cW / 2 - TILE, cH - TILE, TILE * 2, TILE)
  // Pokéball on mat
  const mx = cW / 2, my = cH - TILE / 2
  ctx.fillStyle = '#c82820'; ctx.beginPath(); ctx.arc(mx, my, 10, Math.PI, 0); ctx.fill()
  ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI); ctx.fill()
  ctx.strokeStyle = '#282818'; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(mx, my, 10, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(mx - 10, my); ctx.lineTo(mx + 10, my); ctx.stroke()
  ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(mx, my, 2.5, 0, Math.PI * 2); ctx.fill()
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
  const [areaBanner, setAreaBanner] = useState<string | null>(null)
  const areaBannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [worldBagOpen, setWorldBagOpen] = useState(false)

  // Canvas size — ResizeObserver fills the container while maintaining 11:9 ratio
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [canvasCssSize, setCanvasCssSize] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const container = canvasContainerRef.current
    if (!container) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      const ratio = COLS / ROWS
      let w = width, h = height
      if (w / h > ratio) { w = Math.floor(h * ratio) } else { h = Math.floor(w / ratio) }
      setCanvasCssSize({ w, h })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Feature D: items on map — generate once on mount (respawn on game restart only)
  type MapItem = { mapId: string; x: number; y: number; itemId: 'pokeball' | 'potion' }
  const [mapItems, setMapItems] = useState<MapItem[]>([])

  // NPC sprite sheet (npc-sheet.png is 164×925, ~16×16 sprites, 10 cols)
  const npcSheetRef = useRef<HTMLImageElement | null>(null)
  useEffect(() => {
    const img = new Image(); img.src = 'sprites/npc-sheet.png'
    img.onload = () => { npcSheetRef.current = img }
  }, [])
  const updateProfileRef = useRef(updateProfile)
  useEffect(() => { updateProfileRef.current = updateProfile }, [updateProfile])
  const mapRef = useRef<MapData>(getMap('pallet'))
  const prevMapIdRef = useRef<string>('pallet')
  const pxRef = useRef(profile?.playerX ?? 7)
  const pyRef = useRef(profile?.playerY ?? 9)
  const currentMapIdRef = useRef(profile?.currentRoute ?? 'pallet')
  const startWildBattleRef = useRef<(x: number, y: number) => void>(() => {})
  const startTrainerBattleRef = useRef<(t: TrainerNpc) => void>(() => {})
  const partyRef = useRef(profile?.party ?? [])
  useEffect(() => { partyRef.current = profile?.party ?? [] }, [profile?.party])

  useEffect(() => { if (!profile) navigate('/') }, [profile, navigate])

  // Generate map items once on mount — Pokéballs (60%) and Potions (40%)
  useEffect(() => {
    const items: MapItem[] = []
    const ITEM_MAPS: Record<string, number> = {
      sunlitMeadow: 3, viridianForest: 3, flowerMeadow: 3,
      mistyLake: 2, rockyCave: 2, trainerRoad: 2,
      pallet: 1, cinnabarTown: 1, volcanoTrail: 3,
    }
    for (const [mapId, count] of Object.entries(ITEM_MAPS)) {
      const map = MAPS[mapId]
      if (!map) continue
      const WALKABLE = new Set(['grass', 'land', 'path', 'flower', 'flower2'])
      const exitSet = new Set(map.exits.map(e => `${e.x},${e.y}`))
      const trainerSet = new Set(map.trainers.map(t => `${t.x},${t.y}`))
      const validTiles: Array<[number, number]> = []
      for (let y = 1; y < map.height - 1; y++) {
        for (let x = 1; x < map.width - 1; x++) {
          if (WALKABLE.has(map.tiles[y]?.[x] ?? '') && !exitSet.has(`${x},${y}`) && !trainerSet.has(`${x},${y}`)) {
            validTiles.push([x, y])
          }
        }
      }
      // Fisher-Yates shuffle then take `count`
      for (let i = validTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validTiles[i], validTiles[j]] = [validTiles[j], validTiles[i]]
      }
      for (let i = 0; i < Math.min(count, validTiles.length); i++) {
        const [x, y] = validTiles[i]
        items.push({ mapId, x, y, itemId: Math.random() < 0.6 ? 'pokeball' : 'potion' })
      }
    }
    setMapItems(items)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-heal when entering pokecenter; show area banner on map change
  useEffect(() => {
    if (currentMapId === 'pokecenter' && prevMapIdRef.current !== 'pokecenter') {
      healParty()
    }
    if (currentMapId !== prevMapIdRef.current) {
      const mapData = MAPS[currentMapId]
      if (mapData && !mapData.isInterior) {
        if (areaBannerTimerRef.current) clearTimeout(areaBannerTimerRef.current)
        setAreaBanner(mapData.name)
        areaBannerTimerRef.current = setTimeout(() => setAreaBanner(null), 3000)
      }
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
        const injuredCount = partyRef.current.filter(p => (p.currentHp ?? 0) < (p.maxHp ?? 1)).length
        drawPokeCenter(ctx, cW, cH, injuredCount)
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

      // ── Pass 3: Route signs & cave mouths (auto-detected from exits) ────
      if (!map.isInterior) {
        const SKIP_TARGETS = new Set(['pokecenter', 'pokemart'])
        const groups: Record<string, typeof map.exits> = {}
        for (const e of map.exits) {
          if (SKIP_TARGETS.has(e.targetMap)) continue
          ;(groups[e.targetMap] ??= []).push(e)
        }
        for (const [targetId, exits] of Object.entries(groups)) {
          const xs = exits.map(e => e.x), ys = exits.map(e => e.y)
          const midX = (Math.min(...xs) + Math.max(...xs)) / 2
          const midY = (Math.min(...ys) + Math.max(...ys)) / 2
          const atL = exits[0].x === 0
          const atR = exits[0].x === map.width - 1
          const atT = exits[0].y === 0
          type Dir = 'up'|'down'|'left'|'right'
          let dir: Dir = 'down', sx = midX, sy = midY
          if (atL)      { dir = 'left';  sx = 1;            sy = midY }
          else if (atR) { dir = 'right'; sx = map.width-2;  sy = midY }
          else if (atT) { dir = 'up';    sx = midX;         sy = 1 }
          else          { dir = 'down';  sx = midX;         sy = map.height-2 }

          const isCave = map.id === 'rockyCave' || targetId === 'rockyCave'

          if (isCave) {
            // Dark cave arch on each exit tile
            for (const e of exits) {
              const evx = e.x - (playerX - hw)
              const evy = e.y - (playerY - hh)
              if (evx < 0 || evx >= COLS || evy < 0 || evy >= ROWS) continue
              const cx = evx * TILE, cy = evy * TILE
              const aw = TILE - 4, ah = Math.round(TILE * 0.82)
              ctx.fillStyle = '#0a0806'
              ctx.beginPath()
              ctx.roundRect(cx + 2, cy + TILE - ah, aw, ah, [6, 6, 0, 0])
              ctx.fill()
              ctx.strokeStyle = '#4a3020'
              ctx.lineWidth = 2
              ctx.stroke()
            }
          } else {
            // Wooden route sign
            const svx = sx - (playerX - hw)
            const svy = sy - (playerY - hh)
            if (svx < -1 || svx > COLS || svy < -1 || svy > ROWS) continue
            const px = Math.round(svx * TILE + TILE / 2)
            const py = Math.round(svy * TILE)
            const arrowGlyph: Record<Dir, string> = {up:'↑', down:'↓', left:'←', right:'→'}
            const label = (MAPS[targetId]?.name ?? targetId).toUpperCase()
            const text = `${label} ${arrowGlyph[dir]}`
            ctx.font = 'bold 7px monospace'
            const tw = ctx.measureText(text).width
            const bw = Math.max(tw + 10, 52), bh = 14
            const bx = px - bw / 2, by = py + 4
            // Post
            ctx.fillStyle = '#6b3f1a'
            ctx.fillRect(px - 1, by + bh, 2, TILE - bh - 2)
            // Board fill
            ctx.fillStyle = '#d4a84b'
            ctx.beginPath()
            ctx.roundRect(bx, by, bw, bh, 2)
            ctx.fill()
            // Board border
            ctx.strokeStyle = '#6b3f1a'
            ctx.lineWidth = 1.5
            ctx.stroke()
            // Text
            ctx.fillStyle = '#1a0f00'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(text, px, by + bh / 2)
          }
        }
      }

      // ── Pass 4: Map items (Pokéballs and Potions) ────────────────────────
      const visibleItems = mapItems.filter(it => it.mapId === map.id)
      for (const item of visibleItems) {
        const vx = item.x - playerX + hw
        const vy = item.y - playerY + hh
        if (vx < 0 || vx >= COLS || vy < 0 || vy >= ROWS) continue
        const ix = vx * TILE + TILE / 2, iy = vy * TILE + TILE / 2
        if (item.itemId === 'pokeball') {
          // Pokéball: red top, white bottom
          ctx.fillStyle = '#e82020'
          ctx.beginPath(); ctx.arc(ix, iy - 1, 6, Math.PI, 0); ctx.fill()
          ctx.fillStyle = '#f8f8f8'
          ctx.beginPath(); ctx.arc(ix, iy - 1, 6, 0, Math.PI); ctx.fill()
          ctx.strokeStyle = '#181808'; ctx.lineWidth = 1.2
          ctx.beginPath(); ctx.arc(ix, iy - 1, 6, 0, Math.PI * 2); ctx.stroke()
          ctx.beginPath(); ctx.moveTo(ix - 6, iy - 1); ctx.lineTo(ix + 6, iy - 1); ctx.stroke()
          ctx.fillStyle = '#f8f8f8'; ctx.beginPath(); ctx.arc(ix, iy - 1, 1.5, 0, Math.PI * 2); ctx.fill()
        } else {
          // Potion: blue bottle
          ctx.fillStyle = '#3060e0'
          ctx.beginPath(); ctx.roundRect(ix - 3, iy - 7, 6, 9, 2); ctx.fill()
          ctx.fillStyle = '#80c0ff'
          ctx.fillRect(ix - 2, iy - 6, 2, 4)
          ctx.fillStyle = '#a0d0ff'
          ctx.beginPath(); ctx.roundRect(ix - 2, iy - 9, 4, 3, 1); ctx.fill()
          ctx.strokeStyle = '#1840a0'; ctx.lineWidth = 1
          ctx.beginPath(); ctx.roundRect(ix - 3, iy - 7, 6, 9, 2); ctx.stroke()
        }
      }

      // ── Pass 5: NPC trainers — drawn from sprite sheet ───────────────────
      for (const t of map.trainers) {
        const vx = t.x - playerX + hw
        const vy = t.y - playerY + hh
        if (vx < 0 || vx >= COLS || vy < 0 || vy >= ROWS) continue
        const dx = vx * TILE, dy = vy * TILE
        const sheet = npcSheetRef.current
        // NPC sprite: pick row/col based on trainer class
        const NPC_CLASS_SPRITES: Record<string, {row: number, col: number}> = {
          'Biker':   { row: 4, col: 5 },
          'Lass':    { row: 2, col: 3 },
          'Swimmer': { row: 3, col: 2 },
          'Hiker':   { row: 5, col: 1 },
          'default': { row: 1, col: 5 },
        }
        const npcCls = t.name.split(' ')[0]
        const npcSprite = NPC_CLASS_SPRITES[npcCls] ?? NPC_CLASS_SPRITES['default']
        const sx = npcSprite.col * 16, sy = npcSprite.row * 16
        if (sheet && sheet.complete) {
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(sheet, sx, sy, 16, 16, dx + 2, dy + 4, TILE - 4, TILE - 4)
        } else {
          ctx.font = `${TILE * 0.7}px serif`
          ctx.textAlign = 'center'
          ctx.fillText('🧑', dx + TILE / 2, dy + TILE * 0.8)
        }
        // Exclamation mark for vision cone
        const dirOffset = { down: [0,1], up: [0,-1], left: [-1,0], right: [1,0] }[t.direction] ?? [0,1]
        const pvx = playerX - t.x, pvy = playerY - t.y
        const inCone = (t.direction === 'down'  && pvx === 0 && pvy > 0 && pvy <= 3) ||
                       (t.direction === 'up'    && pvx === 0 && pvy < 0 && pvy >= -3) ||
                       (t.direction === 'left'  && pvy === 0 && pvx < 0 && pvx >= -3) ||
                       (t.direction === 'right' && pvy === 0 && pvx > 0 && pvx <= 3)
        if (inCone) {
          ctx.font = 'bold 10px monospace'
          ctx.fillStyle = '#e82020'
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
          ctx.fillText('!', dx + TILE / 2, dy)
        }
        void dirOffset
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
      const triggered =
        (trainer.direction === 'down'  && trainer.x === nx && ny > trainer.y  && ny <= trainer.y + 3) ||
        (trainer.direction === 'up'    && trainer.x === nx && ny < trainer.y  && ny >= trainer.y - 3) ||
        (trainer.direction === 'left'  && trainer.y === ny && nx < trainer.x  && nx >= trainer.x - 3) ||
        (trainer.direction === 'right' && trainer.y === ny && nx > trainer.x  && nx <= trainer.x + 3)
      if (triggered) {
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

    // Item pickup
    const currentMapId_ = currentMapIdRef.current
    setMapItems(prev => {
      const idx = prev.findIndex(it => it.mapId === currentMapId_ && it.x === nx && it.y === ny)
      if (idx === -1) return prev
      const item = prev[idx]
      const itemName = item.itemId === 'pokeball' ? 'Pokéball' : 'Potion'
      setDialogue(`You found a ${itemName}!`)
      // Add to bag
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
        if (shopOpen) { setShopOpen(false); shopDismissedRef.current = true; return }
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
    const _validMoves = filterValidMoves(currentProfile.party[0].moves ?? [])
    const _usedIds = new Set(_validMoves.map(m => m.moveId))
    const _fresh = player.moves.filter(m => !_usedIds.has(m.moveId))
    player.moves = [..._validMoves, ..._fresh].slice(0, 4)
    player.nickname = currentProfile.party[0].nickname
    const fullParty = currentProfile.party.slice(1).map(p => {
      const info = pokemonMap[p.pokemonId]
      if (!info) return null
      const bp = buildPartyPokemon(info, p.level)
      bp.currentHp = p.currentHp ?? bp.maxHp
      bp.xp = p.xp ?? bp.xp
      const _bpValidMoves = filterValidMoves(p.moves ?? [])
      const _bpUsedIds = new Set(_bpValidMoves.map(m => m.moveId))
      const _bpFresh = bp.moves.filter(m => !_bpUsedIds.has(m.moveId))
      bp.moves = [..._bpValidMoves, ..._bpFresh].slice(0, 4)
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
    const _validMoves = filterValidMoves(currentProfile.party[0].moves ?? [])
    const _usedIds = new Set(_validMoves.map(m => m.moveId))
    const _fresh = player.moves.filter(m => !_usedIds.has(m.moveId))
    player.moves = [..._validMoves, ..._fresh].slice(0, 4)
    player.nickname = currentProfile.party[0].nickname
    const fullParty = currentProfile.party.slice(1).map(p => {
      const info = pokemonMap[p.pokemonId]
      if (!info) return null
      const bp = buildPartyPokemon(info, p.level)
      bp.currentHp = p.currentHp ?? bp.maxHp
      bp.xp = p.xp ?? bp.xp
      const _bpValidMoves = filterValidMoves(p.moves ?? [])
      const _bpUsedIds = new Set(_bpValidMoves.map(m => m.moveId))
      const _bpFresh = bp.moves.filter(m => !_bpUsedIds.has(m.moveId))
      bp.moves = [..._bpValidMoves, ..._bpFresh].slice(0, 4)
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
    <div style={{
      height: '100vh', overflow: 'hidden',
      background: '#1a1a2e', display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar — fixed height */}
      <div style={{
        flexShrink: 0, display: 'flex', justifyContent: 'flex-end',
        alignItems: 'center', padding: '6px 12px', gap: 8,
      }}>
        <button onClick={() => navigate('/team')}
          className="bg-[#16213e] border border-[#4ecdc4]/40 text-[#4ecdc4] text-xs px-3 py-1 rounded-lg">
          Team
        </button>
        <button onClick={() => navigate('/pokedex')}
          className="bg-[#16213e] border border-[#4ecdc4]/40 text-[#4ecdc4] text-xs px-3 py-1 rounded-lg">
          Pokédex
        </button>
        <button onClick={() => setWorldBagOpen(true)}
          className="bg-[#16213e] border border-yellow-400/40 text-yellow-400 text-xs px-3 py-1 rounded-lg">
          Bag
        </button>
        <button onClick={() => navigate('/progress')}
          className="bg-[#16213e] border border-[#4ecdc4]/40 text-[#4ecdc4] text-xs px-3 py-1 rounded-lg">
          Progress
        </button>
      </div>

      {/* Main area — fills remaining height, no overflow */}
      <div style={{
        flex: 1, minHeight: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'row', gap: 8,
        padding: '0 8px 8px',
        alignItems: 'stretch',
      }}>

        {/* Left column: canvas fills everything, DPad overlaid at bottom */}
        <div
          ref={canvasContainerRef}
          style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}
        >
          {/* Canvas — sized by ResizeObserver, centered */}
          <canvas
            ref={canvasRef}
            width={COLS * TILE}
            height={ROWS * TILE}
            className="border-2 border-yellow-400/30 rounded-xl"
            style={{
              imageRendering: 'pixelated', display: 'block',
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: canvasCssSize ? canvasCssSize.w : '100%',
              height: canvasCssSize ? canvasCssSize.h : 'auto',
            }}
          />

          {/* Area name banner */}
          {areaBanner && (
            <div
              key={areaBanner}
              className="absolute left-1/2 font-bold text-sm pointer-events-none"
              style={{
                top: 8, transform: 'translateX(-50%)',
                background: 'rgba(10,16,32,0.85)', border: '1.5px solid #ffd700',
                borderRadius: 8, color: '#ffd700', padding: '4px 14px',
                whiteSpace: 'nowrap', animation: 'fadeBanner 3s ease-out forwards',
                zIndex: 5,
              }}
            >
              {areaBanner}
            </div>
          )}

          {/* Dialogue — overlaid above DPad area */}
          {dialogue && (
            <div
              onClick={() => setDialogue(null)}
              className="absolute left-2 right-2 bg-[#16213e] border-2 border-yellow-400 rounded-xl p-3 text-white text-sm cursor-pointer"
              style={{ bottom: 180, zIndex: 15 }}
            >
              {dialogue}
            </div>
          )}

          {/* DPad — overlaid at bottom-center, sits on top of the canvas */}
          <div style={{
            position: 'absolute', bottom: 16, left: '50%',
            transform: 'translateX(-50%)', zIndex: 10,
          }}>
            <DPad onMove={(dx, dy) => {
              if (shopOpen) { setShopOpen(false); shopDismissedRef.current = true; return }
              if (dialogue) { setDialogue(null); return }
              move(dx, dy)
            }} />
          </div>

          {/* Mini-map: overlay bottom-right on mobile (hidden on desktop) */}
          <div className="absolute bottom-2 right-2 lg:hidden" style={{ zIndex: 10 }}>
            <MiniMap currentMapId={currentMapId} />
          </div>

        </div>

        {/* Right column: mini-map, vertically centred, no overflow */}
        <div style={{
          flexShrink: 0, width: 380, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}
          className="hidden lg:flex"
        >
          <MiniMap currentMapId={currentMapId} />
        </div>

      </div>

      {shopOpen && profile && (
        <ShopModal
          profile={profile}
          onBuy={handleBuy}
          onClose={() => { setShopOpen(false); shopDismissedRef.current = true }}
        />
      )}

      {worldBagOpen && profile && (
        <BagMenu
          bag={profile.bag ?? []}
          onUse={async (itemId) => {
            const item = ITEMS.find(i => i.id === itemId)
            if (!item || !profile.id) return
            const party = profile.party ?? []
            let newParty = party
            if (item.effect === 'heal') {
              const target = party.findIndex(p => p.currentHp < p.maxHp)
              if (target === -1) { setDialogue('All Pokémon are healthy!'); return }
              newParty = party.map((p, i) => i === target
                ? { ...p, currentHp: Math.min(p.maxHp, (p.currentHp ?? 0) + item.power) }
                : p)
              setDialogue(`${party[target].nickname ?? 'Pokémon'} recovered ${item.power} HP!`)
            } else if (item.effect === 'revive') {
              const target = party.findIndex(p => (p.currentHp ?? 0) <= 0)
              if (target === -1) { setDialogue('No fainted Pokémon!'); return }
              newParty = party.map((p, i) => i === target
                ? { ...p, currentHp: Math.floor(p.maxHp / 2) }
                : p)
              setDialogue(`${party[target].nickname ?? 'Pokémon'} was revived!`)
            }
            const newBag = (profile.bag ?? [])
              .map(b => b.itemId === itemId ? { ...b, qty: b.qty - 1 } : b)
              .filter(b => b.qty > 0)
            try {
              await updateProfile(profile.id, { party: newParty, bag: newBag })
              useProfileStore.getState().setProfile({ ...profile, party: newParty, bag: newBag })
            } catch { /* silent */ }
            setWorldBagOpen(false)
          }}
          onClose={() => setWorldBagOpen(false)}
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
