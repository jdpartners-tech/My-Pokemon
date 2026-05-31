import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
const setReplacingPartyIdx = (idx: number) => useProfileStore.getState().setReplacingPartyIdx(idx)
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import PokemonSprite from '../components/PokemonSprite'
import HpBar from '../components/HpBar'
import TypeBadge from '../components/TypeBadge'
import pokemonJson from '../data/pokemon.json'
import movesJson from '../data/moves.json'
import { buildPartyPokemon, expForLevel } from '../utils/exp'
import { PokemonData, MoveData, PartyPokemon, BoxPokemon } from '../types/game'

const pokeMap = Object.fromEntries((pokemonJson as PokemonData[]).map(p => [p.id, p])) as Record<number, PokemonData>
const moveMap = Object.fromEntries((movesJson as MoveData[]).map(m => [m.id, m])) as Record<string, MoveData>

type Mode =
  | { type: 'list' }
  | { type: 'party-detail'; idx: number }
  | { type: 'box-detail'; idx: number }
  | { type: 'swap-pick'; boxIdx: number }   // pick which party slot to replace

export default function Team() {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.profile)
  const { updateProfile } = useFirestoreProfile()
  const [mode, setMode] = useState<Mode>({ type: 'list' })
  const [busy, setBusy] = useState(false)

  const party = profile?.party ?? [] as PartyPokemon[]
  const box   = (profile?.box ?? []) as BoxPokemon[]

  // ── helpers ──────────────────────────────────────────────────────────────

  function toBox(p: PartyPokemon): BoxPokemon {
    return { pokemonId: p.pokemonId, nickname: p.nickname, level: p.level, xp: p.xp }
  }
  function toParty(b: BoxPokemon): PartyPokemon {
    const info = pokeMap[b.pokemonId]
    const built = info ? buildPartyPokemon(info, b.level) : null
    return {
      pokemonId: b.pokemonId, nickname: b.nickname, level: b.level, xp: b.xp,
      currentHp: built?.maxHp ?? 50, maxHp: built?.maxHp ?? 50,
      moves: built?.moves ?? [], heldItem: null, status: null, sleepTurns: 0,
    }
  }

  async function save(newParty: PartyPokemon[], newBox: BoxPokemon[]) {
    if (!profile?.id) return
    setBusy(true)
    try {
      await updateProfile(profile.id, { party: newParty, box: newBox })
      useProfileStore.getState().setProfile({ ...profile, party: newParty, box: newBox })
    } catch { /* silent */ }
    setBusy(false)
    setMode({ type: 'list' })
  }

  async function setAsLead(idx: number) {
    if (idx === 0 || idx >= party.length) return
    const newParty = [party[idx], ...party.filter((_, i) => i !== idx)]
    await save(newParty, box)
  }


  async function addToParty(boxIdx: number) {
    if (party.length >= 6) return
    const mon = box[boxIdx]
    const newParty: PartyPokemon[] = [...party, toParty(mon)]
    const newBox = box.filter((_, i) => i !== boxIdx)
    await save(newParty, newBox)
  }

  async function swapBoxWithParty(boxIdx: number, partyIdx: number) {
    const boxMon   = box[boxIdx]
    const partyMon = party[partyIdx]
    const newParty: PartyPokemon[] = party.map((p, i) => i === partyIdx ? toParty(boxMon) : p)
    const newBox:   BoxPokemon[]   = box.map((b, i) => i === boxIdx ? toBox(partyMon) : b)
    await save(newParty, newBox)
  }

  // ── header title ──────────────────────────────────────────────────────────
  function title() {
    if (mode.type === 'party-detail') {
      const mon = party[mode.idx]
      return mon?.nickname ?? pokeMap[mon?.pokemonId]?.name ?? 'Pokemon'
    }
    if (mode.type === 'box-detail') {
      const mon = box[mode.idx]
      return mon?.nickname ?? pokeMap[mon?.pokemonId]?.name ?? 'Pokemon'
    }
    if (mode.type === 'swap-pick') return 'Choose who to replace'
    return 'My Team'
  }

  function goBack() {
    if (mode.type === 'list') navigate('/map')
    else if (mode.type === 'swap-pick') setMode({ type: 'list' })
    else setMode({ type: 'list' })
  }

  // ── Pokemon detail card (reused for party + box) ──────────────────────────
  function DetailView({ mon, isParty, partyIdx }: { mon: PartyPokemon; isParty: boolean; partyIdx?: number }) {
    const info = pokeMap[mon.pokemonId]
    if (!info) return null
    const built = buildPartyPokemon(info, mon.level)
    const fl = expForLevel(mon.level)
    const cl = expForLevel(mon.level + 1)
    const xpPct = Math.min(100, Math.max(0, (mon.xp - fl) / (cl - fl) * 100))

    return (
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

        <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-2xl">
          <p className="text-yellow-400 font-bold mb-2 text-sm">HP</p>
          <HpBar current={mon.currentHp ?? built.maxHp} max={built.maxHp} />
          <p className="text-white text-sm mt-1">{mon.currentHp ?? '?'} / {built.maxHp}</p>
        </div>

        <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-2xl">
          <p className="text-yellow-400 font-bold mb-2 text-sm">Experience</p>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Lv.{mon.level}</span><span>Lv.{mon.level + 1}</span>
          </div>
          <div style={{ background: '#404030', height: 8, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${xpPct}%`, height: '100%', background: '#6890f0' }} />
          </div>
          <p className="text-white text-xs mt-1">{mon.xp} XP · Need {cl - mon.xp} more</p>
        </div>

        <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-2xl">
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

        {isParty && typeof partyIdx === 'number' && (
          <div className="flex flex-col gap-2 w-full max-w-2xl">
            {partyIdx !== 0 && (
              <button onClick={() => setAsLead(partyIdx)} disabled={busy}
                className="bg-yellow-400 text-black font-bold py-3 px-6 rounded-xl disabled:opacity-50">
                {busy ? 'Switching...' : 'Set as Lead (Use in Battle)'}
              </button>
            )}
            {partyIdx === 0 && (
              <div className="text-yellow-400 text-sm text-center py-2">★ Currently leading in battle</div>
            )}
            <button
              onClick={() => {
                setReplacingPartyIdx(partyIdx)
                navigate('/pokedex')
              }}
              className="bg-[#16213e] border border-[#4ecdc4]/40 text-[#4ecdc4] font-bold py-3 px-6 rounded-xl"
            >
              Replace with another Pokemon
            </button>
          </div>
        )}

        {!isParty && (
          <div className="flex flex-col gap-2 w-full max-w-2xl">
            {party.length < 6 ? (
              <button onClick={() => addToParty(mode.type === 'box-detail' ? mode.idx : 0)} disabled={busy}
                className="bg-[#4ecdc4] text-black font-bold py-3 px-6 rounded-xl disabled:opacity-50">
                {busy ? '...' : 'Add to Active Team'}
              </button>
            ) : (
              <button onClick={() => setMode({ type: 'swap-pick', boxIdx: mode.type === 'box-detail' ? mode.idx : 0 })}
                className="bg-[#4ecdc4] text-black font-bold py-3 px-6 rounded-xl">
                Swap into Active Team
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#1a1a2e] overflow-y-auto flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="bg-[#0f3460] px-4 py-3 flex items-center gap-3 border-b border-yellow-400/20 flex-shrink-0">
        <button onClick={goBack} className="text-yellow-400 font-bold text-xl">Back</button>
        <h1 className="text-yellow-400 font-bold text-lg">{title()}</h1>
      </div>

      {/* Party detail */}
      {mode.type === 'party-detail' && party[mode.idx] && (
        <DetailView mon={party[mode.idx]} isParty partyIdx={mode.idx} />
      )}

      {/* Box detail */}
      {mode.type === 'box-detail' && box[mode.idx] && (
        <DetailView mon={toParty(box[mode.idx])} isParty={false} />
      )}

      {/* Swap: pick which party slot to replace */}
      {mode.type === 'swap-pick' && (
        <div className="flex flex-col gap-3 p-4">
          <p className="text-gray-400 text-sm text-center">Tap a team member to swap them to the Box</p>
          {party.map((p, i) => {
            const inf = pokeMap[p.pokemonId]
            const maxHp = inf ? buildPartyPokemon(inf, p.level).maxHp : 50
            return (
              <button key={i} onClick={() => swapBoxWithParty(mode.boxIdx, i)} disabled={busy}
                className="bg-[#16213e] border border-yellow-400/60 hover:border-yellow-400 rounded-xl p-3 flex items-center gap-3 transition-all disabled:opacity-50">
                <PokemonSprite pokemonId={p.pokemonId} variant="sprite" size={52} />
                <div className="flex-1 text-left">
                  <p className="text-white font-bold capitalize">{p.nickname ?? inf?.name ?? 'Pokemon'}</p>
                  <HpBar current={p.currentHp ?? maxHp} max={maxHp} />
                </div>
                <span className="text-yellow-400 font-bold text-sm">Lv.{p.level}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Main list: party + box */}
      {mode.type === 'list' && (
        <div className="flex flex-col gap-4 p-4">

          {/* Active Party */}
          <div>
            <p className="text-yellow-400 font-bold text-sm mb-2">
              Active Party ({party.length}/6)
            </p>
            <div className="flex flex-col gap-2">
              {party.map((p, i) => {
                const inf = pokeMap[p.pokemonId]
                const maxHp = inf ? buildPartyPokemon(inf, p.level).maxHp : 50
                return (
                  <button key={i} onClick={() => setMode({ type: 'party-detail', idx: i })}
                    className="bg-[#16213e] border border-[#4ecdc4]/20 hover:border-yellow-400 rounded-xl p-3 flex items-center gap-3 transition-all">
                    {i === 0 && <span className="text-yellow-400 text-xs">★</span>}
                    <PokemonSprite pokemonId={p.pokemonId} variant="sprite" size={52} />
                    <div className="flex-1 text-left">
                      <p className="text-white font-bold capitalize">{p.nickname ?? inf?.name ?? 'Pokemon'}</p>
                      <HpBar current={p.currentHp ?? maxHp} max={maxHp} />
                    </div>
                    <span className="text-yellow-400 font-bold text-sm">Lv.{p.level}</span>
                  </button>
                )
              })}
              {party.length === 0 && (
                <p className="text-gray-500 text-center py-4">No Pokemon in your party yet.</p>
              )}
            </div>
          </div>

          {/* Box */}
          {box.length > 0 && (
            <div>
              <p className="text-[#4ecdc4] font-bold text-sm mb-2">
                My Box ({box.length})
                {party.length < 6 && <span className="text-gray-400 font-normal ml-2">· Tap to add to team</span>}
                {party.length >= 6 && <span className="text-gray-400 font-normal ml-2">· Tap to swap into team</span>}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {box.map((p, i) => {
                  const inf = pokeMap[p.pokemonId]
                  return (
                    <button key={i} onClick={() => setMode({ type: 'box-detail', idx: i })}
                      className="bg-[#16213e] border border-[#2a3a5a] hover:border-[#4ecdc4] rounded-xl p-3 flex flex-col items-center gap-1 transition-all">
                      <PokemonSprite pokemonId={p.pokemonId} variant="sprite" size={52} />
                      <p className="text-white text-xs font-bold capitalize">{p.nickname ?? inf?.name ?? 'Pokemon'}</p>
                      <p className="text-gray-400 text-xs">Lv.{p.level}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
