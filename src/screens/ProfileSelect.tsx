import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import { useProfileStore } from '../store/profileStore'
import ProfileCard from '../components/ProfileCard'
import PinEntry from '../components/PinEntry'
import { Profile } from '../types/game'

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center text-white">
        Loading...
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center text-red-400">
        Failed to load profiles. Check your connection.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-3xl font-bold text-yellow-400">Who's Playing?</h1>
      {selected ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-white text-lg">
            Enter PIN for <strong>{selected.name}</strong>
          </p>
          <PinEntry
            onComplete={handlePin}
            error={pinError}
            onClear={() => setPinError('')}
          />
          <button
            onClick={() => { setSelected(null); setPinError('') }}
            className="text-gray-400 text-sm underline"
          >
            ← Back
          </button>
        </div>
      ) : (
        <>
          {profiles.length === 0 ? (
            <p className="text-gray-400 text-center">No trainers yet. Add one below!</p>
          ) : (
            <div className="flex flex-wrap gap-4 justify-center">
              {profiles.map(p => {
                const battlesWon = p.stats?.battlesWon ?? 0
                const answered = p.stats?.questionsAnswered ?? 0
                const correct = p.stats?.questionsCorrect ?? 0
                const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null
                return (
                  <div key={p.id} className="flex flex-col items-center gap-2">
                    <ProfileCard
                      profile={p}
                      onClick={() => { setSelected(p); setPinError('') }}
                    />
                    <div className="flex gap-3 text-xs text-gray-400">
                      <span>⚔️ {battlesWon} wins</span>
                      {accuracy !== null && <span>🎯 {accuracy}%</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <button
            onClick={() => navigate('/add-profile')}
            className="bg-[#0f3460] border border-[#4ecdc4]/40 hover:border-yellow-400 text-[#4ecdc4] px-6 py-3 rounded-xl transition-all"
          >
            + Add New Trainer
          </button>
        </>
      )}
      <button
        onClick={() => navigate('/admin')}
        className="absolute bottom-4 right-4 text-gray-600 text-xs underline"
      >
        Parent Settings
      </button>
    </div>
  )
}
