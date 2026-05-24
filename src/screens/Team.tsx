import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import PokemonSprite from '../components/PokemonSprite'
import HpBar from '../components/HpBar'
import TypeBadge from '../components/TypeBadge'
import pokemonJson from '../data/pokemon.json'
import movesJson from '../data/moves.json'
import { buildPartyPokemon } from '../utils/exp'
import { PokemonData, MoveData } from '../types/game'

const pokeMap = Object.fromEntries((pokemonJson as PokemonData[]).map(p => [p.id, p])) as Record<number, PokemonData>
const moveMap = Object.fromEntries((movesJson as MoveData[]).map(m => [m.id, m])) as Record<string, MoveData>

export default function Team() {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.profile)
  const { updateProfile } = useFirestoreProfile()
  const [selected, setSelected] = useState<number | null>(null)
  const [settingLead, setSettingLead] = useState(false)
  const party = profile?.party ?? []
  const mon = selected !== null ? party[selected] : null
  const info = mon ? pokeMap[mon.pokemonId] : null

  async function setAsLead(index: number) {
    if (!profile?.id || index === 0 || index >= party.length) return
    setSettingLead(true)
    const newParty = [party[index], ...party.filter((_, i) => i !== index)]
    try {
      await updateProfile(profile.id, { party: newParty })
      useProfileStore.getState().setProfile({ ...profile, party: newParty })
      setSelected(null)
    } catch { /* silent */ }
    setSettingLead(false)
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      <div className="bg-[#0f3460] px-4 py-3 flex items-center gap-3 border-b border-yellow-400/20 flex-shrink-0">
        <button onClick={() => selected !== null ? setSelected(null) : navigate('/map')}
          className="text-yellow-400 font-bold text-xl">←</button>
        <h1 className="text-yellow-400 font-bold text-lg">
          {selected !== null ? (mon?.nickname ?? info?.name ?? 'Pokémon') : 'My Team'}
        </h1>
      </div>

      {selected !== null && mon && info ? (
        <div className="flex flex-col items-center p-6 gap-4 overflow-y-auto">
          <PokemonSprite pokemonId={mon.pokemonId} variant="artwork" size={150} />
          <div className="text-center">
            {mon.nickname && <p className="text-gray-400 text-sm capitalize">{info.name}</p>}
            <h2 className="text-white text-2xl font-bold capitalize">{mon.nickname ?? info.name}</h2>
            <p className="text-yellow-400 font-bold text-lg">Lv. {mon.level}</p>
            <div className="flex gap-2 justify-center mt-2">
              {info.types?.map(t => <TypeBadge key={t} type={t} />)}
            </div>
          </div>
          <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-sm">
            <p className="text-yellow-400 font-bold mb-2 text-sm">HP</p>
            <HpBar
              current={mon.currentHp ?? buildPartyPokemon(info, mon.level).maxHp}
              max={buildPartyPokemon(info, mon.level).maxHp}
            />
            <p className="text-white text-sm mt-1">
              {mon.currentHp ?? '?'} / {buildPartyPokemon(info, mon.level).maxHp}
            </p>
          </div>
          <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-sm">
            <p className="text-yellow-400 font-bold mb-2 text-sm">Moves</p>
            <div className="grid grid-cols-2 gap-2">
              {mon.moves.map((m, i) => {
                const mv = moveMap[m.moveId]
                return mv ? (
                  <div key={i} className="bg-[#0f3460] rounded-lg p-2 border border-[#4ecdc4]/20">
                    <TypeBadge type={mv.type} />
                    <p className="text-white text-xs font-bold mt-1 capitalize">{mv.name}</p>
                    <p className="text-gray-400 text-xs">PP {m.pp}/{m.maxPp}</p>
                  </div>
                ) : null
              })}
            </div>
          </div>
          {selected !== null && selected !== 0 && (
            <button
              onClick={() => setAsLead(selected)}
              disabled={settingLead}
              className="bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl w-full max-w-sm disabled:opacity-50"
            >
              {settingLead ? 'Switching...' : '⚔ Set as Lead (Use in Battle)'}
            </button>
          )}
          {selected !== null && selected === 0 && (
            <div className="text-yellow-400 text-sm text-center w-full max-w-sm py-2">
              ⚔ Currently leading in battle
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {party.map((p, i) => {
            const inf = pokeMap[p.pokemonId]
            const maxHp = inf ? buildPartyPokemon(inf, p.level).maxHp : 50
            return (
              <button key={i} onClick={() => setSelected(i)}
                className="bg-[#16213e] border border-[#4ecdc4]/20 hover:border-yellow-400 rounded-xl p-3 flex items-center gap-3 transition-all"
              >
                <PokemonSprite pokemonId={p.pokemonId} variant="sprite" size={52} />
                <div className="flex-1 text-left">
                  <p className="text-white font-bold capitalize">{p.nickname ?? inf?.name ?? 'Pokémon'}</p>
                  <HpBar current={p.currentHp ?? maxHp} max={maxHp} />
                </div>
                <span className="text-yellow-400 font-bold text-sm">Lv.{p.level}</span>
              </button>
            )
          })}
          {party.length === 0 && (
            <p className="text-gray-500 text-center mt-16">No Pokémon in your party yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
