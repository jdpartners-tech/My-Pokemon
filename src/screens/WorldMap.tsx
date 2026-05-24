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

const TILE_FILL: Record<TileType, string> = {
  path: '#c8a878', grass: '#48b048', tree: '#185018',
  water: '#2878c8', building: '#888888', door: '#a05030', gym: '#c8b850',
}

const pokemonMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p])
) as Record<number, PokemonData>

// Pre-load sprite sheets once at module level, with chroma-key transparency fix.
// Some GIFs (fr_heroine.gif) have a solid background not marked as transparent in
// the GIF color table — applyChromaKey samples the top-left pixel and makes it alpha=0.
const OW_SHEETS: Record<string, HTMLImageElement> = {}
const OW_CANVASES: Record<string, HTMLCanvasElement | null> = { male: null, female: null }

function applyChromaKey(img: HTMLImageElement): HTMLCanvasElement {
  const oc = document.createElement('canvas')
  oc.width = img.naturalWidth; oc.height = img.naturalHeight
  const octx = oc.getContext('2d')!
  octx.drawImage(img, 0, 0)
  const id = octx.getImageData(0, 0, oc.width, oc.height)
  const d = id.data
  if (d[3] === 0) return oc // top-left already transparent — GIF is fine
  const bgR = d[0], bgG = d[1], bgB = d[2]
  for (let i = 0; i < d.length; i += 4) {
    if (Math.abs(d[i] - bgR) < 20 && Math.abs(d[i+1] - bgG) < 20 && Math.abs(d[i+2] - bgB) < 20)
      d[i+3] = 0
  }
  octx.putImageData(id, 0, 0)
  return oc
}

;['male', 'female'].forEach(gender => {
  const img = new Image()
  const base = import.meta.env.BASE_URL
  img.src = gender === 'female' ? `${base}fr_heroine.gif` : `${base}fr_hero.gif`
  OW_SHEETS[gender] = img
})

