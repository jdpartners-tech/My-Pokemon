import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBattleStore } from '../store/battleStore'
import { useBattleEngine } from '../hooks/useBattleEngine'
import { useProfileStore } from '../store/profileStore'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import BagMenu from '../components/BagMenu'
import movesJson from '../data/moves.json'
import pokemonJson from '../data/pokemon.json'
import { MoveData, PokemonData } from '../types/game'
import { expForLevel, calculateStat } from '../utils/exp'
import { getTypeEffectiveness } from '../utils/damage'
import { TRAINER_BATTLE_PICS } from '../data/trainerPics'

const moveDataMap = Object.fromEntries(
  (movesJson as MoveData[]).map(m => [m.id, m])
) as Record<string, MoveData>

const pokemonDataMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p])
) as Record<number, PokemonData>

const TYPE_COLOR: Record<string, string> = {
  normal: '#a0a070', fire: '#f07830', water: '#6890f0', grass: '#78c850',
  electric: '#f8d030', ice: '#98d8d8', fighting: '#c03028', poison: '#a040a0',
  ground: '#e0c068', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820',
  rock: '#b8a038', ghost: '#705898', dragon: '#7038f8', dark: '#705848',
  steel: '#b8b8d0', fairy: '#ee99ac',
}

// ── canvas helpers ────────────────────────────────────────────────────────────
function hpBarColor(current: number, max: number) {
  const pct = max > 0 ? current / max : 0
  return pct > 0.5 ? '#58d040' : pct > 0.25 ? '#e8a018' : '#e02820'
}

function pokeName(p: { pokemonId: number; nickname: string | null }) {
  return (p.nickname || pokemonDataMap[p.pokemonId]?.name || `#${p.pokemonId}`).toUpperCase()
}

