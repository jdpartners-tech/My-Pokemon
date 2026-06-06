import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'

export default function Progress() {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.profile)
  if (!profile) { navigate('/'); return null }

  const battlesWon    = profile.stats?.battlesWon       ?? 0
  const questAnswered = profile.stats?.questionsAnswered ?? 0
  const questCorrect  = profile.stats?.questionsCorrect  ?? 0
  const questWrong    = profile.stats?.questionsWrong    ?? 0
  const accuracy      = questAnswered > 0 ? Math.round(questCorrect / questAnswered * 100) : 0
  const pokedexCount  = Object.values(profile.pokedex ?? {}).filter(v => v === 'caught').length
  const money         = profile.money ?? 0
  const party         = profile.party ?? []
  const badges        = profile.badges ?? []

  return (
    <div
      className="fixed inset-0 bg-[#1a1a2e] overflow-y-auto flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      {/* Header — same pattern as Team / Pokédex */}
      <div className="bg-[#0f3460] px-4 py-3 grid grid-cols-3 items-center border-b border-yellow-400/20 flex-shrink-0">
        <button onClick={() => navigate('/map')} className="text-yellow-400 font-bold text-xl text-left">Back</button>
        <h1 className="text-yellow-400 font-bold text-lg text-center">{profile.name}'s Progress</h1>
        <div />
      </div>

      <div className="flex flex-col gap-4 p-4">

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard emoji="⚔️"  value={battlesWon}    label="Battles Won"    color="#4ecdc4" />
          <StatCard emoji="📖"  value={pokedexCount}  label="Pokédex Caught" color="#ffd700" />
          <StatCard emoji="💰"  value={`P${money}`}   label="Money"          color="#80c060" />
          <StatCard emoji="🎯"  value={`${accuracy}%`} label="Quiz Accuracy" color="#ff9f43" />
        </div>

        {/* Quiz detail */}
        <div className="bg-[#16213e] border border-[#2a3a5a] rounded-xl p-4">
          <div className="text-[#4ecdc4] font-bold text-base mb-3">Quiz Stats</div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-white font-bold text-xl">{questAnswered}</div>
              <div className="text-[#4a6a8a] text-sm">Answered</div>
            </div>
            <div>
              <div className="font-bold text-xl" style={{ color: '#58d040' }}>{questCorrect}</div>
              <div className="text-[#4a6a8a] text-sm">Correct</div>
            </div>
            <div>
              <div className="font-bold text-xl" style={{ color: '#e82020' }}>{questWrong}</div>
              <div className="text-[#4a6a8a] text-sm">Wrong</div>
            </div>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="bg-[#16213e] border border-[#2a3a5a] rounded-xl p-4">
            <div className="text-[#4ecdc4] font-bold text-base mb-3">Badges ({badges.length})</div>
            <div className="flex gap-3 flex-wrap">
              {badges.map((b, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 bg-yellow-400/20 border border-yellow-400/50 rounded-full flex items-center justify-center text-2xl">🏅</div>
                  <div className="text-white text-xs text-center">{b}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Team */}
        <div className="bg-[#16213e] border border-[#2a3a5a] rounded-xl p-4">
          <div className="text-[#4ecdc4] font-bold text-base mb-3">My Team</div>
          <div className="grid grid-cols-3 gap-3">
            {party.map((p, i) => (
              <div key={i} className="flex flex-col items-center bg-[#1a2540] rounded-xl p-3 gap-1">
                <img
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.pokemonId}.png`}
                  className="w-16 h-16"
                  style={{ imageRendering: 'pixelated' }}
                  alt=""
                />
                <div className="text-white text-sm font-semibold">Lv{p.level}</div>
                <div className="text-xs" style={{ color: (p.currentHp ?? 0) > 0 ? '#58d040' : '#e82020' }}>
                  {p.currentHp ?? 0}/{p.maxHp} HP
                </div>
              </div>
            ))}
            {party.length === 0 && (
              <div className="col-span-3 text-[#4a6a8a] text-sm text-center py-4">No Pokémon yet!</div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

function StatCard({ emoji, value, label, color }: { emoji: string; value: string | number; label: string; color: string }) {
  return (
    <div className="bg-[#16213e] rounded-xl p-4 text-center border border-[#2a3a5a]">
      <div className="text-3xl mb-1">{emoji}</div>
      <div className="font-bold text-2xl" style={{ color }}>{value}</div>
      <div className="text-[#4a6a8a] text-sm mt-1">{label}</div>
    </div>
  )
}
