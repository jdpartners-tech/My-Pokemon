import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import PokemonSprite from '../components/PokemonSprite'
import TypeBadge from '../components/TypeBadge'
import pokemonJson from '../data/pokemon.json'
import { PokemonData } from '../types/game'

type DexStatus = 'caught' | 'seen' | 'unseen'

export default function Pokedex() {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.profile)
  const [selected, setSelected] = useState<number | null>(null)
  const dex = profile?.pokedex ?? {}
  const gen1 = (pokemonJson as PokemonData[]).filter(p => p.id <= 151).sort((a, b) => a.id - b.id)
  const caughtCount = Object.values(dex).filter(v => v === 'caught').length
  const detail = selected ? (pokemonJson as PokemonData[]).find(p => p.id === selected) : null

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      <div className="bg-[#0f3460] px-4 py-3 flex items-center gap-3 border-b border-yellow-400/20 flex-shrink-0">
        <button onClick={() => selected ? setSelected(null) : navigate('/map')}
          className="text-yellow-400 font-bold text-xl">←</button>
        <h1 className="text-yellow-400 font-bold text-lg flex-1">Pokédex</h1>
        <span className="text-gray-400 text-sm">{caughtCount}/{gen1.length}</span>
      </div>

      {detail ? (
        <div className="flex flex-col items-center p-6 gap-4 overflow-y-auto">
          <PokemonSprite pokemonId={detail.id} variant="artwork" size={180} />
          <div className="text-center">
            <p className="text-gray-400 text-sm">#{String(detail.id).padStart(3,'0')}</p>
            <h2 className="text-white text-2xl font-bold capitalize">{detail.name}</h2>
            <div className="flex gap-2 justify-center mt-2">
              {detail.types?.map(t => <TypeBadge key={t} type={t} />)}
            </div>
          </div>
          <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-sm">
            <p className="text-yellow-400 font-bold mb-3 text-sm">Base Stats</p>
            {([ ['HP', detail.baseStats?.hp], ['Attack', detail.baseStats?.atk],
                 ['Defense', detail.baseStats?.def], ['Sp. Atk', detail.baseStats?.spAtk],
                 ['Sp. Def', detail.baseStats?.spDef], ['Speed', detail.baseStats?.spd],
              ] as [string, number | undefined][]).map(([label, val]) => (
              <div key={label} className="flex items-center gap-2 mb-2">
                <span className="text-gray-400 text-xs w-16 flex-shrink-0">{label}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div className="bg-[#4ecdc4] h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, ((val ?? 0) / 200) * 100)}%` }} />
                </div>
                <span className="text-white text-xs w-6 text-right">{val ?? '?'}</span>
              </div>
            ))}
          </div>
          {detail.evolvesAtLevel && detail.evolvesTo && (
            <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-sm">
              <p className="text-yellow-400 font-bold mb-2 text-sm">Evolution</p>
              <div className="flex items-center gap-4 justify-center">
                <PokemonSprite pokemonId={detail.id} variant="sprite" size={56} />
                <p className="text-white">→ Lv.{detail.evolvesAtLevel}</p>
                <PokemonSprite pokemonId={detail.evolvesTo} variant="sprite" size={56} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 p-4 overflow-y-auto">
          {gen1.map(p => {
            const status = (dex[p.id] ?? 'unseen') as DexStatus
            return (
              <button key={p.id}
                onClick={() => status !== 'unseen' && setSelected(p.id)}
                className={`bg-[#16213e] rounded-xl p-2 flex flex-col items-center border transition-all
                  ${status === 'caught' ? 'border-green-500/40 hover:border-yellow-400' :
                    status === 'seen'   ? 'border-blue-500/20' : 'border-gray-700/20'}`}
              >
                <div className={status === 'caught' ? '' : 'grayscale opacity-30'}>
                  <PokemonSprite pokemonId={p.id} variant="sprite" size={40} />
                </div>
                <p className={`text-xs mt-1 ${status === 'caught' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {status === 'caught' ? `#${String(p.id).padStart(3,'0')}` : '???'}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