// Draw a Pokéball at (bx, by) with radius r on a canvas context.
// open=true adds sparkles at the given sparkleAngle.
function drawPokeball(
  ctx: CanvasRenderingContext2D,
  bx: number, by: number, r: number,
  open = false, sparkleAngle = 0
) {
  ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2)
  ctx.fillStyle = open ? '#888' : '#e82020'; ctx.fill()
  ctx.strokeStyle = '#181818'; ctx.lineWidth = Math.max(1, r * 0.15); ctx.stroke()

  ctx.beginPath(); ctx.arc(bx, by, r, Math.PI, 0)
  ctx.fillStyle = '#f8f8f8'; ctx.fill()

  ctx.beginPath(); ctx.moveTo(bx - r, by); ctx.lineTo(bx + r, by)
  ctx.strokeStyle = '#181818'; ctx.lineWidth = Math.max(1, r * 0.15); ctx.stroke()

  ctx.beginPath(); ctx.arc(bx, by, r * 0.28, 0, Math.PI * 2)
  ctx.fillStyle = '#f8f8f8'; ctx.fill()
  ctx.strokeStyle = '#181818'; ctx.lineWidth = 1; ctx.stroke()

  if (open) {
    ctx.fillStyle = '#ffd700'
    for (let a = 0; a < 8; a++) {
      const ang = sparkleAngle + (a / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(bx + Math.cos(ang) * r * 1.7, by + Math.sin(ang) * r * 1.7, r * 0.18, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ── constants matching the mockup's Ruby layout ───────────────────────────────
const W = 360
const SKY_H = 240  // top 48% of 500px
const MONO = "'Courier New', monospace"

const NPC_BATTLE_PICS = TRAINER_BATTLE_PICS
const MENU_BG = '#f0ece8'

function ChromaKeyImg({ src, height, style }: { src: string, height: number, style?: React.CSSProperties }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      const c = canvasRef.current
      if (!c) return
      c.width = img.naturalWidth; c.height = img.naturalHeight
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const id = ctx.getImageData(0, 0, c.width, c.height)
      const d = id.data; const W = c.width, H = c.height
      if (d[3] === 0) return
      const visited = new Uint8Array(W * H)
      const stack: number[] = []
      for (const ci of [0, W-1, (H-1)*W, (H-1)*W+W-1]) {
        if (visited[ci] || d[ci*4+3] === 0) continue
        const [bgR, bgG, bgB] = [d[ci*4], d[ci*4+1], d[ci*4+2]]
        visited[ci] = 1; stack.push(ci)
        while (stack.length) {
          const idx = stack.pop()!; d[idx*4+3] = 0
          const x = idx % W, y = (idx/W)|0
          for (const ni of [x>0?idx-1:-1, x<W-1?idx+1:-1, y>0?idx-W:-1, y<H-1?idx+W:-1]) {
            if (ni < 0 || visited[ni]) continue
            const dr = d[ni*4]-bgR, dg = d[ni*4+1]-bgG, db = d[ni*4+2]-bgB
            if (Math.sqrt(dr*dr+dg*dg+db*db) <= 40) { visited[ni] = 1; stack.push(ni) }
          }
        }
      }
      ctx.putImageData(id, 0, 0)
    }
    img.src = src
  }, [src])
  return <canvas ref={canvasRef} style={{ height, width: 'auto', imageRendering: 'pixelated', ...style }} />
}
const MENU_BD = '#282818'
const MOVE_W = 201  // Math.floor(360 * 0.56) exact
const DLG_H = 34

// Bezier ball throw arc: player hand → opponent sprite centre
const BALL_X0 = W * 0.20, BALL_Y0 = SKY_H * 0.88   // player hand
const BALL_X1 = W * 0.72, BALL_Y1 = SKY_H * 0.29   // opponent centre
const BALL_MX = (BALL_X0 + BALL_X1) / 2, BALL_MY = SKY_H * 0.06  // bezier peak

function bezier(t: number) {
  return {
    x: (1-t)*(1-t)*BALL_X0 + 2*(1-t)*t*BALL_MX + t*t*BALL_X1,
    y: (1-t)*(1-t)*BALL_Y0 + 2*(1-t)*t*BALL_MY + t*t*BALL_Y1,
  }
}

// Phase durations in ms — match mockup timings
const BALL_PHASE_MS = [600, 700, 250, 700, 900, 500]

// ── Move type → arena tint colour ─────────────────────────────────────────
const TYPE_TINT: Record<string, string> = {
  fire:     'rgba(255,80,0,0.18)',
  water:    'rgba(60,140,255,0.18)',
  electric: 'rgba(255,220,0,0.18)',
  grass:    'rgba(60,200,60,0.18)',
  ice:      'rgba(180,240,255,0.18)',
  psychic:  'rgba(255,80,180,0.18)',
  poison:   'rgba(160,40,200,0.18)',
  ghost:    'rgba(60,0,100,0.22)',
  dragon:   'rgba(180,40,0,0.18)',
  dark:     'rgba(20,0,40,0.25)',
  rock:     'rgba(160,110,40,0.18)',
  ground:   'rgba(180,140,60,0.18)',
  flying:   'rgba(180,220,255,0.15)',
  steel:    'rgba(180,180,200,0.18)',
  fairy:    'rgba(255,140,200,0.18)',
  bug:      'rgba(140,200,0,0.18)',
  normal:   'rgba(255,255,255,0.12)',
  fighting: 'rgba(255,200,80,0.18)',
}

const CONTACT_TYPES = new Set(['normal', 'fighting'])

// ── Projectile animation renderer (pure, no hooks) ────────────────────────
// p = 0→1 progress. Contact types draw slash marks at (x1,y1).
// Ranged types arc a type-coloured projectile from (x0,y0) to (x1,y1).
function drawProjectile(
  ctx: CanvasRenderingContext2D,
  type: string,
  x0: number, y0: number,
  x1: number, y1: number,
  p: number
) {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  if (CONTACT_TYPES.has(type)) {
    const col = type === 'fighting' ? 'rgba(255,200,80,' : 'rgba(255,255,255,'
    const expand = Math.min(1, p * 2.5)
    const fade = Math.max(0, 1 - p * 1.2)
    const angles = [-0.6, 0, 0.6]
    for (const a of angles) {
      const len = 28 * expand
      ctx.save()
      ctx.translate(x1, y1)
      ctx.rotate(Math.PI / 4 + a)
      ctx.strokeStyle = col + fade + ')'
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-len / 2, 0)
      ctx.lineTo(len / 2, 0)
      ctx.stroke()
      ctx.restore()
    }
    return
  }

  const arcDir = y1 < y0 ? -1 : 1
  const arcH = 22
  const bx = lerp(x0, x1, p)
  const by = lerp(y0, y1, p) - arcH * Math.sin(p * Math.PI) * arcDir

  type TypeColors = { ball: string; core: string; trail: string }
  const colors: Record<string, TypeColors> = {
    fire:     { ball: '#ff5000', core: '#ffcc00', trail: '#ff8000' },
    water:    { ball: '#3090ff', core: '#a0d8ff', trail: '#60b0ff' },
    electric: { ball: '#ffe000', core: '#ffffff', trail: '#ffd000' },
    grass:    { ball: '#40c840', core: '#c0ffc0', trail: '#60e060' },
    ice:      { ball: '#a0e8ff', core: '#ffffff', trail: '#c0f0ff' },
    psychic:  { ball: '#ff50b4', core: '#ffc0e8', trail: '#ff80c8' },
    poison:   { ball: '#a028c8', core: '#e080ff', trail: '#c050e0' },
    ghost:    { ball: '#400060', core: '#9040c0', trail: '#600090' },
    dragon:   { ball: '#e04000', core: '#ff8000', trail: '#c800c8' },
    dark:     { ball: '#181028', core: '#604080', trail: '#301848' },
    rock:     { ball: '#a07028', core: '#d0b060', trail: '#c09040' },
    ground:   { ball: '#b48c3c', core: '#e8c870', trail: '#c8a050' },
    flying:   { ball: '#b4dcff', core: '#ffffff', trail: '#d0ecff' },
    steel:    { ball: '#b4b4c8', core: '#e0e0f0', trail: '#c8c8dc' },
    fairy:    { ball: '#ff8cc8', core: '#ffd0e8', trail: '#ffaad8' },
    bug:      { ball: '#8cc800', core: '#d0ff60', trail: '#aae010' },
  }
  const c = colors[type] ?? { ball: '#ffffff', core: '#ffffff', trail: '#dddddd' }

  const TRAIL_STEPS = 6
  for (let i = TRAIL_STEPS; i >= 1; i--) {
    const tp = Math.max(0, p - i * 0.055)
    const tx = lerp(x0, x1, tp)
    const ty = lerp(y0, y1, tp) - arcH * Math.sin(tp * Math.PI) * arcDir
    const alpha = (1 - i / TRAIL_STEPS) * (1 - p * 0.4) * 0.65
    const radius = Math.max(1, (7 - i) * (1 - p * 0.3))
    const tr = parseInt(c.trail.slice(1, 3), 16)
    const tg = parseInt(c.trail.slice(3, 5), 16)
    const tb2 = parseInt(c.trail.slice(5, 7), 16)
    ctx.beginPath()
    ctx.arc(tx, ty, radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${tr},${tg},${tb2},${alpha.toFixed(2)})`
    ctx.fill()
  }

  const ballR = 7
  ctx.beginPath()
  ctx.arc(bx, by, ballR, 0, Math.PI * 2)
  ctx.fillStyle = c.ball
  ctx.fill()
  ctx.beginPath()
  ctx.arc(bx - 2, by - 2, ballR * 0.45, 0, Math.PI * 2)
  ctx.fillStyle = c.core
  ctx.fill()
}

// ── type-based hit effect renderer (pure, no hooks) ──────────────────────────
function drawHitEffect(ctx: CanvasRenderingContext2D, type: string, cx: number, cy: number, p: number) {
  const ease = 1 - Math.pow(1 - p, 2)
  const r = 42 * ease
  switch (type) {
    case 'fire': {
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(255,${80+i*50},0,${(1-p)*(0.9-i*0.2)})`
        ctx.lineWidth = 4 - i
        ctx.beginPath(); ctx.arc(cx, cy, r*(0.4+i*0.3), 0, Math.PI*2); ctx.stroke()
      }
      for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2
        ctx.fillStyle = `rgba(255,180,0,${1-p})`
        ctx.beginPath(); ctx.arc(cx+Math.cos(a)*r*1.3, cy+Math.sin(a)*r*1.3, 3*(1-p), 0, Math.PI*2); ctx.fill()
      }
      break
    }
    case 'water': {
      for (let i = 0; i < 3; i++) {
        const pp = Math.max(0, (p - i*0.15) / (1 - i*0.15))
        if (pp <= 0) continue
        ctx.strokeStyle = `rgba(80,160,255,${0.9*(1-pp)})`
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.arc(cx, cy, 36*pp, 0, Math.PI*2); ctx.stroke()
      }
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2
        ctx.fillStyle = `rgba(100,190,255,${0.8*(1-p)})`
        ctx.beginPath(); ctx.arc(cx+Math.cos(a)*r*0.8, cy+Math.sin(a)*r*0.8, 4*(1-p*0.5), 0, Math.PI*2); ctx.fill()
      }
      break
    }
    case 'electric': {
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2
        const len = 32*ease
        ctx.strokeStyle = `rgba(255,220,0,${1-p*0.8})`; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(cx, cy)
        ctx.lineTo(cx+Math.cos(a+0.3)*len*0.4, cy+Math.sin(a+0.3)*len*0.4)
        ctx.lineTo(cx+Math.cos(a-0.3)*len*0.7, cy+Math.sin(a-0.3)*len*0.7)
        ctx.lineTo(cx+Math.cos(a)*len, cy+Math.sin(a)*len); ctx.stroke()
      }
      ctx.fillStyle = `rgba(255,255,150,${(1-p)*0.6})`
      ctx.beginPath(); ctx.arc(cx, cy, 12*(1-p), 0, Math.PI*2); ctx.fill()
      break
    }
    case 'grass': {
      for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2 + p*Math.PI
        ctx.fillStyle = `rgba(80,200,80,${1-p})`
        ctx.save(); ctx.translate(cx+Math.cos(a)*r*1.1, cy+Math.sin(a)*r*1.1); ctx.rotate(a+p*Math.PI*2)
        ctx.beginPath(); ctx.ellipse(0, 0, 6*(1-p*0.3), 3*(1-p*0.3), 0, 0, Math.PI*2); ctx.fill(); ctx.restore()
      }
      break
    }
    case 'ice': {
      for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2
        const len = 32*ease
        ctx.strokeStyle = `rgba(180,240,255,${1-p})`; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx+Math.cos(a)*len, cy+Math.sin(a)*len); ctx.stroke()
        if (i%2===0) {
          const mx = cx+Math.cos(a)*len*0.6, my = cy+Math.sin(a)*len*0.6
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(mx+Math.cos(a+Math.PI/2)*7, my+Math.sin(a+Math.PI/2)*7)
          ctx.lineTo(mx+Math.cos(a-Math.PI/2)*7, my+Math.sin(a-Math.PI/2)*7); ctx.stroke()
        }
      }
      ctx.strokeStyle = `rgba(200,245,255,${0.7*(1-p)})`; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(cx, cy, 22*ease, 0, Math.PI*2); ctx.stroke()
      break
    }
    case 'psychic': {
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = `rgba(255,100,180,${0.8*(1-p)*(1-i*0.2)})`; ctx.lineWidth = 3-i
        ctx.beginPath(); ctx.ellipse(cx, cy, (10+i*13)*ease, (4+i*5)*ease, p*Math.PI*(i+1)*0.5, 0, Math.PI*2); ctx.stroke()
      }
      ctx.fillStyle = `rgba(255,80,200,${0.5*(1-p)})`
      ctx.beginPath(); ctx.arc(cx, cy, 10*(1-p), 0, Math.PI*2); ctx.fill()
      break
    }
    case 'fighting': {
      ctx.strokeStyle = `rgba(255,200,80,${1-p})`; ctx.lineWidth = 3
      for (let i = 0; i < 3; i++) {
        const off = (i-1)*12
        ctx.beginPath(); ctx.moveTo(cx-20+off, cy-20); ctx.lineTo(cx+20+off, cy+20); ctx.stroke()
      }
      ctx.strokeStyle = `rgba(255,240,150,${(1-p)*0.6})`; ctx.lineWidth = 8
      ctx.beginPath(); ctx.moveTo(cx-22, cy-22); ctx.lineTo(cx+22, cy+22); ctx.stroke()
      break
    }
    case 'poison': {
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2
        ctx.strokeStyle = `rgba(180,60,200,${1-p})`; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(cx+Math.cos(a)*r*0.8, cy+Math.sin(a)*r*0.8-10*p, 5*(1-p*0.5), 0, Math.PI*2); ctx.stroke()
      }
      ctx.fillStyle = `rgba(160,40,180,${0.4*(1-p)})`
      ctx.beginPath(); ctx.arc(cx, cy, 20*ease, 0, Math.PI*2); ctx.fill()
      break
    }
    case 'ground': {
      for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2
        ctx.fillStyle = `rgba(180,120,40,${1-p})`
        ctx.fillRect(cx+Math.cos(a)*r-4*(1-p), cy+Math.sin(a)*r-4*(1-p), 8*(1-p), 8*(1-p))
      }
      ctx.fillStyle = `rgba(200,160,80,${0.35*(1-p)})`
      ctx.beginPath(); ctx.arc(cx, cy, 26*ease, 0, Math.PI*2); ctx.fill()
      break
    }
    case 'flying': {
      ctx.strokeStyle = `rgba(200,230,255,${1-p})`; ctx.lineWidth = 2.5
      for (let i = 0; i < 3; i++) {
        const off = (i-1)*10
        ctx.beginPath(); ctx.moveTo(cx-25, cy+off-10)
        ctx.quadraticCurveTo(cx, cy+off-20*ease, cx+25, cy+off-10); ctx.stroke()
      }
      break
    }
    case 'rock': {
      for (let i = 0; i < 6; i++) {
        const a = (i/6)*Math.PI*2
        ctx.fillStyle = `rgba(160,120,60,${1-p})`
        ctx.save(); ctx.translate(cx+Math.cos(a)*r, cy+Math.sin(a)*r); ctx.rotate(a*2+p)
        ctx.beginPath(); ctx.moveTo(0,-6*(1-p)); ctx.lineTo(5*(1-p),4*(1-p)); ctx.lineTo(-5*(1-p),4*(1-p)); ctx.closePath(); ctx.fill(); ctx.restore()
      }
      break
    }
    case 'ghost': {
      for (let i = 0; i < 5; i++) {
        const rot = p*Math.PI*2+(i/5)*Math.PI*2
        ctx.fillStyle = `rgba(80,0,120,${0.6*(1-p)})`
        ctx.beginPath(); ctx.arc(cx+Math.cos(rot)*r*0.7, cy+Math.sin(rot)*r*0.7, 7*(1-p), 0, Math.PI*2); ctx.fill()
      }
      ctx.fillStyle = `rgba(30,0,60,${0.3*(1-p)})`
      ctx.beginPath(); ctx.arc(cx, cy, 30*ease, 0, Math.PI*2); ctx.fill()
      break
    }
    case 'dragon': {
      const dcolors = ['255,80,0','200,0,200','0,100,255']
      for (let c = 0; c < 3; c++) {
        const rot = p*Math.PI*3+(c/3)*Math.PI*2
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = `rgba(${dcolors[c]},${(1-p)*0.7})`
          ctx.beginPath(); ctx.arc(cx+Math.cos(rot+i*0.5)*r*(0.3+i*0.2), cy+Math.sin(rot+i*0.5)*r*(0.3+i*0.2), 5*(1-p), 0, Math.PI*2); ctx.fill()
        }
      }
      break
    }
    case 'dark': {
      ctx.strokeStyle = `rgba(40,0,80,${1-p*0.5})`; ctx.lineWidth = 4
      for (let i = 0; i < 3; i++) {
        const off = (i-1)*14
        ctx.beginPath(); ctx.moveTo(cx-22+off, cy+22-off); ctx.lineTo(cx+22+off, cy-22-off); ctx.stroke()
      }
      break
    }
    case 'steel': {
      for (let i = 0; i < 8; i++) {
        const a = (i/8)*Math.PI*2
        ctx.fillStyle = `rgba(200,200,220,${1-p})`
        ctx.save(); ctx.translate(cx+Math.cos(a)*r, cy+Math.sin(a)*r); ctx.rotate(a)
        ctx.fillRect(-2, -6*(1-p), 4, 12*(1-p)); ctx.restore()
      }
      break
    }
    case 'fairy': {
      for (let i = 0; i < 10; i++) {
        const a = (i/10)*Math.PI*2+p*Math.PI*2
        const dist = r*(0.4+0.6*p)
        ctx.fillStyle = `rgba(255,160,200,${1-p})`
        ctx.beginPath(); ctx.arc(cx+Math.cos(a)*dist, cy+Math.sin(a)*dist, 4*(1-p*0.5), 0, Math.PI*2); ctx.fill()
      }
      break
    }
    default: {
      ctx.strokeStyle = `rgba(255,255,255,${1-p})`; ctx.lineWidth = 5
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke()
    }
  }
}

