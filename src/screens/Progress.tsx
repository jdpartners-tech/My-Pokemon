import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'

export default function Progress() {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.profile)
  if (!profile) { navigate('/'); return null }

  const battlesWon = profile.stats?.battlesWon ?? 0
  const pokedexCount = Object.values(profile.pokedex ?? {}).filter(v => v === 'caught').length
  const money = profile.money ?? 0
  const party = profile.party ?? []

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center p-4 gap-4">
      <div className="w-full max-w-sm flex justify-between items-center">
        <button onClick={() => navigate('/map')} className="text-[#4ecdc4] text-sm">← Back</button>
        <h1 className="text-yellow-400 font-bold text-lg">{profile.name}'s Adventure</h1>
        <div />
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
        <StatCard emoji="⚔️" value={battlesWon} label="Battles Won" color="#4ecdc4" />
        <StatCard emoji="📖" value={pokedexCount} label="Pokédex" color="#ffd700" />
        <StatCard emoji="💰" value={`₽${money}`} label="Pokédollars" color="#80c060" />
      </div>

      <div className="w-full max-w-sm bg-[#16213e] border border-[#2a3a5a] rounded-xl p-4">
        <div className="text-[#4ecdc4] font-bold text-sm mb-3">My Team</div>
        <div className="flex gap-3 flex-wrap">
          {party.map((p, i) => (
            <div key={i} className="flex flex-col items-center">
              <img
                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.pokemonId}.png`}
                className="w-12 h-12"
                style={{ imageRendering: 'pixelated' }}
                alt=""
              />
              <div className="text-white text-xs">Lv{p.level}</div>
              <div className="text-xs" style={{ color: p.currentHp > 0 ? '#80c060' : '#e82020' }}>
                {p.currentHp}/{p.maxHp}
              </div>
            </div>
          ))}
          {party.length === 0 && (
            <div className="text-[#4a6a8a] text-sm">No Pokémon yet!</div>
          )}
        </div>
      </div>

      {/* No wrong answers shown here — keep it encouraging, no pressure for kids */}
    </div>
  )
}

function StatCard({ emoji, value, label, color }: { emoji: string; value: string | number; label: string; color: string }) {
  return (
    <div className="bg-[#16213e] rounded-xl p-3 text-center border border-[#2a3a5a]">
      <div className="text-2xl">{emoji}</div>
      <div className="font-bold text-base" style={{ color }}>{value}</div>
      <div className="text-[#4a6a8a] text-xs">{label}</div>
    </div>
  )
}
