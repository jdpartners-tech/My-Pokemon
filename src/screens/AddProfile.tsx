import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import { buildPartyPokemon } from '../utils/exp'
import pokemonJson from '../data/pokemon.json'
import type { Profile, PokemonData, SubjectSettings } from '../types/game'

// ── Pixel-art character renderers (ported from docs/mockup.html) ──────────────
// Male: Red / FireRed hero — blue cap, red jacket (Pokémon 151 era)
function drawMaleSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const f = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c; ctx.fillRect(cx + x*s, cy + y*s, w*s, h*s)
  }
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath(); ctx.ellipse(cx, cy + 12*s, 6*s, 2*s, 0, 0, Math.PI*2); ctx.fill()
  f(-4,10,3,2,'#201010'); f(1,10,3,2,'#201010')
  f(-3,5,2,6,'#2840a8'); f(1,5,2,6,'#2840a8')
  f(-4,-4,8,10,'#c03020'); f(-6,-3,2,6,'#c03020'); f(4,-3,2,6,'#c03020')
  f(-3,-4,6,2,'#e8c030')
  f(-7,2,2,2,'#e8b870'); f(5,2,2,2,'#e8b870')
  f(-2,-5,4,2,'#e8b870'); f(-3,-13,6,9,'#e8b870')
  f(-2,-14,4,3,'#402010')
  f(-4,-19,8,7,'#2850c0'); f(-3,-21,6,3,'#2850c0')
  f(-4,-13,8,2,'#f0f0f0'); f(-5,-12,10,2,'#2850c0')
  f(-5,-2,1,8,'#c08030'); f(4,-2,1,8,'#c08030')
}

// Female: Leaf / FireRed heroine — white bandana, red top, blue shorts (Pokémon 151 era)
function drawFemaleSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  const f = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c; ctx.fillRect(cx + x*s, cy + y*s, w*s, h*s)
  }
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath(); ctx.ellipse(cx, cy + 12*s, 6*s, 2*s, 0, 0, Math.PI*2); ctx.fill()
  f(-4,10,3,2,'#201010'); f(1,10,3,2,'#201010')
  f(-3,4,6,7,'#2850b8')
  f(-4,-4,8,9,'#d04828'); f(-6,-3,2,5,'#d04828'); f(4,-3,2,5,'#d04828')
  f(-2,-4,4,2,'#f0f0f0')
  f(-7,2,2,2,'#e8b870'); f(5,2,2,2,'#e8b870')
  f(-2,-5,4,2,'#e8b870'); f(-3,-13,6,9,'#e8b870')
  f(-4,-13,6,2,'#503820'); f(-5,-7,2,6,'#503820'); f(3,-7,2,6,'#503820')
  f(-4,-17,8,5,'#f0f0f0'); f(-5,-14,1,3,'#f0f0f0'); f(4,-14,1,3,'#f0f0f0')
  f(-2,-17,1,2,'#e87830'); f(1,-17,1,2,'#e87830')
  f(-2,-9,1,1,'#201010'); f(1,-9,1,1,'#201010')
  f(-5,-2,1,8,'#c08030'); f(4,-2,1,8,'#c08030')
}

// Canvas: 80×100px, character at (40, 76), scale 2.0
// Hat top → 76 − 21×2 = 34px from canvas top; shadow → 76 + 12×2 = 100px (bottom edge)
const CW = 80, CH = 100

function CharacterCanvas({ gender }: { gender: 'male' | 'female' }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, CW, CH)
    if (gender === 'male') drawMaleSprite(ctx, 40, 76, 2.0)
    else drawFemaleSprite(ctx, 40, 76, 2.0)
  }, [gender])
  return <canvas ref={ref} width={CW} height={CH} style={{ imageRendering: 'pixelated', display: 'block' }} />
}

// ── Starter data ──────────────────────────────────────────────────────────────
const pokemonMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p])
) as Record<number, PokemonData>

const STARTERS = [
  { id: 'bulbasaur',  dexId: 1,   label: 'Bulbasaur' },
  { id: 'charmander', dexId: 4,   label: 'Charmander' },
  { id: 'squirtle',   dexId: 7,   label: 'Squirtle' },
  { id: 'pikachu',    dexId: 25,  label: 'Pikachu' },
  { id: 'eevee',      dexId: 133, label: 'Eevee' },
]