export default function WorldMap() {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.profile)
  const { updateProfile } = useFirestoreProfile()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentMapId, setCurrentMapId] = useState('pallet')
  const [px, setPx] = useState(7)
  const [py, setPy] = useState(6)
  const [dialogue, setDialogue] = useState<string | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const mapRef = useRef<MapData>(getMap('pallet'))

  useEffect(() => { if (!profile) navigate('/') }, [profile, navigate])

  const drawMap = useCallback((playerX: number, playerY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const map = mapRef.current
    const hw = Math.floor(COLS / 2)
    const hh = Math.floor(ROWS / 2)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let vy = 0; vy < ROWS; vy++) {
      for (let vx = 0; vx < COLS; vx++) {
        const mx = playerX - hw + vx
        const my = playerY - hh + vy
        const tile = (my >= 0 && my < map.height && mx >= 0 && mx < map.width)
          ? map.tiles[my][mx] : 'tree'
        ctx.fillStyle = TILE_FILL[tile]
        ctx.fillRect(vx * TILE, vy * TILE, TILE, TILE)
        if (tile === 'grass') {
          ctx.fillStyle = '#389038'
          ctx.font = `${TILE * 0.55}px monospace`
          ctx.textAlign = 'center'
          ctx.fillText('ʷ', vx * TILE + TILE / 2, vy * TILE + TILE * 0.72)
        }
      }
    }

    for (const t of map.trainers) {
      const vx = t.x - playerX + hw
      const vy = t.y - playerY + hh
      if (vx >= 0 && vx < COLS && vy >= 0 && vy < ROWS) {
        ctx.font = `${TILE * 0.7}px serif`
        ctx.textAlign = 'center'
        ctx.fillText('🧑', vx * TILE + TILE / 2, vy * TILE + TILE * 0.8)
      }
    }

    // Draw player from sprite sheet — front-facing walking frame, pixelated.
    // fr_hero.gif:    front-facing sprite starts at sx=28, sy=35, sw=16, sh=22
    // fr_heroine.gif: front-facing sprite starts at sx=13, sy=14, sw=16, sh=28
    const gender = profile?.gender === 'female' ? 'female' : 'male'
    const isFemale = gender === 'female'
    const rawSheet = OW_SHEETS[gender]
    if (rawSheet.complete && rawSheet.naturalWidth > 0 && !OW_CANVASES[gender]) {
      OW_CANVASES[gender] = applyChromaKey(rawSheet)
    }
    const sx = isFemale ? 13 : 28
    const sy = isFemale ? 14 : 35
    const sw = 16
    const sh = isFemale ? 28 : 22
    const dw = TILE * 1.4, dh = TILE * 1.8
    const dx = hw * TILE + TILE / 2 - dw / 2
    const dy = hh * TILE + TILE / 2 - dh / 2
    const owCanvas = OW_CANVASES[gender]
    if (owCanvas) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(owCanvas, sx, sy, sw, sh, dx, dy, dw, dh)
    } else {
      ctx.font = `${TILE * 0.7}px serif`
      ctx.textAlign = 'center'
      ctx.fillText(isFemale ? '👧' : '🧒', hw * TILE + TILE / 2, hh * TILE + TILE * 0.8)
      rawSheet.onload = () => drawMap(px, py)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.gender, px, py])

  useEffect(() => {
    mapRef.current = getMap(currentMapId)
    drawMap(px, py)
  }, [currentMapId, px, py, drawMap])

  const move = useCallback((dx: number, dy: number) => {
    const map = mapRef.current
    setPx(prevPx => {
      setPy(prevPy => {
        const nx = prevPx + dx
        const ny = prevPy + dy
        if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) return prevPy
        const tile = map.tiles[ny][nx]
        if (tile === 'tree' || tile === 'building' || tile === 'water') return prevPy

        const exit = map.exits.find(e => e.x === nx && e.y === ny)
        if (exit) {
          setCurrentMapId(exit.targetMap)
          setDialogue(null)
          // Use setTimeout to update after state settles
          setTimeout(() => {
            setPx(exit.targetX)
            setPy(exit.targetY)
          }, 0)
          return prevPy
        }

        const door = map.doors.find(d => d.x === nx && d.y === ny)
        if (door?.type === 'pokecenter') {
          setDialogue("Nurse Joy: Welcome! We'll restore your Pokémon to full health. ♥")
          setTimeout(() => healParty(), 1200)
          return prevPy
        }
        if (door?.type === 'pokemart') {
          setShopOpen(true)
          return prevPy
        }

        for (const trainer of map.trainers) {
          if (
            trainer.direction === 'down' &&
            trainer.x === nx &&
            ny > trainer.y &&
            ny <= trainer.y + 3
          ) {
            setDialogue(`${trainer.name} wants to battle!`)
            setTimeout(() => startTrainerBattle(trainer), 1500)
            return prevPy
          }
        }

        if (tile === 'grass' && Math.random() < ENCOUNTER_RATE) {
          setTimeout(() => startWildBattle(prevPx + dx, prevPy + dy), 0)
        }

        return ny
      })
      return prevPx + dx
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
  }, [dialogue, move])

  function startWildBattle(playerX: number, playerY: number) {
    const map = mapRef.current
    if (!profile?.party?.length || !map.wildPokemon.length) return
    const tile = map.tiles[playerY]?.[playerX]
    if (tile !== 'grass') return
    const total = map.wildPokemon.reduce((s, w) => s + w.rate, 0)
    let roll = Math.random() * total
    let wild = map.wildPokemon[0]
    for (const w of map.wildPokemon) { roll -= w.rate; if (roll <= 0) { wild = w; break } }
    const level = wild.minLevel + Math.floor(Math.random() * (wild.maxLevel - wild.minLevel + 1))
    const opponentInfo = pokemonMap[wild.pokemonId]
    if (!opponentInfo) return
    const opponent = buildPartyPokemon(opponentInfo, level)
    const playerInfo = pokemonMap[profile.party[0].pokemonId]
    if (!playerInfo) return
    const player = buildPartyPokemon(playerInfo, profile.party[0].level)
    player.currentHp = profile.party[0].currentHp ?? player.maxHp
    useBattleStore.getState().startWildBattle(player, opponent)
    navigate('/battle')
  }

  function startTrainerBattle(trainer: TrainerNpc) {
    if (!profile?.party?.length) return
    const firstEnemy = trainer.party[0]
    const opponentInfo = pokemonMap[firstEnemy.pokemonId]
    if (!opponentInfo) return
    const opponent = buildPartyPokemon(opponentInfo, firstEnemy.level)
    const playerInfo = pokemonMap[profile.party[0].pokemonId]
    if (!playerInfo) return
    const player = buildPartyPokemon(playerInfo, profile.party[0].level)
    player.currentHp = profile.party[0].currentHp ?? player.maxHp
    useBattleStore.getState().startTrainerBattle(player, opponent, trainer.name)
    setTimeout(() => navigate('/battle'), 500)
  }

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
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center gap-4 p-4">
      <div className="flex justify-between items-center w-full max-w-sm">
        <span className="text-yellow-400 font-bold">{mapRef.current.name}</span>
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
        style={{ imageRendering: 'pixelated' }}
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
          onClose={() => setShopOpen(false)}
        />
      )}
    </div>
  )
}
