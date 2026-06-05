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
  flower3:  'tiles/tile_flower3.png',
  brush2:   'tiles/tile_brush2.png',
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

// ── NPC trainer figure images ─────────────────────────────────────────────
const NPC_FIGURE_FILES: Record<string, string> = {
  'Monk':           'npc/monk.png',
  'Team Rocket 1':  'npc/team-rocket-1.png',
  'Team Rocket 2':  'npc/team-rocket-2.png',
  'Cap':            'npc/cap.png',
  'Black Rocket':   'npc/black-rocket.png',
  'Nurse':          'npc/nurse.png',
}
// Trainers with full directional sprite sets (spriteDir/front|back|left|right.png)
const NPC_DIR_FILES: Record<string, string> = {
  'Dark Trainer': 'sprites/npc/dark-trainer',
}
const NPC_FIGURE_IMGS: Record<string, HTMLImageElement> = {}
Object.entries(NPC_FIGURE_FILES).forEach(([name, file]) => {
  const img = new Image()
  img.src = `${import.meta.env.BASE_URL}${file}`
  NPC_FIGURE_IMGS[name] = img
})
// Preload directional sprites for dir-based NPCs: key = "name_dir"
const NPC_DIR_POSES = ['front','back','left','right'] as const
Object.entries(NPC_DIR_FILES).forEach(([name, dir]) => {
  NPC_DIR_POSES.forEach(pose => {
    const img = new Image()
    img.src = `${import.meta.env.BASE_URL}${dir}/${pose}.png`
    NPC_FIGURE_IMGS[`${name}_${pose}`] = img
  })
})

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

  const nurseRaw = NPC_FIGURE_IMGS['Nurse']
  if (nurseRaw?.complete && nurseRaw.naturalWidth > 0) {
    // Sprite-based nurse — crisp pixel art scaled to TILE*1.5 tall
    if (!TILE_CANVASES['npc_Nurse']) TILE_CANVASES['npc_Nurse'] = applyChromaKey(nurseRaw, true)
    const nurseSrc = TILE_CANVASES['npc_Nurse'] ?? nurseRaw
    const dh = Math.round(TILE * 1.5)
    const dw = Math.round(dh * (nurseSrc.width / nurseSrc.height))
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(nurseSrc, njX - dw / 2, njY - dh, dw, dh)
    ctx.imageSmoothingEnabled = true
  } else {
    // Fallback — drawn nurse (while image loads)
    if (nurseRaw && !nurseRaw.complete) nurseRaw.onload = () => {} // no-op to allow next frame

    ctx.fillStyle = '#f0f0f8'; ctx.fillRect(njX - 9, njY - 12, 18, 16)
    ctx.fillStyle = '#f0a0b8'
    ctx.fillRect(njX - 9, njY - 12, 18, 4)
    ctx.fillRect(njX - 9, njY - 12, 3, 16)
    ctx.fillRect(njX + 6, njY - 12, 3, 16)
    ctx.fillStyle = '#e02020'
    ctx.fillRect(njX - 1, njY - 10, 2, 6)
    ctx.fillRect(njX - 3, njY - 8, 6, 2)
    ctx.fillStyle = '#f5c8a8'; ctx.fillRect(njX - 3, njY - 15, 6, 4)
    ctx.fillStyle = '#f5c8a8'
    ctx.beginPath(); ctx.ellipse(njX, njY - 22, 8, 10, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#e888a8'
    ctx.beginPath(); ctx.arc(njX - 9, njY - 24, 5, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(njX + 9, njY - 24, 5, 0, Math.PI * 2); ctx.fill()
    ctx.fillRect(njX - 8, njY - 31, 16, 8)
    ctx.beginPath(); ctx.arc(njX, njY - 31, 8, Math.PI, 0); ctx.fill()
    ctx.fillStyle = '#f8f8f8'
    ctx.fillRect(njX - 7, njY - 35, 14, 7)
    ctx.beginPath(); ctx.arc(njX, njY - 35, 7, Math.PI, 0); ctx.fill()
    ctx.fillStyle = '#e02020'
    ctx.fillRect(njX - 1, njY - 33, 2, 5); ctx.fillRect(njX - 3, njY - 31, 6, 2)
    ctx.fillStyle = '#302820'
    ctx.beginPath(); ctx.arc(njX - 3, njY - 22, 1.8, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(njX + 3, njY - 22, 1.8, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#c07060'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(njX, njY - 18, 3, 0.2, Math.PI - 0.2); ctx.stroke()
    ctx.fillStyle = '#f0f0f8'
    ctx.fillRect(njX - 14, njY - 11, 5, 12); ctx.fillRect(njX + 9, njY - 11, 5, 12)
    ctx.fillStyle = '#f5c8a8'
    ctx.beginPath(); ctx.arc(njX - 11, njY + 2, 3, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.arc(njX + 12, njY + 2, 3, 0, Math.PI * 2); ctx.fill()
  }

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

  // ── Wandering NPCs ────────────────────────────────────────────────────────
  type WanderingState = {
    id: string; name: string; spriteDir: string;
    x: number; y: number;
    dir: 'up'|'down'|'left'|'right';
    facing: 'up'|'down'|'left'|'right';
    moving: boolean;
    homeX: number; homeY: number; wanderRadius: number;
    isTrainer?: boolean;
    party?: Array<{ pokemonId: number; level: number }>
    pokemonId?: number;
    level?: number;
  }
  const [wanderingNpcs, setWanderingNpcs] = useState<WanderingState[]>([])
  const wanderingNpcsRef = useRef<WanderingState[]>([])
  const wanderingImgsRef = useRef<Record<string, HTMLImageElement>>({})  // key = "spriteDir/pose"
  const [worldBagOpen, setWorldBagOpen] = useState(false)
  const [minimapExpanded, setMinimapExpanded] = useState(false)
  const [pendingWorldItem, setPendingWorldItem] = useState<{ itemId: string } | null>(null)
  // npcId → expiry timestamp (ms); NPCs hidden after being caught, respawn after 10 min
  const [hiddenNpcs, setHiddenNpcs] = useState<Record<string, number>>({})
  const hiddenNpcsRef = useRef<Record<string, number>>({})
  useEffect(() => { hiddenNpcsRef.current = hiddenNpcs }, [hiddenNpcs])

  // Canvas size — use window dimensions directly (reliable on iOS Safari)
  const mainAreaRef = useRef<HTMLDivElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const [canvasCssSize, setCanvasCssSize] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const TOPBAR_H  = 44
    const DPAD_H    = 172
    const MINIMAP_W = 396   // mini-map sidebar + gap, desktop only

    function compute() {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const isDesktop = vw >= 1024
      const availH = Math.max(vh - TOPBAR_H - DPAD_H, 100)
      const availW = Math.max(isDesktop ? vw - MINIMAP_W : vw - 16, 100)
      const ratio = COLS / ROWS
      const wFromH = Math.floor(availH * ratio)
      const w = Math.min(wFromH, availW)
      const h = Math.floor(w / ratio)
      setCanvasCssSize({ w, h })
    }

    compute()
    window.addEventListener('resize', compute)
    // iOS: viewport changes after orientation change — wait for layout
    const onOrient = () => setTimeout(compute, 150)
    window.addEventListener('orientationchange', onOrient)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('orientationchange', onOrient)
    }
  }, [])

  // Feature D: items on map — generate once on mount (respawn on game restart only)
  type MapItem = { mapId: string; x: number; y: number; itemId: 'pokeball' | 'potion' }
  const [mapItems, setMapItems] = useState<MapItem[]>([])
  const mapItemsRef = useRef<MapItem[]>([])
  useEffect(() => { mapItemsRef.current = mapItems }, [mapItems])

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

  // On mount: if the player just caught an NPC Pokemon, hide it for 10 minutes
  useEffect(() => {
    const { ballCaught, pendingCatchNpcId, setPendingCatchNpcId } = useBattleStore.getState()
    if (ballCaught && pendingCatchNpcId) {
      const expiry = Date.now() + 10 * 60 * 1000
      setHiddenNpcs(prev => ({ ...prev, [pendingCatchNpcId]: expiry }))
      hiddenNpcsRef.current = { ...hiddenNpcsRef.current, [pendingCatchNpcId]: expiry }
      setWanderingNpcs(prev => {
        const next = prev.filter(w => w.id !== pendingCatchNpcId)
        wanderingNpcsRef.current = next
        return next
      })
    }
    if (pendingCatchNpcId) setPendingCatchNpcId(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Respawn hidden NPC Pokemon after 10 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const hidden = hiddenNpcsRef.current
      const expired = Object.entries(hidden).filter(([, expiry]) => now >= expiry)
      if (expired.length === 0) return
      const currentMap = mapRef.current
      expired.forEach(([id]) => {
        const def = currentMap.wanderingNpcs?.find(n => n.id === id)
        if (!def) return
        const lvl = def.minLevel != null && def.maxLevel != null
          ? def.minLevel + Math.floor(Math.random() * (def.maxLevel - def.minLevel + 1))
          : undefined
        const respawned: WanderingState = {
          id: def.id, name: def.name, spriteDir: def.spriteDir,
          x: def.homeX, y: def.homeY, dir: 'down', facing: 'down', moving: false,
          homeX: def.homeX, homeY: def.homeY, wanderRadius: def.wanderRadius,
          isTrainer: def.isTrainer, party: def.party,
          pokemonId: def.pokemonId, level: lvl,
        }
        setWanderingNpcs(cur => {
          if (cur.some(w => w.id === id)) return cur
          const next = [...cur, respawned]
          wanderingNpcsRef.current = next
          return next
        })
      })
      setHiddenNpcs(prev => {
        const next = { ...prev }
        expired.forEach(([id]) => delete next[id])
        return next
      })
    }, 30_000)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Generate (or regenerate) map items — Pokéballs (60%) and Potions (40%)
  function generateMapItems() {
    const items: MapItem[] = []
    const ITEM_MAPS: Record<string, number> = {
      sunlitMeadow: 3, viridianForest: 3, flowerMeadow: 3,
      mistyLake: 2, rockyCave: 2, trainerRoad: 2,
      pallet: 1, cinnabarTown: 1, volcanoTrail: 3,
    }
    for (const [mapId, count] of Object.entries(ITEM_MAPS)) {
      const map = MAPS[mapId]
      if (!map) continue
      const WALKABLE = new Set(['grass', 'land', 'path', 'flower', 'flower2', 'flower3', 'brush2'])
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
      for (let i = validTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validTiles[i], validTiles[j]] = [validTiles[j], validTiles[i]]
      }
      for (let i = 0; i < Math.min(count, validTiles.length); i++) {
        const [x, y] = validTiles[i]
        items.push({ mapId, x, y, itemId: Math.random() < 0.6 ? 'pokeball' : 'potion' })
      }
    }
    mapItemsRef.current = items
    setMapItems(items)
    setTimeout(() => drawMap(pxRef.current, pyRef.current, 'down', false), 50)
  }

  // Generate on mount, then respawn every 5 minutes of game time
  useEffect(() => {
    generateMapItems()
    const respawnTimer = setInterval(generateMapItems, 5 * 60 * 1000)
    return () => clearInterval(respawnTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Wandering NPC movement — 550ms tick, 20% move probability per NPC
  // Walk sprite shows for 200ms then clears to idle (brief animation, not a constant run)
  useEffect(() => {
    // Look-around pool: left/right most common, up & down occasionally
    // 'down' included here so NPC can naturally face viewer via look-around
    const LOOK_POOL: Array<'up'|'down'|'left'|'right'> = ['left','right','left','right','up','down']
    const DIRS: Array<'up'|'down'|'left'|'right'> = ['up','down','left','right']

    const timer = setInterval(() => {
      const map = mapRef.current
      if (!map) return
      setWanderingNpcs(prev => {
        const playerX = pxRef.current
        const playerY = pyRef.current
        const next = prev.map((w, _i, arr) => {
          if (Math.random() > 0.20) {
            // Stopped — occasionally look around
            if (Math.random() < 0.40) {
              const newFacing = LOOK_POOL[Math.floor(Math.random() * LOOK_POOL.length)]
              return { ...w, moving: false, facing: newFacing }
            }
            return { ...w, moving: false }
          }
          // Attempt to move
          const d = DIRS[Math.floor(Math.random() * 4)]
          const nx = w.x + (d === 'right' ? 1 : d === 'left' ? -1 : 0)
          const ny = w.y + (d === 'down'  ? 1 : d === 'up'   ? -1 : 0)
          if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) return { ...w, moving: false }
          const tile = map.tiles[ny]?.[nx]
          if (!tile || tile === 'tree' || tile === 'building' || tile === 'water' || tile === 'fence') return { ...w, moving: false }
          if (Math.abs(nx - w.homeX) > w.wanderRadius || Math.abs(ny - w.homeY) > w.wanderRadius) return { ...w, moving: false }
          if (nx === playerX && ny === playerY) return { ...w, moving: false }
          if (arr.some(other => other.id !== w.id && other.x === nx && other.y === ny)) return { ...w, moving: false }
          // After moving DOWN: face sideways on arrival (not at viewer)
          // After any other direction: face that direction
          const arrivalFacing: typeof d = d === 'down'
            ? (Math.random() < 0.5 ? 'left' : 'right')
            : d
          return { ...w, x: nx, y: ny, dir: d, facing: arrivalFacing, moving: true }
        })
        wanderingNpcsRef.current = next
        // Clear walk sprite after 200ms so NPCs show idle pose quickly
        setTimeout(() => {
          setWanderingNpcs(cur => {
            const cleared = cur.map(w => w.moving ? { ...w, moving: false } : w)
            wanderingNpcsRef.current = cleared
            return cleared
          })
        }, 200)
        return next
      })
    }, 550)
    return () => clearInterval(timer)
  }, [])

  // Auto-heal when entering pokecenter; show area banner on map change
  useEffect(() => {
    const POKECENTER_IDS = new Set(['pokecenter', 'cinnabarPokecenter'])
    if (POKECENTER_IDS.has(currentMapId) && !POKECENTER_IDS.has(prevMapIdRef.current ?? '')) {
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

    // Initialise wandering NPCs for the new map (skip currently hidden/caught ones)
    const mapData = MAPS[currentMapId]
    const now = Date.now()
    const initial: WanderingState[] = (mapData?.wanderingNpcs ?? [])
      .filter(w => !hiddenNpcsRef.current[w.id] || now >= hiddenNpcsRef.current[w.id])
      .map(w => {
        const lvl = w.minLevel != null && w.maxLevel != null
          ? w.minLevel + Math.floor(Math.random() * (w.maxLevel - w.minLevel + 1))
          : undefined
        return {
          id: w.id, name: w.name, spriteDir: w.spriteDir,
          x: w.homeX, y: w.homeY, dir: 'down' as const, facing: 'down' as const, moving: false,
          homeX: w.homeX, homeY: w.homeY, wanderRadius: w.wanderRadius,
          isTrainer: w.isTrainer, party: w.party,
          pokemonId: w.pokemonId, level: lvl,
        }
      })
    wanderingNpcsRef.current = initial
    setWanderingNpcs(initial)

    // Preload sprites for each wandering NPC
    const POSES = ['front','back','left','right','run_back','run_front','walk_left','walk_right','walk_front']
    initial.forEach(w => {
      POSES.forEach(pose => {
        const key = `${w.spriteDir}/${pose}`
        if (!wanderingImgsRef.current[key]) {
          const img = new Image()
          img.src = `${import.meta.env.BASE_URL}${w.spriteDir}/${pose}.png`
          wanderingImgsRef.current[key] = img
        }
      })
    })
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
      if (map.id === 'pokecenter' || map.id === 'cinnabarPokecenter') {
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
          const outOfBounds = my < 0 || my >= map.height || mx < 0 || mx >= map.width
          const tile: TileType = outOfBounds
            ? (map.id === 'volcanoTrail' || map.id === 'rockyCave' ? 'building' : 'tree')
            : map.tiles[my][mx]
          const x = vx * TILE, y = vy * TILE

          if (map.id === 'volcanoTrail') {
            const s = (mx * 7 + my * 13) & 15  // 0–15, deterministic per tile
            if (tile === 'path') {
              // Lava floor — warm orange-red base with glowing blob highlights (ref: Grotte_Volcanique)
              ctx.fillStyle = s < 5 ? '#8c2800' : s < 10 ? '#7a2000' : '#962e00'
              ctx.fillRect(x, y, TILE, TILE)
              // Lighter orange blob patches (lava surface variation)
              ctx.fillStyle = s < 4 ? 'rgba(220,90,0,0.55)' : 'rgba(200,70,0,0.45)'
              ctx.beginPath()
              ctx.ellipse(x + 6 + (s&5), y + 8 + (s%5), 6-(s&1), 4+(s%2), (s%3)*0.4, 0, Math.PI*2)
              ctx.fill()
              if (s > 6) {
                ctx.fillStyle = 'rgba(240,120,0,0.35)'
                ctx.beginPath()
                ctx.ellipse(x + TILE-8-(s%4), y + TILE-9+(s&3), 5, 3, 0, 0, Math.PI*2)
                ctx.fill()
              }
              // Bright lava crack lines
              ctx.strokeStyle = s < 6 ? '#ff6600' : '#ff8000'
              ctx.lineWidth = s < 4 ? 1.5 : 1
              ctx.beginPath()
              ctx.moveTo(x+3+(s&3), y+TILE-5-(s>>3))
              ctx.lineTo(x+9+(s%4), y+TILE-10)
              ctx.lineTo(x+13+(s&3), y+TILE-14-(s%3))
              ctx.stroke()
              // Hot glow edge
              ctx.fillStyle = 'rgba(255,80,0,0.22)'; ctx.fillRect(x, y+TILE-3, TILE, 3)
              ctx.fillStyle = 'rgba(220,60,0,0.1)'
              ctx.fillRect(x, y, 2, TILE); ctx.fillRect(x+TILE-2, y, 2, TILE)
            } else {
              // Rock wall — dark purple-grey with diamond texture (ref: 5vo6v1ygrtjf1)
              ctx.fillStyle = s < 4 ? '#3a3055' : s < 9 ? '#322848' : s < 13 ? '#3e345c' : '#2e2440'
              ctx.fillRect(x, y, TILE, TILE)
              // Diamond lattice pattern
              const dl = s < 8 ? '#4a3a6a' : '#443060'
              ctx.fillStyle = dl
              for (let di = 0; di < 4; di++) {
                const dx = x + (di % 2) * 16 + (Math.floor(di/2) % 2) * 8
                const dy2 = y + Math.floor(di/2) * 16
                ctx.beginPath()
                ctx.moveTo(dx+8, dy2); ctx.lineTo(dx+16, dy2+8)
                ctx.lineTo(dx+8, dy2+16); ctx.lineTo(dx, dy2+8)
                ctx.closePath(); ctx.fill()
              }
              // Darker diamond borders
              ctx.strokeStyle = s < 8 ? '#26203a' : '#221c36'; ctx.lineWidth = 0.5
              for (let di = 0; di < 4; di++) {
                const dx = x + (di % 2) * 16 + (Math.floor(di/2) % 2) * 8
                const dy2 = y + Math.floor(di/2) * 16
                ctx.beginPath()
                ctx.moveTo(dx+8, dy2); ctx.lineTo(dx+16, dy2+8)
                ctx.lineTo(dx+8, dy2+16); ctx.lineTo(dx, dy2+8)
                ctx.closePath(); ctx.stroke()
              }
              // Lava crack glowing through rock — bright orange
              const crx = x + 4 + (s&5), cry = y + 4 + (s>>3)
              ctx.strokeStyle = 'rgba(255,120,0,0.5)'; ctx.lineWidth = 3
              ctx.beginPath(); ctx.moveTo(crx, cry); ctx.lineTo(crx+3+(s&3), cry+5+(s%3)); ctx.lineTo(crx+1, cry+9+(s&3)); ctx.stroke()
              ctx.strokeStyle = '#ff7000'; ctx.lineWidth = 1
              ctx.beginPath(); ctx.moveTo(crx, cry); ctx.lineTo(crx+3+(s&3), cry+5+(s%3)); ctx.lineTo(crx+1, cry+9+(s&3)); ctx.stroke()
              if (s > 9) {
                ctx.strokeStyle = '#ff5500'; ctx.lineWidth = 0.5
                ctx.beginPath(); ctx.moveTo(x+TILE-6-(s%4), y+5); ctx.lineTo(x+TILE-10, y+11+(s%3)); ctx.stroke()
              }
              // Warm lava glow at base
              ctx.fillStyle = 'rgba(200,60,0,0.18)'; ctx.fillRect(x, y+TILE-3, TILE, 3)
            }
            // skip normal rendering for this tile
          } else if (tile === 'path' && map.id === 'rockyCave') {
            // Rocky cave floor — dark muddy stone with pebble variation
            const s = (mx * 5 + my * 11) & 7
            ctx.fillStyle = s < 3 ? '#2a1e10' : s < 6 ? '#1e1608' : '#251a0c'
            ctx.fillRect(x, y, TILE, TILE)
            ctx.fillStyle = `rgba(90,65,35,${0.35 + (s & 3) * 0.08})`
            ctx.fillRect(x + 3 + (s & 3) * 3, y + 4, 5, 3)
            ctx.fillRect(x + TILE - 9 - (s % 3) * 2, y + TILE - 7, 6, 3)
            ctx.fillStyle = 'rgba(55,30,10,0.25)'
            ctx.beginPath()
            ctx.ellipse(x + TILE * 0.4, y + TILE * 0.6, 5, 3, s * 0.3, 0, Math.PI * 2)
            ctx.fill()
          } else if (tile === 'fence' && map.id === 'trainerRoad') {
            // Training gear — draw grass base then gym equipment
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
            const eq = (mx * 3 + my * 7) % 4
            if (eq === 0) {
              // Barbell
              ctx.fillStyle = '#555'; ctx.fillRect(x + 2, y + TILE / 2 - 3, TILE - 4, 6)
              ctx.fillStyle = '#333'
              ctx.fillRect(x, y + TILE / 2 - 7, 5, 14)
              ctx.fillRect(x + TILE - 5, y + TILE / 2 - 7, 5, 14)
            } else if (eq === 1) {
              // Punching bag
              ctx.fillStyle = '#8B0000'
              ctx.beginPath(); ctx.ellipse(x + TILE / 2, y + TILE * 0.62, 7, 10, 0, 0, Math.PI * 2); ctx.fill()
              ctx.strokeStyle = '#600'; ctx.lineWidth = 1; ctx.stroke()
              ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5
              ctx.beginPath(); ctx.moveTo(x + TILE / 2, y + TILE * 0.62 - 10); ctx.lineTo(x + TILE / 2, y + 2); ctx.stroke()
            } else if (eq === 2) {
              // Weight bench
              ctx.fillStyle = '#3a3a3a'
              ctx.fillRect(x + 3, y + TILE * 0.5, TILE - 6, 6)
              ctx.fillRect(x + 3, y + TILE * 0.56, 3, TILE * 0.35)
              ctx.fillRect(x + TILE - 6, y + TILE * 0.56, 3, TILE * 0.35)
              ctx.fillStyle = '#666'; ctx.fillRect(x + 1, y + TILE * 0.38, TILE - 2, 4)
              ctx.fillStyle = '#333'; ctx.fillRect(x, y + TILE * 0.33, 5, 11); ctx.fillRect(x + TILE - 5, y + TILE * 0.33, 5, 11)
            } else {
              // Pull-up bar
              ctx.fillStyle = '#444'; ctx.fillRect(x, y + 4, TILE, 5)
              ctx.strokeStyle = '#555'; ctx.lineWidth = 2.5
              ctx.beginPath(); ctx.moveTo(x + 5, y + 9); ctx.lineTo(x + 5, y + TILE - 2); ctx.stroke()
              ctx.beginPath(); ctx.moveTo(x + TILE - 5, y + 9); ctx.lineTo(x + TILE - 5, y + TILE - 2); ctx.stroke()
            }
          } else if (tile === 'land' || tile === 'path') {
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
          } else if (tile === 'flower3') {
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
            const fi = TILE_IMGS.flower3
            if (fi?.complete && fi.naturalWidth > 0) {
              if (!TILE_CANVASES['flower3']) TILE_CANVASES['flower3'] = applyChromaKey(fi)
              ctx.drawImage(TILE_CANVASES['flower3']!, x, y, TILE, TILE)
            }
          } else if (tile === 'brush2') {
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
            const fi = TILE_IMGS.brush2
            if (fi?.complete && fi.naturalWidth > 0) {
              if (!TILE_CANVASES['brush2']) TILE_CANVASES['brush2'] = applyChromaKey(fi)
              ctx.drawImage(TILE_CANVASES['brush2']!, x, y, TILE, TILE)
            }
          } else if (tile === 'water') {
            ctx.fillStyle = '#48a8e0'; ctx.fillRect(x, y, TILE, TILE)
            ctx.fillStyle = 'rgba(255,255,255,0.45)'
            ctx.beginPath(); ctx.ellipse(x+TILE*0.28, y+TILE*0.38, TILE*0.18, TILE*0.09, 0, 0, Math.PI*2); ctx.fill()
            ctx.beginPath(); ctx.ellipse(x+TILE*0.70, y+TILE*0.65, TILE*0.16, TILE*0.08, 0, 0, Math.PI*2); ctx.fill()
          } else if (tile === 'building' && map.id === 'rockyCave') {
            // Cave rock wall — draw as stone boulder
            ctx.fillStyle = '#5a5060'; ctx.fillRect(x, y, TILE, TILE)
            // Rock highlight (top-left)
            ctx.fillStyle = '#7a7080'
            ctx.fillRect(x + 3, y + 3, TILE - 8, TILE - 10)
            // Rock shadow (bottom-right)
            ctx.fillStyle = '#3a3040'
            ctx.fillRect(x + TILE - 7, y + TILE - 7, 5, 5)
            ctx.fillRect(x + 4, y + TILE - 6, TILE - 8, 4)
            // Rock crack detail
            ctx.strokeStyle = '#4a4050'; ctx.lineWidth = 1
            ctx.beginPath(); ctx.moveTo(x + 6, y + 8); ctx.lineTo(x + 12, y + 14); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(x + TILE - 9, y + 6); ctx.lineTo(x + TILE - 14, y + 12); ctx.stroke()
          } else {
            // grass, tree, building, door, fence, brush, gym — all use grass base
            if (grassReady) ctx.drawImage(grassImg, x, y, TILE, TILE)
            else { ctx.fillStyle = '#48b048'; ctx.fillRect(x, y, TILE, TILE) }
          }
        }
      }

      // ── Pass 1b: Tree images (proportional, chroma-keyed, drawn over grass base) ─
      const treeImg = TILE_IMGS.tree
      if (treeImg?.complete && treeImg.naturalWidth > 0 && map.id !== 'volcanoTrail' && map.id !== 'rockyCave') {
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
        const SKIP_TARGETS = new Set(['pokecenter', 'pokemart', 'cinnabarPokecenter'])
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
            // Arrow-shaped directional banner
            const svx = sx - (playerX - hw)
            const svy = sy - (playerY - hh)
            if (svx < -1 || svx > COLS || svy < -1 || svy > ROWS) continue
            const px = Math.round(svx * TILE + TILE / 2)
            const py = Math.round(svy * TILE)
            const label = (MAPS[targetId]?.name ?? targetId).toUpperCase()
            ctx.font = 'bold 7px monospace'
            const tw = ctx.measureText(label).width
            const bh = 16, tip = 10  // banner height + arrow tip depth
            const isHoriz = dir === 'left' || dir === 'right'
            const bw = isHoriz ? Math.max(tw + 14 + tip, 58) : Math.max(tw + 14, 52)
            const bx = px - bw / 2, by = py + 4

            // Post
            ctx.fillStyle = '#6b3f1a'
            ctx.fillRect(px - 1, by + bh, 2, TILE - bh - 2)

            // Arrow banner shape
            ctx.beginPath()
            if (dir === 'right') {
              ctx.moveTo(bx,            by)
              ctx.lineTo(bx + bw - tip, by)
              ctx.lineTo(bx + bw,       by + bh / 2)
              ctx.lineTo(bx + bw - tip, by + bh)
              ctx.lineTo(bx,            by + bh)
            } else if (dir === 'left') {
              ctx.moveTo(bx + bw,       by)
              ctx.lineTo(bx + tip,      by)
              ctx.lineTo(bx,            by + bh / 2)
              ctx.lineTo(bx + tip,      by + bh)
              ctx.lineTo(bx + bw,       by + bh)
            } else if (dir === 'down') {
              ctx.moveTo(bx,            by)
              ctx.lineTo(bx + bw,       by)
              ctx.lineTo(bx + bw,       by + bh - tip)
              ctx.lineTo(bx + bw / 2,   by + bh)
              ctx.lineTo(bx,            by + bh - tip)
            } else { // up
              ctx.moveTo(bx + bw / 2,   by)
              ctx.lineTo(bx + bw,       by + tip)
              ctx.lineTo(bx + bw,       by + bh)
              ctx.lineTo(bx,            by + bh)
              ctx.lineTo(bx,            by + tip)
            }
            ctx.closePath()

            // Fill
            ctx.fillStyle = '#d4a84b'
            ctx.fill()
            // Border
            ctx.strokeStyle = '#6b3f1a'
            ctx.lineWidth = 1.5
            ctx.stroke()

            // Text centred in body (offset inward from tip side)
            const textX = dir === 'right' ? px - tip / 2
                        : dir === 'left'  ? px + tip / 2
                        : px
            const textY = dir === 'down' ? by + (bh - tip) / 2
                        : dir === 'up'   ? by + tip + (bh - tip) / 2
                        : by + bh / 2
            ctx.fillStyle = '#1a0f00'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(label, textX, textY)
          }
        }
      }

      // ── Pass 4: Map items (Pokéballs and Potions) ────────────────────────
      const visibleItems = mapItemsRef.current.filter(it => it.mapId === map.id)
      for (const item of visibleItems) {
        const vx = item.x - playerX + hw
        const vy = item.y - playerY + hh
        if (vx < 0 || vx >= COLS || vy < 0 || vy >= ROWS) continue
        const ix = vx * TILE + TILE / 2, iy = vy * TILE + TILE / 2 - 2

        ctx.save()
        // Subtle sparkle star above item
        const sparkX = ix + 7, sparkY = iy - 8
        const sparkSize = 2.5
        ctx.fillStyle = 'rgba(255,255,180,0.92)'
        for (let a = 0; a < 4; a++) {
          const ang = (a / 4) * Math.PI * 2 - Math.PI / 4
          ctx.beginPath()
          ctx.moveTo(sparkX, sparkY)
          ctx.lineTo(sparkX + Math.cos(ang) * sparkSize, sparkY + Math.sin(ang) * sparkSize)
          ctx.lineTo(sparkX + Math.cos(ang + Math.PI / 4) * sparkSize * 0.35, sparkY + Math.sin(ang + Math.PI / 4) * sparkSize * 0.35)
          ctx.closePath(); ctx.fill()
        }

        if (item.itemId === 'pokeball') {
          const r = 7
          const cy = iy + 2

          // Subtle glow
          ctx.shadowColor = 'rgba(220,40,20,0.4)'
          ctx.shadowBlur = 7

          // Red top half
          ctx.fillStyle = '#e02010'
          ctx.beginPath(); ctx.arc(ix, cy, r, Math.PI, 0); ctx.fill()
          // Shine highlight
          ctx.shadowBlur = 0
          ctx.fillStyle = 'rgba(255,140,120,0.5)'
          ctx.beginPath(); ctx.arc(ix - r * 0.3, cy - r * 0.3, r * 0.38, 0, Math.PI * 2); ctx.fill()

          // White bottom half
          ctx.fillStyle = '#f4f4f4'
          ctx.beginPath(); ctx.arc(ix, cy, r, 0, Math.PI); ctx.fill()

          // Outline
          ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 1.5
          ctx.beginPath(); ctx.arc(ix, cy, r, 0, Math.PI * 2); ctx.stroke()

          // Center band
          ctx.lineWidth = 1.8
          ctx.beginPath(); ctx.moveTo(ix - r + 1, cy); ctx.lineTo(ix + r - 1, cy); ctx.stroke()

          // Button circle
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 1.2
          ctx.beginPath(); ctx.arc(ix, cy, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke()

        } else {
          // Potion — compact blue bottle
          const bx = ix, by = iy + 5
          const bw = 9, bh = 10

          ctx.shadowColor = 'rgba(60,120,230,0.4)'
          ctx.shadowBlur = 7

          // Bottle body
          ctx.fillStyle = '#1a3ab0'
          ctx.beginPath(); ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 3); ctx.fill()
          ctx.shadowBlur = 0

          // Liquid
          ctx.fillStyle = '#4080f0'
          ctx.beginPath(); ctx.roundRect(bx - bw / 2 + 1.5, by - bh / 2 + 1.5, bw - 3, bh - 2.5, 2); ctx.fill()

          // Highlight stripe
          ctx.fillStyle = 'rgba(160,220,255,0.65)'
          ctx.beginPath(); ctx.roundRect(bx - bw / 2 + 2, by - bh / 2 + 2, 2, bh - 5, 1); ctx.fill()

          // Neck
          ctx.fillStyle = '#2a50c8'
          ctx.beginPath(); ctx.roundRect(bx - 2.5, by - bh / 2 - 5, 5, 6, 1.5); ctx.fill()

          // Cap
          ctx.fillStyle = '#d83070'
          ctx.beginPath(); ctx.roundRect(bx - 3.5, by - bh / 2 - 9, 7, 5, 2); ctx.fill()
          ctx.fillStyle = 'rgba(255,180,210,0.55)'
          ctx.beginPath(); ctx.roundRect(bx - 2.5, by - bh / 2 - 8, 2, 1.5, 1); ctx.fill()

          // Outlines
          ctx.strokeStyle = '#0a1e60'; ctx.lineWidth = 1.2
          ctx.beginPath(); ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 3); ctx.stroke()
          ctx.beginPath(); ctx.roundRect(bx - 2.5, by - bh / 2 - 5, 5, 6, 1.5); ctx.stroke()
          ctx.strokeStyle = '#801838'
          ctx.beginPath(); ctx.roundRect(bx - 3.5, by - bh / 2 - 9, 7, 5, 2); ctx.stroke()
        }
        ctx.restore()
      }

      // ── Pass 5: NPC trainers ─────────────────────────────────────────────
      for (const t of map.trainers) {
        const vx = t.x - playerX + hw
        const vy = t.y - playerY + hh
        if (vx < 0 || vx >= COLS || vy < 0 || vy >= ROWS) continue
        const dx = vx * TILE, dy = vy * TILE
        // Directional sprite set takes priority, then single figure image
        const dirPose = t.direction === 'up' ? 'back' : t.direction === 'left' ? 'left' : t.direction === 'right' ? 'right' : 'front'
        const dirImg = NPC_DIR_FILES[t.name] ? NPC_FIGURE_IMGS[`${t.name}_${dirPose}`] : null
        const npcImg = dirImg ?? NPC_FIGURE_IMGS[t.name]
        if (npcImg?.complete && npcImg.naturalWidth > 0) {
          const cacheKey = dirImg ? `npc_dir_${t.name}_${dirPose}` : `npc_${t.name}`
          if (!TILE_CANVASES[cacheKey]) TILE_CANVASES[cacheKey] = applyChromaKey(npcImg, !dirImg)
          const npcSrc = TILE_CANVASES[cacheKey] ?? npcImg
          const dw = TILE
          const dh = Math.round(TILE * 1.3)
          ctx.imageSmoothingEnabled = false
          ctx.drawImage(npcSrc, 0, 0, npcSrc.width, npcSrc.height, dx + Math.round((TILE - dw) / 2), dy + TILE - dh, dw, dh)
        } else {
          const sheet = npcSheetRef.current
          // NPC sprite: pick row/col based on trainer class
          const NPC_CLASS_SPRITES: Record<string, {row: number, col: number}> = {
            'Biker':      { row: 4,  col: 5 },  // Biker
            'Lass':       { row: 2,  col: 3 },  // Lass
            'Swimmer':    { row: 3,  col: 2 },  // Swimmer
            'Hiker':      { row: 3,  col: 3 },  // Hiker
            'Bug':        { row: 3,  col: 4 },  // Bug Catcher
            'Youngster':  { row: 0,  col: 2 },  // Youngster
            'Scientist':  { row: 0,  col: 0 },  // Scientist
            'Old':        { row: 0,  col: 6 },  // Old Man
            'Sailor':     { row: 4,  col: 6 },  // Sailor
            'Psychic':    { row: 8,  col: 2 },  // Psychic Female
            'Cool':       { row: 4,  col: 3 },  // Cool Trainer Male
            'Police':     { row: 24, col: 7 },  // Police Officer
            'Rocket':     { row: 4,  col: 2 },  // Team Rocket fallback
            'Ash':        { row: 12, col: 0 },  // Ash/Protagonist
            'Misty':      { row: 32, col: 5 },  // Misty
            'Pikachu':    { row: 28, col: 8 },  // Pikachu
            'default':    { row: 1,  col: 5 },
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
          // trigger redraw when image loads
          if (npcImg && !npcImg.complete) npcImg.onload = () => drawMap(playerX, playerY, dir, isMoving)
        }
        // Exclamation mark for vision cone
        const dirOffset = { down: [0,1], up: [0,-1], left: [-1,0], right: [1,0] }[t.direction] ?? [0,1]
        const pvx = playerX - t.x, pvy = playerY - t.y
        const inCone = Math.abs(pvx) <= 1 && Math.abs(pvy) <= 1 && !(pvx === 0 && pvy === 0)
        if (inCone) {
          ctx.font = 'bold 10px monospace'
          ctx.fillStyle = '#e82020'
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
          ctx.fillText('!', dx + TILE / 2, dy)
        }
        void dirOffset
      }
    }

    // ── Wandering NPCs ────────────────────────────────────────────────────
    for (const w of wanderingNpcsRef.current) {
      // Interior maps: draw at absolute tile position so NPCs don't shift with player movement
      // Exterior maps: use viewport-relative position centered on player
      let dx: number, dy: number
      if (map.isInterior) {
        dx = w.x * TILE
        dy = w.y * TILE
      } else {
        const vx = w.x - playerX + hw
        const vy = w.y - playerY + hh
        if (vx < 0 || vx >= COLS || vy < 0 || vy >= ROWS) continue
        dx = vx * TILE
        dy = vy * TILE
      }

      // Pick pose based on direction + moving state
      // "down" = facing viewer = front sprite; "up" = facing away = back sprite
      // Walking sprites — indexed by movement direction (dir)
      const poseWalk: Record<string, string> = {
        down:  'walk_front', // moving toward viewer → animated walk (falls back to front if absent)
        up:    'run_back',   // moving away → back running
        left:  'walk_left',
        right: 'walk_right',
      }
      // Idle sprites — indexed by facing direction (facing)
      const poseIdle: Record<string, string> = {
        down:  'front',
        up:    'back',
        left:  'left',
        right: 'right',
      }
      const preferred = w.moving ? (poseWalk[w.dir] ?? 'front') : (poseIdle[w.facing] ?? 'front')
      // Fallback chain: preferred → static direction → front
      // Fallback chain: preferred → intermediate → static → front
      const fallback: Record<string, string> = {
        walk_front: 'run_front', run_front: 'front',
        run_back: 'back', walk_left: 'left', walk_right: 'right',
      }
      const f1 = fallback[preferred] ?? ''
      const f2 = fallback[f1] ?? ''
      const tryPoses = [preferred, f1, f2, 'front'].filter((v, i, a) => v && a.indexOf(v) === i)

      let resolvedImg: HTMLImageElement | null = null
      let resolvedPose = 'front'
      for (const p of tryPoses) {
        const candidate = wanderingImgsRef.current[`${w.spriteDir}/${p}`]
        if (candidate?.complete && candidate.naturalWidth > 0) {
          resolvedImg = candidate
          resolvedPose = p
          break
        }
      }

      if (resolvedImg) {
        const cacheKey = `wandering_${w.spriteDir}/${resolvedPose}`
        if (!TILE_CANVASES[cacheKey]) TILE_CANVASES[cacheKey] = applyChromaKey(resolvedImg)
        const src = TILE_CANVASES[cacheKey] ?? resolvedImg
        const dw = TILE
        const dh = Math.round(TILE * 1.2)
        ctx.imageSmoothingEnabled = false
        ctx.save()
        ctx.drawImage(src, 0, 0, src.width, src.height,
          dx + Math.round((TILE - dw) / 2),
          dy + TILE - dh,
          dw, dh)
        ctx.restore()
      } else {
        // All sprites still loading — trigger redraw when first one loads
        const firstImg = wanderingImgsRef.current[`${w.spriteDir}/front`]
        if (firstImg && !firstImg.complete) firstImg.onload = () => drawMap(playerX, playerY, dir, isMoving)
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
  }, [currentMapId, px, py, direction, moving, wanderingNpcs, drawMap])

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

    // Helper: is this tile at the map border?
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

    // Trying to step off-map — check if current tile is a border exit
    if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) {
      const exit = map.exits.find(e => e.x === prevPx && e.y === prevPy)
      if (exit) doExit(exit)
      return
    }

    const tile = map.tiles[ny][nx]

    // Interior exits (door tiles, not at map border) — keep instant trigger
    const interiorExit = map.exits.find(e => e.x === nx && e.y === ny && !isBorderTile(e.x, e.y))
    if (interiorExit) { doExit(interiorExit); return }

    if (BLOCKED_TILES.has(tile)) return

    const door = map.doors.find(d => d.x === nx && d.y === ny)
    if (door?.type === 'pokemart') {
      if (shopDismissedRef.current) return  // player dismissed — don't reopen until they move away
      setShopOpen(true)
      return
    }

    for (const trainer of map.trainers) {
      const triggered = nx === trainer.x && ny === trainer.y
      if (triggered) {
        setDialogue(`${trainer.name} wants to battle!`)
        setTimeout(() => startTrainerBattleRef.current(trainer), 1500)
        return
      }
    }

    // Wandering NPCs block the player — can't walk through them.
    // A wandering trainer starts a battle the moment the player bumps into it.
    const blocker = wanderingNpcsRef.current.find(w => w.x === nx && w.y === ny)
    if (blocker) {
      if (blocker.isTrainer && blocker.party?.length) {
        setDialogue(`${blocker.name} wants to battle!`)
        const t: TrainerNpc = { x: blocker.x, y: blocker.y, direction: 'down', name: blocker.name, party: blocker.party }
        setTimeout(() => startTrainerBattleRef.current(t), 1500)
      } else if (blocker.pokemonId) {
        // Wild Pokemon NPC — start a catchable wild battle
        const opponentInfo = pokemonMap[blocker.pokemonId]
        if (!opponentInfo) return
        const currentProfile = useProfileStore.getState().profile
        if (!currentProfile?.party?.length) return
        const level = blocker.level ?? 5
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
      return
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

    // Trigger encounters on any walkable tile if the map has wild Pokemon defined
    // (Volcano/Cave use 'path' tiles; grass maps use 'grass'; water triggers waterPokemon)
    const currentMap = mapRef.current
    const hasLandWild = currentMap.wildPokemon.length > 0
    const hasWaterWild = (currentMap.waterPokemon ?? []).length > 0
    const isLandTile = tile === 'grass' || tile === 'path' || tile === 'land' || tile === 'flower' || tile === 'flower2' || tile === 'flower3' || tile === 'brush2'
    const isWaterTile = tile === 'water'
    if (((hasLandWild && isLandTile) || (hasWaterWild && isWaterTile)) && Math.random() < ENCOUNTER_RATE) {
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
    const isWaterTile = tile === 'water'
    const isLandTile = tile === 'grass' || tile === 'path' || tile === 'land' || tile === 'flower' || tile === 'flower2' || tile === 'flower3' || tile === 'brush2'
    if (!isLandTile && !isWaterTile) return
    const pool = isWaterTile ? (map.waterPokemon ?? []) : map.wildPokemon
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
    const freshProfile = useProfileStore.getState().profile
    if (!freshProfile?.id || !freshProfile.party?.length) return
    const healedParty = freshProfile.party.map(p => ({ ...p, currentHp: p.maxHp }))
    try {
      await updateProfile(freshProfile.id, { party: healedParty })
      useProfileStore.getState().setProfile({ ...freshProfile, party: healedParty })
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
      position: 'fixed', inset: 0,  // reliable full-screen on iOS Safari
      background: '#1a1a2e', display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Top bar — fixed height, respects iPhone notch/Dynamic Island */}
      <div style={{
        flexShrink: 0, display: 'flex', justifyContent: 'flex-end',
        alignItems: 'center',
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 6, paddingLeft: 12, paddingRight: 12,
        gap: 8,
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
        <button
          onClick={() => setMinimapExpanded(s => !s)}
          className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
            minimapExpanded
              ? 'bg-[#16213e] border-yellow-400/60 text-yellow-400'
              : 'bg-[#16213e] border-gray-600/60 text-gray-500'
          }`}
          title="Toggle map"
        >
          🗺
        </button>
      </div>

      {/* Main area — canvas column fills full width; mini-map floats as overlay on desktop */}
      <div
        ref={mainAreaRef}
        style={{
          flex: 1, minHeight: 0, overflow: 'hidden',
          position: 'relative',
          padding: '0 8px 8px',
        }}
      >

        {/* Canvas column — fills full width so left:50% centers canvas on page */}
        <div
          ref={canvasContainerRef}
          style={{ width: '100%', height: '100%', position: 'relative' }}
        >
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={COLS * TILE}
            height={ROWS * TILE}
            className="border-2 border-yellow-400/30 rounded-xl"
            style={{
              imageRendering: 'pixelated', display: 'block',
              position: 'absolute',
              top: 0, left: '50%',
              transform: 'translateX(-50%)',
              width: canvasCssSize ? canvasCssSize.w : COLS * TILE,
              height: canvasCssSize ? canvasCssSize.h : ROWS * TILE,
            }}
          />

          {/* Area name banner — left-aligned on mobile (mini-map is top-right), centred on desktop */}
          {areaBanner && (
            <div
              key={areaBanner}
              className="absolute left-2 lg:left-1/2 lg:-translate-x-1/2 font-bold text-sm pointer-events-none"
              style={{
                top: 8,
                background: 'rgba(10,16,32,0.85)', border: '1.5px solid #ffd700',
                borderRadius: 8, color: '#ffd700', padding: '4px 14px',
                whiteSpace: 'nowrap', animation: 'fadeBanner 3s ease-out forwards',
                zIndex: 15,
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
              style={{ bottom: 178, zIndex: 15 }}
            >
              {dialogue}
            </div>
          )}

          {/* DPad — always anchored to the bottom of the main area */}
          <div style={{
            position: 'absolute',
            bottom: 'max(16px, env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)', zIndex: 10,
          }}>
            <DPad onMove={(dx, dy) => {
              if (shopOpen) { setShopOpen(false); shopDismissedRef.current = true; return }
              if (dialogue) { setDialogue(null); return }
              move(dx, dy)
            }} />
          </div>

          {/* Mini-map: collapsible floating overlay, all screen sizes */}
          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 20 }}>
            <MiniMap
              currentMapId={currentMapId}
              expanded={minimapExpanded}
              onToggle={() => setMinimapExpanded(s => !s)}
            />
          </div>

        </div>

      </div>

      {shopOpen && profile && (
        <ShopModal
          profile={profile}
          onBuy={handleBuy}
          onClose={() => { setShopOpen(false); shopDismissedRef.current = true }}
        />
      )}

      {worldBagOpen && profile && !pendingWorldItem && (
        <BagMenu
          bag={profile.bag ?? []}
          onUse={(itemId) => {
            setWorldBagOpen(false)
            setPendingWorldItem({ itemId })
          }}
          onClose={() => setWorldBagOpen(false)}
        />
      )}

      {/* Pokémon picker — shown after selecting a bag item */}
      {pendingWorldItem && profile && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center"
          onClick={() => setPendingWorldItem(null)}
        >
          <div
            className="w-full max-w-sm bg-[#0f3460] border-t-2 border-yellow-400 rounded-t-2xl p-4 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-yellow-400 font-bold text-sm">Which Pokémon?</div>
            {(profile.party ?? []).map((mon, idx) => {
              const item = ITEMS.find(i => i.id === pendingWorldItem.itemId)
              const isUsable = item?.effect === 'revive'
                ? (mon.currentHp ?? 0) <= 0
                : (mon.currentHp ?? 0) < mon.maxHp
              const hpPct = mon.maxHp > 0 ? Math.max(0, mon.currentHp / mon.maxHp) : 0
              const hpColor = hpPct > 0.5 ? '#58d040' : hpPct > 0.25 ? '#e8a018' : '#e02820'
              return (
                <button
                  key={idx}
                  disabled={!isUsable}
                  onClick={async () => {
                    if (!item || !profile.id) return
                    let newParty = [...(profile.party ?? [])]
                    if (item.effect === 'heal') {
                      newParty[idx] = { ...newParty[idx], currentHp: Math.min(newParty[idx].maxHp, (newParty[idx].currentHp ?? 0) + item.power) }
                      setDialogue(`${newParty[idx].nickname ?? 'Pokémon'} recovered ${item.power} HP!`)
                    } else if (item.effect === 'revive') {
                      newParty[idx] = { ...newParty[idx], currentHp: Math.floor(newParty[idx].maxHp / 2) }
                      setDialogue(`${newParty[idx].nickname ?? 'Pokémon'} was revived!`)
                    }
                    const newBag = (profile.bag ?? [])
                      .map(b => b.itemId === pendingWorldItem.itemId ? { ...b, qty: b.qty - 1 } : b)
                      .filter(b => b.qty > 0)
                    setPendingWorldItem(null)
                    try {
                      await updateProfile(profile.id, { party: newParty, bag: newBag })
                      useProfileStore.getState().setProfile({ ...profile, party: newParty, bag: newBag })
                    } catch { /* silent */ }
                  }}
                  className="flex items-center gap-3 bg-[#1a1a2e] disabled:opacity-40 rounded-xl px-3 py-2 text-left transition-all hover:bg-[#16213e]"
                >
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.pokemonId}.png`}
                    alt="" style={{ width: 36, height: 36, imageRendering: 'pixelated' }}
                  />
                  <div className="flex-1">
                    <div className="text-white text-sm font-bold">{mon.nickname ?? `#${mon.pokemonId}`} <span className="text-gray-400 text-xs font-normal">Lv{mon.level}</span></div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div style={{ width: `${hpPct * 100}%`, height: '100%', background: hpColor, borderRadius: 9999 }} />
                      </div>
                      <span className="text-xs text-gray-400">{mon.currentHp}/{mon.maxHp}</span>
                    </div>
                  </div>
                </button>
              )
            })}
            <button onClick={() => setPendingWorldItem(null)} className="text-gray-400 text-sm underline text-center">Cancel</button>
          </div>
        </div>
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