const SUBJECT_ICONS: Record<string, string> = {
  english: '📖',
  maths:   '🔢',
  chinese: '🈶',
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AddProfile() {
  const navigate = useNavigate()
  const { createDefaultProfile, saveProfile } = useFirestoreProfile()

  const [name, setName]           = useState('')
  const [age, setAge]             = useState('')
  const [gender, setGender]       = useState<'male' | 'female'>('male')
  const [subjects, setSubjects]   = useState({ english: true, maths: true, chinese: true })
  const [starter, setStarter]     = useState('charmander')
  const [pin, setPin]             = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

  function toggleSubject(s: 'english' | 'maths' | 'chinese') {
    setSubjects(prev => ({ ...prev, [s]: !prev[s] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) return setError('Please enter a name.')
    if (!age || isNaN(Number(age)) || Number(age) < 1) return setError('Please enter a valid age.')
    if (!subjects.english && !subjects.maths && !subjects.chinese)
      return setError('Please select at least one subject.')
    if (!/^\d{4}$/.test(pin)) return setError('PIN must be exactly 4 digits.')
    if (pin !== pinConfirm) return setError('PINs do not match.')

    setSaving(true)
    try {
      const ageNum = Number(age)
      // Difficulty inferred from age — no manual selection needed
      const difficulty = ageNum >= 7 ? 'advanced' : 'beginner'

      const starterIds: Record<string, number> = {
        bulbasaur: 1, charmander: 4, squirtle: 7, pikachu: 25, eevee: 133,
      }
      const starterId = starterIds[starter] ?? 4
      const starterData = pokemonMap[starterId]
      const starterPokemon = starterData ? buildPartyPokemon(starterData, 5) : null

      const base = createDefaultProfile(name.trim(), ageNum, gender, difficulty, starter)

      const subjectSettings: SubjectSettings = {
        english: { enabled: subjects.english, types: [] },
        maths:   { enabled: subjects.maths,   types: [] },
        chinese: { enabled: subjects.chinese, types: [] },
      }

      const profile: Omit<Profile, 'id'> = {
        ...base,
        subjects: subjectSettings,
        party: starterPokemon ? [starterPokemon] : [],
      } as Omit<Profile, 'id'>

      await saveProfile(profile, pin)
      navigate('/')
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#0f3460] rounded-2xl p-6 flex flex-col gap-5">
        <h1 className="text-2xl font-bold text-yellow-400 text-center">New Trainer</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Trainer Name */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm">Trainer Name</label>
            <input
              className="bg-[#1a1a2e] text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Kaylie"
              maxLength={20}
            />
          </div>

          {/* Character — pixel-art Red (Boy) and Leaf (Girl) */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm">Character</label>
            <div className="flex gap-3">
              {(['male', 'female'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender(g)}
                  className={`flex-1 flex flex-col items-center rounded-xl border transition-all pt-1 pb-2 ${
                    gender === g
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-600 bg-[#1a1a2e]'
                  }`}
                >
                  <CharacterCanvas gender={g} />
                  <span className="text-xs font-semibold text-gray-300 mt-1">
                    {g === 'male' ? 'Boy' : 'Girl'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm">Age</label>
            <input
              className="bg-[#1a1a2e] text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 outline-none"
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="e.g. 8"
              min={1}
              max={18}
            />
          </div>

          {/* Subjects (replaces Difficulty) */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm">Subjects</label>
            <div className="flex gap-3">
              {(['english', 'maths', 'chinese'] as const).map(s => (
                <label
                  key={s}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl border cursor-pointer select-none transition-all ${
                    subjects[s]
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-600 bg-[#1a1a2e]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={subjects[s]}
                    onChange={() => toggleSubject(s)}
                    className="sr-only"
                  />
                  <span className="text-2xl leading-none">{SUBJECT_ICONS[s]}</span>
                  <span className="text-xs font-semibold text-gray-300 capitalize">{s}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold mt-1 ${
                    subjects[s]
                      ? 'bg-yellow-400 border-yellow-400 text-black'
                      : 'border-gray-500 text-transparent'
                  }`}>
                    ✓
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Starter Pokémon — equal squares, larger icons */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm">Starter Pokémon</label>
            <div className="grid grid-cols-3 gap-2">
              {STARTERS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStarter(s.id)}
                  className={`aspect-square flex flex-col items-center justify-center rounded-xl border transition-all p-1 ${
                    starter === s.id
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-600 bg-[#1a1a2e]'
                  }`}
                >
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.dexId}.png`}
                    alt={s.label}
                    className="w-16 h-16"
                    style={{ imageRendering: 'pixelated' }}
                  />
                  <span className="text-xs text-gray-300 capitalize mt-1">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PIN */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm">4-digit PIN</label>
            <input
              className="bg-[#1a1a2e] text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 outline-none tracking-widest"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
            />
          </div>

          {/* Confirm PIN */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm">Confirm PIN</label>
            <input
              className="bg-[#1a1a2e] text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-yellow-400 outline-none tracking-widest"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinConfirm}
              onChange={e => setPinConfirm(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
            />
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-yellow-400 text-black font-bold py-3 rounded-xl hover:bg-yellow-300 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Start Adventure!'}
          </button>
        </form>

        <button
          onClick={() => navigate('/')}
          className="text-gray-400 text-sm underline text-center"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