// ── component ─────────────────────────────────────────────────────────────────
export default function Battle() {
  const navigate = useNavigate()
  const {
    playerPokemon, opponentPokemon, phase, question, selectedMoveIndex, log,
    expAnimating, leveledUp, playerAttacking, opponentFlash, shakeX,
    opponentAttacking, playerFlash, playerShakeX,
    isWildBattle, ballAnimPhase, ballCaught, party, answerResult,
    trainerSpriteCol, trainerSpriteRow,
    damagePopup, battleBanner, trainerName,
  } = useBattleStore()
  const { selectMove, handleAnswer, useItemInBattle, attemptCatch, switchToPartyMember } = useBattleEngine()
  const profile = useProfileStore(s => s.profile)
  const { updateProfile } = useFirestoreProfile()

  function handleEscape() {
    const { playerPokemon, party: battleBench, partyIndexMap } = useBattleStore.getState()
    const profileNow = useProfileStore.getState().profile ?? profile
    if (profileNow?.id && playerPokemon) {
      const origParty = profileNow.party ?? []
      const updatedParty = origParty.map(p => ({ ...p }))
      const activeIdx = partyIndexMap[0] ?? 0
      if (updatedParty[activeIdx]) {
        updatedParty[activeIdx] = { ...updatedParty[activeIdx], currentHp: playerPokemon.currentHp }
      }
      battleBench.forEach((benchMon, i) => {
        const profIdx = partyIndexMap[i + 1]
        if (profIdx !== undefined && updatedParty[profIdx]) {
          updatedParty[profIdx] = { ...updatedParty[profIdx], currentHp: benchMon.currentHp }
        }
      })
      useProfileStore.getState().setProfile({ ...profileNow, party: updatedParty })
      updateProfile(profileNow.id, { party: updatedParty }).catch(e => console.error('escape save failed:', e))
    }
    navigate('/map')
  }
  const [bagOpen, setBagOpen] = useState(false)
  const [, setFlashOn] = useState(false)
  const [safeAreaTop, setSafeAreaTop] = useState(0)
  const [safeAreaBottom, setSafeAreaBottom] = useState(0)
  useEffect(() => {
    const topEl = document.createElement('div')
    topEl.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;padding-top:env(safe-area-inset-top,0px)'
    document.body.appendChild(topEl)
    setSafeAreaTop(parseFloat(getComputedStyle(topEl).paddingTop) || 0)
    document.body.removeChild(topEl)
    const botEl = document.createElement('div')
    botEl.style.cssText = 'position:fixed;bottom:0;left:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px)'
    document.body.appendChild(botEl)
    setSafeAreaBottom(parseFloat(getComputedStyle(botEl).paddingBottom) || 0)
    document.body.removeChild(botEl)
  }, [])
  const ballCanvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const hitCanvasRef = useRef<HTMLCanvasElement>(null)
  const hitRafRef = useRef<number>(0)
  const hitEffect = useBattleStore(s => s.hitEffect)
  const projCanvasRef = useRef<HTMLCanvasElement>(null)
  const projRafRef = useRef<number>(0)
  const arenaTintRef = useRef<HTMLDivElement>(null)
  const projectileAnim = useBattleStore(s => s.projectileAnim)

  // HP shake on big hits
  const prevOpponentHpRef = useRef(opponentPokemon?.currentHp ?? 0)
  const [opponentHpShake, setOpponentHpShake] = useState(false)

  // Clear damage popup after 1.2s
  useEffect(() => {
    if (!damagePopup) return
    const t = setTimeout(() => useBattleStore.getState().clearDamagePopup(), 1200)
    return () => clearTimeout(t)
  }, [damagePopup?.id])

  // HP shake effect
  const handleOpponentHpShake = useCallback(() => {
    setOpponentHpShake(true)
    setTimeout(() => setOpponentHpShake(false), 400)
  }, [])

  useEffect(() => {
    if (!opponentPokemon) return
    const prev = prevOpponentHpRef.current
    const curr = opponentPokemon.currentHp
    if (curr < prev && opponentPokemon.maxHp > 0 && (prev - curr) / opponentPokemon.maxHp > 0.05) {
      handleOpponentHpShake()
    }
    prevOpponentHpRef.current = curr
  }, [opponentPokemon?.currentHp, handleOpponentHpShake])

  useEffect(() => { if (phase === 'idle') navigate('/map') }, [phase, navigate])

  // Evolution animation state: 'silhouette' → 'flash' → 'reveal' → done
  const [evoStage, setEvoStage] = useState<'none' | 'silhouette' | 'flash' | 'reveal'>('none')
  useEffect(() => {
    if (phase !== 'evolving') { setEvoStage('none'); setFlashOn(false); return }
    const timers: ReturnType<typeof setTimeout>[] = []
    // Stage 1: sprite turns white silhouette and pulses (0–1600ms)
    setEvoStage('silhouette')
    // Stage 2: white flash bursts at peak (1600ms)
    timers.push(setTimeout(() => { setFlashOn(true); setEvoStage('flash') }, 1600))
    // Stage 3: flash off, reveal new evolved sprite with glow (1900ms)
    timers.push(setTimeout(() => { setFlashOn(false); setEvoStage('reveal') }, 1900))
    // Stage 4: glow fades out (2800ms)
    timers.push(setTimeout(() => setEvoStage('none'), 2800))
    return () => timers.forEach(clearTimeout)
  }, [phase])

  // Hit effect animation
  useEffect(() => {
    if (!hitEffect) return
    const canvas = hitCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    cancelAnimationFrame(hitRafRef.current)
    const cx = hitEffect.forOpponent ? 259 : 90
    const cy = hitEffect.forOpponent ? 85 : 170
    const durationMs = 520
    const startTs = performance.now()
    function frame(ts: number) {
      const p = Math.min(1, (ts - startTs) / durationMs)
      ctx.clearRect(0, 0, W, SKY_H)
      drawHitEffect(ctx, hitEffect!.moveType, cx, cy, p)
      if (p < 1) hitRafRef.current = requestAnimationFrame(frame)
      else { ctx.clearRect(0, 0, W, SKY_H); useBattleStore.getState().clearHitEffect() }
    }
    hitRafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(hitRafRef.current)
  }, [hitEffect])

  // Projectile animation
  useEffect(() => {
    if (!projectileAnim) {
      const canvas = projCanvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, W, SKY_H)
      }
      if (arenaTintRef.current) arenaTintRef.current.style.opacity = '0'
      return
    }

    const canvas = projCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    cancelAnimationFrame(projRafRef.current)

    const x0 = projectileAnim.forOpponent ? 90  : 259
    const y0 = projectileAnim.forOpponent ? 140 : 55
    const x1 = projectileAnim.forOpponent ? 259 : 90
    const y1 = projectileAnim.forOpponent ? 85  : 170

    const DURATION_MS = 450
    const startTs = performance.now()

    function frame(ts: number) {
      const p = Math.min(1, (ts - startTs) / DURATION_MS)

      ctx.clearRect(0, 0, W, SKY_H)
      drawProjectile(ctx, projectileAnim!.moveType, x0, y0, x1, y1, p)

      let tintOpacity = 0
      if (p < 0.4) tintOpacity = p / 0.4
      else if (p < 0.9) tintOpacity = 1
      else tintOpacity = (1 - p) / 0.1
      if (arenaTintRef.current) {
        arenaTintRef.current.style.opacity = String(Math.min(1, tintOpacity))
      }

      if (p < 1) {
        projRafRef.current = requestAnimationFrame(frame)
      } else {
        ctx.clearRect(0, 0, W, SKY_H)
        if (arenaTintRef.current) arenaTintRef.current.style.opacity = '0'
      }
    }

    projRafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(projRafRef.current)
  }, [projectileAnim])

  // Trainer intro: show trainer (1.2s) → throw ball (0.8s) → Pokémon appears
  const [trainerThrowBall, setTrainerThrowBall] = useState(false)
  useEffect(() => {
    if (phase !== 'trainer_intro') { setTrainerThrowBall(false); return }
    const t1 = setTimeout(() => setTrainerThrowBall(true), 1200)
    const t2 = setTimeout(() => useBattleStore.getState().setPhase('player_turn'), 2400)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [phase])

  // Ball throw canvas animation
  useEffect(() => {
    const canvas = ballCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    cancelAnimationFrame(rafRef.current)

    if (ballAnimPhase === 0) {
      ctx.clearRect(0, 0, W, SKY_H)
      return
    }

    const durationMs = BALL_PHASE_MS[ballAnimPhase - 1] ?? 500
    const startTs = performance.now()

    function frame(ts: number) {
      const p = Math.min(1, (ts - startTs) / durationMs)
      ctx.clearRect(0, 0, W, SKY_H)

      if (ballAnimPhase === 1) {
        // Flying arc — ball spins along bezier curve
        const pos = bezier(p)
        ctx.save()
        ctx.translate(pos.x, pos.y)
        ctx.rotate(p * Math.PI * 5)
        drawPokeball(ctx, 0, 0, 9)
        ctx.restore()
      } else if (ballAnimPhase === 2) {
        // Ball opens with flash sparkles
        drawPokeball(ctx, BALL_X1, BALL_Y1, 14, true, p * Math.PI)
      } else if (ballAnimPhase === 3) {
        // Ball shakes left-right 3 times
        const sx = Math.sin(p * Math.PI * 6) * 7
        drawPokeball(ctx, BALL_X1 + sx, BALL_Y1, 12)
      } else if (ballAnimPhase === 4) {
        // Caught — sparkles rotate
        drawPokeball(ctx, BALL_X1, BALL_Y1, 12, true, p * Math.PI * 2)
        ctx.fillStyle = '#ffd700'
        ctx.font = `bold 14px ${MONO}`
        ctx.textAlign = 'center'
        ctx.fillText('Gotcha!', W / 2, SKY_H - 16)
      } else if (ballAnimPhase === 5) {
        // Broke free — ball at rest
        drawPokeball(ctx, BALL_X1, BALL_Y1, 10)
      }

      if (p < 1) rafRef.current = requestAnimationFrame(frame)
    }

    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [ballAnimPhase])

  if (!playerPokemon || !opponentPokemon) return null

  const latestLog = log[log.length - 1] ?? ''

  const expPct = (() => {
    const fl = expForLevel(playerPokemon.level)
    const cl = expForLevel(playerPokemon.level + 1)
    return Math.min(100, Math.max(0, (playerPokemon.xp - fl) / (cl - fl) * 100))
  })()

  // Opponent hidden during trainer intro (trainer shown instead); fades on ball catch
  const opponentAlpha = phase === 'trainer_intro' ? 0
    : opponentFlash ? 0.3
    : (ballCaught && phase === 'win') ? 0
    : (ballAnimPhase >= 2 && ballAnimPhase <= 4) ? 0.15 : 1

  function HpBar({ current, max }: { current: number; max: number }) {
    const pct = Math.max(0, Math.min(1, current / max))
    const color = hpBarColor(current, max)
    return (
      <div style={{ flex: 1, position: 'relative' }}>
        <div style={{ background: '#404030', height: 7, width: '100%' }}>
          <div style={{
            width: `${pct * 100}%`, height: '100%', background: color,
            transition: 'width 0.3s',
          }} />
          {/* White gloss highlight — top 3px of filled bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            width: `${pct * 100}%`, height: 3,
            background: 'rgba(255,255,255,0.35)',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>
    )
  }

  const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    burn:      { label: 'BRN', color: '#fff', bg: '#e84040' },
    paralysis: { label: 'PAR', color: '#181808', bg: '#f8d030' },
    sleep:     { label: 'SLP', color: '#fff', bg: '#6868a8' },
    poison:    { label: 'PSN', color: '#fff', bg: '#a040a0' },
    freeze:    { label: 'FRZ', color: '#181808', bg: '#98d8d8' },
  }

  function HpBox({
    name, level, currentHp, maxHp, showNums = false,
    xp, glow = false, status,
  }: {
    name: string; level: number; currentHp: number; maxHp: number
    showNums?: boolean; xp?: number; glow?: boolean; status?: string | null
  }) {
    const badge = status ? STATUS_BADGE[status] : null
    return (
      <div style={{
        width: 176, background: MENU_BG, border: `1.5px solid ${MENU_BD}`,
        borderRadius: 3, padding: '4px 8px',
        boxShadow: glow
          ? '0 0 8px 2px #ffd700'
          : '2px 2px 0 rgba(0,0,0,0.12)',
        fontFamily: MONO,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 'bold', color: '#181808' }}>{name}</span>
            {badge && (
              <span style={{
                fontSize: 8, fontWeight: 'bold', color: badge.color,
                background: badge.bg, borderRadius: 2, padding: '1px 3px',
              }}>{badge.label}</span>
            )}
          </div>
          <span style={{ fontSize: 10, color: '#484838' }}>:Lv{level}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <span style={{ fontSize: 9, fontWeight: 'bold', color: '#181808', flexShrink: 0 }}>HP</span>
          <HpBar current={currentHp} max={maxHp} />
        </div>
        {showNums && (
          <div style={{ textAlign: 'right', fontSize: 9, color: '#181808', marginTop: 1 }}>
            {currentHp}/{maxHp}
          </div>
        )}
        {xp !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 'bold', color: '#181808', flexShrink: 0 }}>XP</span>
            <div style={{ flex: 1, background: '#404030', height: 6, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${xp}%`, height: '100%', background: '#6890f0', borderRadius: 3,
                transition: expAnimating ? 'width 2.5s ease-out' : 'none',
              }} />
            </div>
          </div>
        )}
      </div>
    )
  }

  const viewportH = window.visualViewport?.height ?? window.innerHeight
  const availH = viewportH - safeAreaTop - safeAreaBottom
  const BATTLE_TOTAL_H = SKY_H + 280  // sky + bottom panel estimate
  const scale = Math.min(window.innerWidth / W, availH / BATTLE_TOTAL_H, 1.8)
  const scaledH = Math.round(availH / scale)
  // Move cell height: bottom panel minus sky, dialog+margins, move-area margins, and 3px border
  const numMoveRows = (playerPokemon?.moves?.length ?? 4) <= 2 ? 1 : 2
  const moveCellH = Math.max(40, Math.floor((scaledH - SKY_H - DLG_H - 18) / numMoveRows))
  // Auto-size name font so the longest move name fits in ~84px cell (monospace 0.62 ratio)
  const longestMoveName = Math.max(...(playerPokemon?.moves?.map(mv => {
    const md = moveDataMap[mv.moveId]
    return (md?.name ?? mv.moveId).length
  }) ?? [4]))
  const nameFontSz = Math.min(14, Math.max(9, Math.floor(84 / longestMoveName / 0.62)))
  const typeFontSz = 11
  const dmgFontSz  = 14

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', paddingTop: safeAreaTop, paddingBottom: safeAreaBottom }}>
    <div style={{ zoom: scale, transformOrigin: 'top center', width: W, height: scaledH, display: 'flex', flexDirection: 'column' }}>

      {/* ── Battle scene (360 × 240 px = top 48% of Ruby 500px canvas) ── */}
      <div style={{ position: 'relative', width: W, height: SKY_H, overflow: 'hidden', flexShrink: 0 }}>

        {/* Sky gradient */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, #b8ecdc, #d0f4ec)' }} />

        {/* Opponent platform — top-right green oval (Ruby: enemy right) */}
        {/* Top: ellipse(259, 117.5, r56, r14) */}
        <div style={{ position: 'absolute', left: 203, top: 103, width: 112, height: 28, borderRadius: '50%', background: '#d8e868' }} />
        {/* Bottom: ellipse(259, 124, r52, r8) */}
        <div style={{ position: 'absolute', left: 207, top: 116, width: 104, height: 16, borderRadius: '50%', background: '#a8d038' }} />

        {/* Player platform — bottom-left tan oval (Ruby: player left) */}
        {/* Top: ellipse(100.8, 200, r72, r18) */}
        <div style={{ position: 'absolute', left: 28, top: 182, width: 144, height: 36, borderRadius: '50%', background: '#d8c060' }} />
        {/* Bottom: ellipse(100.8, 206, r68, r12) */}
        <div style={{ position: 'absolute', left: 32, top: 194, width: 136, height: 24, borderRadius: '50%', background: '#b09038' }} />

        {/* Opponent HP box — top LEFT (Ruby layout: enemy info top-left) */}
        <div style={{
          position: 'absolute', left: 6, top: 8,
          animation: opponentHpShake ? 'hpShake 0.4s ease-out' : 'none',
        }}>
          <HpBox
            name={pokeName(opponentPokemon)}
            level={opponentPokemon.level}
            currentHp={opponentPokemon.currentHp}
            maxHp={opponentPokemon.maxHp}
            status={opponentPokemon.status}
            showNums
          />
        </div>

        {/* Trainer intro — trainer slides in, then throws a Pokéball */}
        {phase === 'trainer_intro' && (
          <>
            {NPC_BATTLE_PICS[trainerName ?? ''] ? (
              <ChromaKeyImg
                src={`${import.meta.env.BASE_URL}${NPC_BATTLE_PICS[trainerName!]}`}
                height={Math.round(SKY_H * 0.55)}
                style={{
                  position: 'absolute', right: 16, top: 20,
                  animation: 'trainerSlideIn 0.5s ease-out',
                }}
              />
            ) : (
              <div style={{
                position: 'absolute', right: 8, bottom: 8,
                width: 120, height: 160,
                backgroundImage: `url(${import.meta.env.BASE_URL}sprites/trainer-sheet.png)`,
                backgroundPosition: `-${trainerSpriteCol * 50 * 2}px -${trainerSpriteRow * 64 * 2}px`,
                backgroundSize: `${398 * 2}px ${513 * 2}px`,
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated' as const,
                animation: 'trainerSlideIn 0.5s ease-out',
              }} />
            )}
            {trainerThrowBall && (
              <div style={{
                position: 'absolute', width: 18, height: 18,
                animation: 'trainerBallThrow 0.8s ease-in forwards',
                pointerEvents: 'none', zIndex: 20,
              }}>
                {/* Mini Pokéball drawn inline */}
                <svg viewBox="0 0 18 18" width={18} height={18}>
                  <circle cx="9" cy="9" r="8" fill="#e03020" />
                  <path d="M1 9 A8 8 0 0 1 17 9" fill="#f8f8f8" />
                  <line x1="1" y1="9" x2="17" y2="9" stroke="#181808" strokeWidth="1.5" />
                  <circle cx="9" cy="9" r="2.5" fill="#f8f8f8" stroke="#181808" strokeWidth="1" />
                </svg>
              </div>
            )}
          </>
        )}

        {/* Opponent sprite — top RIGHT, animated */}
        {/* Attack: lurches left toward player; shake: oscillates on hit */}
        <div style={{
          position: 'absolute',
          left: 194 + shakeX + (opponentAttacking ? -30 : 0),
          top: 20,
          width: 130, height: 130,
          opacity: opponentAlpha,
          transition: opponentAttacking
            ? 'left 0.15s ease-out, opacity 0.05s'
            : 'left 0.12s ease-in, opacity 0.05s',
          imageRendering: 'pixelated' as const,
        }}>
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${opponentPokemon.pokemonId}.png`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' as const }}
          />
        </div>

        {/* Player sprite — bottom LEFT, attack lurch right; shake + flash when hit */}
        <div style={{
          position: 'absolute',
          left: 15 + (playerAttacking ? 26 : 0) + playerShakeX,
          top: 100,
          width: 150, height: 140,
          opacity: playerFlash ? 0.25 : 1,
          transition: playerAttacking
            ? 'left 0.15s ease-out, opacity 0.05s'
            : 'left 0.12s ease-in, opacity 0.05s',
          imageRendering: 'pixelated' as const,
          boxShadow: evoStage === 'reveal'
            ? '0 0 30px 10px rgba(255,255,255,0.9)'
            : leveledUp ? '0 0 20px #ffd700' : 'none',
          animation: evoStage === 'reveal' ? 'evoReveal 0.9s ease-out' : 'none',
        }}>
          <img
            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${playerPokemon.pokemonId}.png`}
            alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'contain',
              imageRendering: 'pixelated' as const,
              filter: evoStage === 'silhouette' || evoStage === 'flash'
                ? 'brightness(100) saturate(0)'
                : evoStage === 'reveal'
                  ? 'brightness(2) saturate(0.3)'
                  : 'none',
              transition: evoStage === 'silhouette' ? 'filter 0.4s ease-in' : 'filter 0.5s ease-out',
              animation: evoStage === 'silhouette' ? 'evoPulse 0.5s ease-in-out infinite alternate' : 'none',
            }}
          />
        </div>

        {/* Player HP box — bottom RIGHT */}
        <div style={{ position: 'absolute', left: 178, top: 170 }}>
          <HpBox
            name={pokeName(playerPokemon)}
            level={playerPokemon.level}
            currentHp={playerPokemon.currentHp}
            maxHp={playerPokemon.maxHp}
            showNums
            xp={expPct}
            glow={leveledUp}
            status={playerPokemon.status}
          />
        </div>

        {/* Floating damage number */}
        {damagePopup && (
          <div key={damagePopup.id} style={{
            position: 'absolute',
            left: damagePopup.forOpponent ? '58%' : '18%',
            top: damagePopup.forOpponent ? '15%' : '45%',
            color: damagePopup.forOpponent ? '#ff4040' : '#ff8040',
            fontFamily: MONO, fontWeight: 'bold', fontSize: 20,
            textShadow: '1px 1px 0 #000',
            pointerEvents: 'none', zIndex: 20,
            animation: 'damageFloat 1.2s ease-out forwards',
          }}>
            -{damagePopup.amount}
          </div>
        )}

        {/* Battle banner (Super effective / Not very effective / Critical hit) */}
        {battleBanner && (
          <div key={battleBanner} style={{
            position: 'absolute', bottom: '8%', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            color: '#ffd700', fontFamily: MONO, fontWeight: 'bold',
            fontSize: 11, padding: '4px 12px', borderRadius: 4,
            whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 20,
            animation: 'fadeBanner 1.5s ease-out forwards',
          }}>
            {battleBanner}
          </div>
        )}

        {/* Arena tint overlay — opacity set imperatively by projectile rAF */}
        <div
          ref={arenaTintRef}
          style={{
            position: 'absolute', inset: 0, height: SKY_H,
            background: projectileAnim ? (TYPE_TINT[projectileAnim.moveType] ?? 'rgba(255,255,255,0.12)') : 'transparent',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 6,
          }}
        />

        {/* Projectile animation canvas — sits above arena, below sprites */}
        <canvas
          ref={projCanvasRef}
          width={W}
          height={SKY_H}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7 }}
        />

        {/* Hit effect animation canvas */}
        <canvas
          ref={hitCanvasRef}
          width={W}
          height={SKY_H}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8 }}
        />
        {/* Ball throw animation canvas — overlays entire sky zone */}
        <canvas
          ref={ballCanvasRef}
          width={W}
          height={SKY_H}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 9 }}
        />
      </div>

      {/* ── Bottom panel (cream, Ruby style) ── */}
      <div style={{
        width: W, flex: 1, background: MENU_BG,
        borderTop: `3px solid ${MENU_BD}`,
        display: 'flex', flexDirection: 'column',
        fontFamily: MONO,
      }}>

        {/* Dialog box — exactly 34px tall, starts at panel+4px (matches mockup panY+4, h=34) */}
        <div style={{
          margin: '4px 4px 0', height: DLG_H,
          background: MENU_BG, border: `1.5px solid ${MENU_BD}`,
          borderRadius: 3, fontSize: 13, color: '#181808',
          display: 'flex', alignItems: 'center', padding: '0 10px',
          flexShrink: 0,
        }}>
          {phase === 'player_turn' || phase === 'catch'
            ? `▶ What will ${pokeName(playerPokemon)} do?`
            : `▶ ${latestLog}`}
        </div>

        {/* ── PLAYER TURN: 2×2 move grid (201px) + PP/TYPE panel ── */}
        {/* Move area starts at 4+34+4=42px from panel top — matches mockup dlgY = panY+42 */}
        {phase === 'player_turn' && (
          <div style={{ display: 'flex', gap: 4, margin: '4px 4px 4px', flex: 1 }}>

            {/* Move panel — explicit pixel heights so centering always works */}
            {(() => {
              const mvs = playerPokemon.moves
              const mkBtn = (mv: typeof mvs[0], i: number) => {
                const md = moveDataMap[mv.moveId] ?? null
                let dmgText = '—', dmgColor = '#888'
                if (md && (md.power ?? 0) > 0) {
                  const atkData = pokemonDataMap[playerPokemon.pokemonId]
                  const defData = pokemonDataMap[opponentPokemon.pokemonId]
                  if (atkData && defData) {
                    const atkStat = calculateStat(atkData.baseStats.atk, playerPokemon.level)
                    const defStat = calculateStat(defData.baseStats.def, opponentPokemon.level)
                    const eff = getTypeEffectiveness(md.type as any, defData.types as any)
                    if (eff === 0) {
                      dmgText = '✕'; dmgColor = '#aaa'
                    } else {
                      const base = Math.floor((Math.floor((2 * playerPokemon.level) / 5 + 2) * md.power * atkStat) / defStat / 50) + 2
                      const dmg = Math.max(1, Math.floor(base * eff * 0.925))
                      dmgText = `~${dmg}${eff >= 2 ? '★' : eff < 1 ? '▼' : ''}`
                      dmgColor = eff >= 2 ? '#e03020' : eff < 1 ? '#6888c8' : '#484838'
                    }
                  }
                }
                return (
                  <button key={i} onClick={() => selectMove(i)} style={{
                    flex: 1, height: moveCellH, minWidth: 0,
                    background: 'transparent', border: 'none', outline: 'none',
                    padding: '6px 8px', textAlign: 'left', cursor: 'pointer', fontFamily: MONO,
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: nameFontSz, fontWeight: 'bold', color: '#181808', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {md?.name.toUpperCase() ?? mv.moveId.toUpperCase()}
                    </div>
                    <div style={{ fontSize: typeFontSz, color: md ? (TYPE_COLOR[md.type] ?? '#999') : '#999', marginTop: 2 }}>
                      {md?.type.toUpperCase() ?? ''}
                    </div>
                    <div style={{ fontSize: dmgFontSz, marginTop: 2 }}>
                      <span style={{ color: dmgColor, fontWeight: 'bold' }}>{dmgText}</span>
                    </div>
                  </button>
                )
              }
              const row = (a: number, b?: number) => (
                <div style={{ display: 'flex', height: moveCellH }}>
                  {mkBtn(mvs[a], a)}
                  {b !== undefined && mvs[b] && <>
                    <div style={{ width: 1, background: '#c8c0a8' }} />
                    {mkBtn(mvs[b], b)}
                  </>}
                </div>
              )
              return (
                <div style={{
                  width: MOVE_W, flexShrink: 0,
                  border: `1.5px solid ${MENU_BD}`, borderRadius: 3,
                  background: MENU_BG, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                }}>
                  {row(0, mvs.length > 1 ? 1 : undefined)}
                  {mvs.length > 2 && <>
                    <div style={{ height: 1, background: '#c8c0a8' }} />
                    {row(2, mvs.length > 3 ? 3 : undefined)}
                  </>}
                </div>
              )
            })()}

            {/* Action buttons panel */}
            <div style={{
              flex: 1, border: `1.5px solid ${MENU_BD}`, borderRadius: 3,
              background: MENU_BG, padding: '4px 6px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {/* POKEBALL — wild battles only */}
              {isWildBattle ? (() => {
                const ballCount = (profile?.bag ?? []).find(b => b.itemId === 'pokeball')?.qty ?? 0
                return (
                  <button
                    onClick={() => ballCount > 0 && useBattleStore.getState().throwPokeball()}
                    disabled={ballCount === 0}
                    style={{
                      flex: 1, background: ballCount > 0 ? '#e82020' : '#888',
                      border: `1px solid ${MENU_BD}`,
                      borderRadius: 3, padding: '6px 0',
                      fontSize: 14, fontWeight: 'bold', color: '#f8f8f8',
                      cursor: ballCount > 0 ? 'pointer' : 'default',
                      fontFamily: MONO, opacity: ballCount > 0 ? 1 : 0.5,
                    }}
                  >
                    BALL ×{ballCount}
                  </button>
                )
              })() : <div style={{ flex: 1 }} />}
              {/* BAG */}
              <button
                onClick={() => setBagOpen(true)}
                style={{
                  flex: 1, background: '#e0d8c8', border: `1px solid ${MENU_BD}`,
                  borderRadius: 3, padding: '6px 0',
                  fontSize: 14, fontWeight: 'bold', color: '#181808',
                  cursor: 'pointer', fontFamily: MONO,
                }}
              >
                BAG
              </button>
              {/* SWITCH — only when bench has a healthy pokemon */}
              {party.some(p => p.currentHp > 0) ? (
                <button
                  onClick={() => useBattleStore.getState().setPhase('voluntary_switch')}
                  style={{
                    flex: 1, background: '#4080c8', border: `1px solid ${MENU_BD}`,
                    borderRadius: 3, padding: '6px 0',
                    fontSize: 14, fontWeight: 'bold', color: '#f8f8f8',
                    cursor: 'pointer', fontFamily: MONO,
                  }}
                >
                  SWITCH
                </button>
              ) : <div style={{ flex: 1 }} />}
              {/* ESCAPE */}
              <button
                onClick={handleEscape}
                style={{
                  flex: 1, background: '#48a048', border: `1px solid ${MENU_BD}`,
                  borderRadius: 3, padding: '6px 0',
                  fontSize: 14, fontWeight: 'bold', color: '#f8f8f8',
                  cursor: 'pointer', fontFamily: MONO,
                }}
              >
                ESCAPE
              </button>
            </div>
          </div>
        )}

        {/* ── CATCH PHASE: FIGHT vs THROW BALL (matches mockup drawCatchScene) ── */}
        {phase === 'catch' && (
          <div style={{ display: 'flex', gap: 4, margin: '4px 4px 4px', flex: 1 }}>
            {/* FIGHT button */}
            <button
              onClick={() => useBattleStore.getState().setPhase('player_turn')}
              style={{
                flex: 1, background: '#d84030', border: `1.5px solid ${MENU_BD}`,
                borderRadius: 3, cursor: 'pointer', fontFamily: MONO,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4,
              }}
            >
              <div style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>⚔ FIGHT</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8 }}>Attack moves</div>
            </button>

            {/* THROW BALL button */}
            <button
              onClick={() => attemptCatch()}
              style={{
                flex: 1, background: '#fff8d8', border: `2px solid #e8a018`,
                borderRadius: 3, cursor: 'pointer', fontFamily: MONO,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 4,
              }}
            >
              <div style={{ color: '#181808', fontWeight: 'bold', fontSize: 12 }}>▶ THROW BALL</div>
              <div style={{ color: '#484838', fontSize: 8 }}>
                Pokéball × {(profile?.bag ?? []).find(b => b.itemId === 'pokeball')?.qty ?? 0}
              </div>
              {/* Catch rate bar */}
              {(() => {
                const levelFactor = Math.max(0.5, opponentPokemon.level / 20)
                const pct = Math.min(1, ((pokemonDataMap[opponentPokemon.pokemonId]?.catchRate ?? 45) / 255) *
                  (2 - opponentPokemon.currentHp / opponentPokemon.maxHp) / levelFactor)
                return (
                  <div style={{ width: '80%' }}>
                    <div style={{ background: '#505040', height: 6, borderRadius: 0 }}>
                      <div style={{ width: `${pct * 100}%`, height: '100%', background: '#50d040' }} />
                    </div>
                    <div style={{ fontSize: 7, color: '#484838', marginTop: 2 }}>
                      Catch rate: {pct > 0.6 ? 'HIGH' : pct > 0.3 ? 'MED' : 'LOW'}
                    </div>
                  </div>
                )
              })()}
            </button>
          </div>
        )}

        {/* ── ANIMATING / OPPONENT TURN ── */}
        {(phase === 'animating' || phase === 'opponent_turn') && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <span style={{ color: '#484838', fontSize: 24 }}>...</span>
          </div>
        )}

        {/* ── WIN ── */}
        {phase === 'win' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0', flex: 1, justifyContent: 'center' }}>
            <div style={{ color: '#58d040', fontWeight: 'bold', fontSize: 18, fontFamily: MONO }}>
              {ballCaught ? 'Pokémon caught!' : 'You won!'}
            </div>
            <button
              onClick={() => navigate('/map')}
              style={{
                background: '#ffd700', color: '#181808',
                fontWeight: 'bold', padding: '10px 32px',
                borderRadius: 3, border: 'none', fontSize: 14,
                cursor: 'pointer', fontFamily: MONO,
              }}
            >
              Continue
            </button>
          </div>
        )}

        {/* ── SWITCH POKEMON (forced on faint) ── */}
        {(phase === 'switch_pokemon' || phase === 'voluntary_switch') && (
          <div style={{ display: 'flex', flexDirection: 'column', padding: '4px', flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 'bold', color: '#484838', fontFamily: MONO, padding: '2px 4px', flex: 1 }}>
                {phase === 'voluntary_switch' ? 'Switch to:' : 'Choose a Pokémon:'}
              </div>
              {phase === 'voluntary_switch' && (
                <button
                  onClick={() => useBattleStore.getState().setPhase('player_turn')}
                  style={{
                    background: '#c0b898', border: `1px solid ${MENU_BD}`, borderRadius: 3,
                    padding: '2px 8px', fontSize: 10, fontWeight: 'bold',
                    color: '#181808', cursor: 'pointer', fontFamily: MONO,
                  }}
                >
                  ← BACK
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {party.map((p, i) => {
              const pName = (p.nickname || pokemonDataMap[p.pokemonId]?.name || `#${p.pokemonId}`).toUpperCase()
              const fainted = p.currentHp <= 0
              return (
                <button
                  key={i}
                  disabled={fainted}
                  onClick={() => switchToPartyMember(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: fainted ? '#e0d8c8' : '#fff8d8',
                    border: `1.5px solid ${MENU_BD}`, borderRadius: 3,
                    padding: '4px 8px', cursor: fainted ? 'default' : 'pointer',
                    fontFamily: MONO, opacity: fainted ? 0.5 : 1,
                  }}
                >
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.pokemonId}.png`}
                    alt=""
                    style={{ width: 28, height: 28, imageRendering: 'pixelated' }}
                  />
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: 10, fontWeight: 'bold', color: '#181808' }}>{pName}</div>
                    <div style={{ fontSize: 9, color: '#484838' }}>Lv{p.level}  HP: {p.currentHp}/{p.maxHp}</div>
                  </div>
                  {fainted && <span style={{ fontSize: 9, color: '#e02820' }}>FNT</span>}
                </button>
              )
            })}
            </div>
          </div>
        )}

        {/* ── LOSE ── */}
        {phase === 'lose' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0', flex: 1, justifyContent: 'center' }}>
            <div style={{ color: '#e02820', fontWeight: 'bold', fontSize: 18, fontFamily: MONO }}>You blacked out...</div>
            <button
              onClick={async () => {
                if (profile?.id && profile.party?.length) {
                  const healedParty = profile.party.map(p => ({ ...p, currentHp: p.maxHp }))
                  try {
                    await updateProfile(profile.id, {
                      party: healedParty,
                      playerX: 4,
                      playerY: 7,
                      currentRoute: 'pallet',
                    })
                    useProfileStore.getState().setProfile({
                      ...profile,
                      party: healedParty,
                      playerX: 4,
                      playerY: 7,
                      currentRoute: 'pallet',
                    })
                  } catch { /* silent */ }
                }
                navigate('/map')
              }}
              style={{
                background: '#ffd700', color: '#181808',
                fontWeight: 'bold', padding: '10px 32px',
                borderRadius: 3, border: 'none', fontSize: 14,
                cursor: 'pointer', fontFamily: MONO,
              }}
            >
              Return to Pokémon Center
            </button>
          </div>
        )}
      </div>
    </div>
    {/* ── Overlays are outside the zoom div so position:fixed works correctly on iOS Safari ── */}

    {/* ── Question popup ── */}
    {phase === 'question' && question && selectedMoveIndex !== null && (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#16213e', border: '2px solid #ffd700',
          borderRadius: 10, width: 380, maxWidth: '95vw',
          padding: '28px 18px 18px', position: 'relative',
          fontFamily: MONO,
        }}>
          {/* Move name badge */}
          <div style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: '#c83028', border: '1.5px solid #ffd700',
            borderRadius: 14, padding: '4px 20px',
            color: '#ffd700', fontWeight: 'bold', fontSize: 13,
            whiteSpace: 'nowrap',
          }}>
            {(moveDataMap[playerPokemon.moves[selectedMoveIndex]?.moveId]?.name ?? 'MOVE').toUpperCase()}
          </div>
          <div style={{ color: 'white', fontWeight: 'bold', fontSize: 17, textAlign: 'center', marginBottom: 8 }}>
            {question.question}
          </div>
          <div style={{ color: '#ffd700', fontSize: 13, textAlign: 'center', marginBottom: 18 }}>
            {question.subject === 'chinese' ? '答對可以給予滿額傷害！' : 'Answer correctly for full damage!'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {question.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt === question.answer, opt)}
                style={{
                  background: '#0f3460', border: '1.5px solid #4ecdc4',
                  borderRadius: 8, padding: '16px 10px',
                  cursor: 'pointer', textAlign: 'left', fontFamily: MONO,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                <span style={{ color: '#4ecdc4', fontWeight: 'bold', fontSize: 15 }}>{'ABCD'[i]}</span>
                <span style={{ color: 'white', fontSize: 14 }}>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ── Wrong answer feedback overlay ── */}
    {answerResult && !answerResult.wasCorrect && (
      <div
        onClick={() => useBattleStore.getState().acknowledgeWrongAnswer()}
        onTouchEnd={(e) => { e.preventDefault(); useBattleStore.getState().acknowledgeWrongAnswer() }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 45,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <div style={{
          background: '#16213e', border: '2px solid #e02820',
          borderRadius: 10, padding: '28px 24px', textAlign: 'center',
          fontFamily: MONO, maxWidth: 340,
        }}>
          <div style={{ color: '#e02820', fontWeight: 'bold', fontSize: 22, marginBottom: 14 }}>
            ✗ Wrong Answer
          </div>
          <div style={{ color: '#aaaaaa', fontSize: 15, marginBottom: 8 }}>
            The correct answer was:
          </div>
          <div style={{
            color: '#ffd700', fontWeight: 'bold', fontSize: 18,
            background: '#0f3460', borderRadius: 6, padding: '10px 14px',
          }}>
            {answerResult.correctAnswer}
          </div>
          <div style={{ color: '#4ecdc4', fontSize: 14, marginTop: 14 }}>
            The attack missed...
          </div>
          <div style={{
            color: '#666', fontSize: 13, marginTop: 12,
            borderTop: '1px solid #2a3a5a', paddingTop: 10,
          }}>
            Tap anywhere to continue
          </div>
        </div>
      </div>
    )}

    {/* ── Bag menu overlay ── */}
    {bagOpen && profile && (
      <BagMenu
        bag={profile.bag ?? []}
        onUse={(itemId) => { setBagOpen(false); useItemInBattle(itemId) }}
        onClose={() => setBagOpen(false)}
      />
    )}

    {/* ── Evolution flash burst ── */}
    {evoStage === 'flash' && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none',
        background: 'white',
        animation: 'evoFlash 0.35s ease-out forwards',
      }} />
    )}
    </div>
  )
}
