import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import { useProfileStore } from '../store/profileStore'
import PinEntry from '../components/PinEntry'
import { Profile } from '../types/game'

const STARTER_IDS: Record<string, number> = {
  bulbasaur: 1, charmander: 4, squirtle: 7, pikachu: 25, eevee: 133,
}

export default function ProfileSelect() {
  const navigate = useNavigate()
  const { getAllProfiles, getProfileByPin } = useFirestoreProfile()
  const setProfile = useProfileStore(s => s.setProfile)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Profile | null>(null)
  const [pinError, setPinError] = useState('')
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    getAllProfiles()
      .then(p => { setProfiles(p); setLoading(false) })
      .catch(() => { setFetchError(true); setLoading(false) })
  }, [])

  async function handlePin(pin: string) {
    const profile = await getProfileByPin(pin)
    if (!profile || profile.id !== selected?.id) {
      setPinError('Wrong PIN. Try again.')
      return
    }
    setProfile(profile)
    navigate('/map')
  }

  if (loading) return (
    <div className="fixed inset-0 bg-[#1a1a2e] overflow-y-auto flex items-center justify-center text-white">Loading...</div>
  )
  if (fetchError) return (
    <div className="fixed inset-0 bg-[#1a1a2e] overflow-y-auto flex items-center justify-center text-red-400">
      Failed to load profiles. Check your connection.
    </div>
  )

  return (
    <div className="fixed inset-0 bg-[#1a1a2e] overflow-y-auto flex flex-col items-center gap-8 p-6"
      style={{ paddingTop: 'max(24px, env(safe-area-inset-top))', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
      <h1 className="text-4xl font-bold text-yellow-400">Who's Playing?</h1>

      {selected ? (
        <div className="flex flex-col items-center gap-6">
          <p className="text-white text-2xl">Enter PIN for <strong>{selected.name}</strong></p>
          <PinEntry onComplete={handlePin} error={pinError} onClear={() => setPinError('')} />
          <button onClick={() => { setSelected(null); setPinError('') }} className="text-gray-400 text-base underline">
            Back
          </button>
        </div>
      ) : (
        <>
          {profiles.length === 0 ? (
            <p className="text-gray-400 text-center">No trainers yet. Add one below!</p>
          ) : (
            <div className="flex flex-wrap gap-8 justify-center">
              {profiles.map(p => {
                const party = p.party ?? []
                const leadId = party.length > 0 ? party[0].pokemonId : (STARTER_IDS[p.starterPokemon] ?? 1)
                const battlesWon = p.stats?.battlesWon ?? 0

                return (
                  <div key={p.id} className="flex flex-col gap-2" style={{ width: 320, minHeight: 420 }}>

                    {/* Unified player card */}
                    <button
                      onClick={() => { setSelected(p); setPinError('') }}
                      className="w-full flex-1 bg-[#16213e] border-2 border-[#4ecdc4]/40 hover:border-yellow-400 rounded-2xl p-5 flex flex-col items-center gap-4 transition-all active:scale-95 text-center"
                    >
                      {/* Header: lead Pokemon + identity */}
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${leadId}.png`}
                          alt=""
                          style={{ width: 96, height: 96, objectFit: 'contain', imageRendering: 'pixelated' }}
                        />
                        <div className="text-white font-bold text-2xl">{p.name}</div>
                        <div className="text-gray-400 text-sm">Age {p.age}</div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full w-fit ${
                          p.difficulty === 'advanced'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-green-500/20 text-green-400 border border-green-500/40'
                        }`}>
                          {p.difficulty === 'advanced' ? 'Advanced' : 'Beginner'}
                        </span>
                      </div>

                      {/* Party row */}
                      {party.length > 0 && (
                        <div className="border-t border-[#2a3a5a] pt-3 w-full">
                          <div className="text-xs text-[#4a6a8a] mb-2">My Team</div>
                          <div className="flex gap-2 flex-wrap justify-center">
                            {party.map((mon, i) => {
                              const hpPct = mon.maxHp > 0 ? Math.max(0, mon.currentHp / mon.maxHp) : 0
                              const hpColor = hpPct > 0.5 ? '#58d040' : hpPct > 0.25 ? '#e8a018' : '#e02820'
                              return (
                                <div key={i} className="flex flex-col items-center gap-1">
                                  <img
                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${mon.pokemonId}.png`}
                                    alt=""
                                    style={{ width: 64, height: 64, imageRendering: 'pixelated' }}
                                  />
                                  <div className="text-white text-xs font-bold">Lv{mon.level}</div>
                                  <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <div style={{ width: `${hpPct * 100}%`, height: '100%', background: hpColor, borderRadius: 9999 }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Stats footer */}
                      <div className="border-t border-[#2a3a5a] pt-2 w-full flex gap-4 items-center justify-center">
                        <span className="text-sm text-gray-400">&#x2694;&#xFE0F; {battlesWon} battles won</span>
                        <span className="text-sm text-gray-400 flex items-center gap-1">
                          <svg width="14" height="14" viewBox="0 0 14 14">
                            <circle cx="7" cy="7" r="6.5" fill="#f8f8f8" />
                            <path d="M0.5 7 A6.5 6.5 0 0 1 13.5 7" fill="#e82020" />
                            <line x1="0.5" y1="7" x2="13.5" y2="7" stroke="#1a1208" strokeWidth="1.2" />
                            <circle cx="7" cy="7" r="6.5" fill="none" stroke="#1a1208" strokeWidth="1" />
                            <circle cx="7" cy="7" r="2.2" fill="#f8f8f8" stroke="#1a1208" strokeWidth="1" />
                          </svg>
                          {(p.party ?? []).length} Pokemon
                        </span>
                      </div>
                    </button>

                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={() => navigate('/add-profile')}
            className="bg-[#0f3460] border border-[#4ecdc4]/40 hover:border-yellow-400 text-[#4ecdc4] w-56 py-3 rounded-xl transition-all text-sm font-medium"
          >
            + Add New Trainer
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="bg-[#16213e] border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-gray-200 w-56 py-3 rounded-xl transition-all text-sm font-medium"
          >
            Parent Settings
          </button>
        </>
      )}
    </div>
  )
}
