import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import { buildPartyPokemon } from '../utils/exp'
import pokemonJson from '../data/pokemon.json'
import type { Profile, PokemonData } from '../types/game'

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

export default function AddProfile() {
  const navigate = useNavigate()
  const { createDefaultProfile, saveProfile } = useFirestoreProfile()

  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [difficulty, setDifficulty] = useState<'beginner' | 'advanced'>('beginner')
  const [starter, setStarter] = useState('charmander')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim()) return setError('Please enter a name.')
    if (!age || isNaN(Number(age)) || Number(age) < 1) return setError('Please enter a valid age.')
    if (!/^\d{4}$/.test(pin)) return setError('PIN must be exactly 4 digits.')
    if (pin !== pinConfirm) return setError('PINs do not match.')

    setSaving(true)
    try {
      const starterIds: Record<string, number> = {
        bulbasaur: 1, charmander: 4, squirtle: 7, pikachu: 25, eevee: 133,
      }
      const starterId = starterIds[starter] ?? 4
      const starterData = pokemonMap[starterId]
      const starterPokemon = starterData ? buildPartyPokemon(starterData, 5) : null

      const base = createDefaultProfile(name.trim(), Number(age), gender, difficulty, starter)
      const profile: Omit<Profile, 'id'> = {
        ...base,
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

          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm">Character</label>
            <div className="flex gap-3">
              {([
                { value: 'male',   label: 'Boy',  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/red.png',  fallback: '🧒' },
                { value: 'female', label: 'Girl', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/leaf.png', fallback: '👧' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className={`flex-1 flex flex-col items-center py-2 rounded-xl border transition-all ${
                    gender === opt.value
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-600 bg-[#1a1a2e]'
                  }`}
                >
                  <span className="text-3xl leading-none mb-1">{opt.fallback}</span>
                  <span className="text-xs font-semibold text-gray-300">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

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

          <div className="flex flex-col gap-1">
            <label className="text-gray-300 text-sm">Difficulty</label>
            <div className="flex gap-3">
              {(['beginner', 'advanced'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 py-2 rounded-lg capitalize font-semibold transition-all border ${
                    difficulty === d
                      ? 'bg-yellow-400 text-black border-yellow-400'
                      : 'bg-[#1a1a2e] text-gray-300 border-gray-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-gray-300 text-sm">Starter Pokémon</label>
            <div className="flex gap-2 flex-wrap justify-center">
              {STARTERS.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStarter(s.id)}
                  className={`flex flex-col items-center p-2 rounded-xl border transition-all ${
                    starter === s.id
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-gray-600 bg-[#1a1a2e]'
                  }`}
                >
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s.dexId}.png`}
                    alt={s.label}
                    className="w-12 h-12"
                  />
                  <span className="text-xs text-gray-300 capitalize">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

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
