import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import PokemonSprite from '../components/PokemonSprite'
import TypeBadge from '../components/TypeBadge'
import pokemonJson from '../data/pokemon.json'
import { PokemonData, PartyPokemon, BoxPokemon } from '../types/game'
import { buildPartyPokemon } from '../utils/exp'

type DexStatus = 'caught' | 'seen' | 'unseen'

const pokeMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p])
) as Record<number, PokemonData>

export default function Pokedex() {
  const navigate = useNavigate()
  const profile = useProfileStore(s => s.profile)
  const replacingPartyIdx = useProfileStore(s => s.replacingPartyIdx)
  const { updateProfile } = useFirestoreProfile()
  const [selected, setSelected] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const outerRef = useRef<HTMLDivElement>(null)
  const lastSelectedRef = useRef<number | null>(null)

  // After returning from detail view, scroll the previously-selected Pokemon into view.
  // Uses scrollIntoView so it works regardless of image load timing.
  useEffect(() => {
    if (selected !== null || lastSelectedRef.current === null) return
    const id = lastSelectedRef.current
    requestAnimationFrame(() => {
      const el = outerRef.current?.querySelector<HTMLElement>(`[data-pkid="${id}"]`)
      el?.scrollIntoView({ block: 'center', behavior: 'instant' })
    })
  }, [selected])

  const dex = profile?.pokedex ?? {}
  const party = profile?.party ?? [] as PartyPokemon[]
  const box = (profile?.box ?? []) as BoxPokemon[]
  const gen1 = (pokemonJson as PokemonData[]).filter(p => p.id <= 151).sort((a, b) => a.id - b.id)
  const caughtCount = Object.values(dex).filter(v => v === 'caught').length
  const detail = selected ? (pokemonJson as PokemonData[]).find(p => p.id === selected) : null
  const detailStatus: DexStatus = selected ? ((dex[selected] ?? 'unseen') as DexStatus) : 'unseen'

  const isReplacing = replacingPartyIdx >= 0

  // Which pokemon IDs are in the active party
  const partyIds = new Set(party.map(p => p.pokemonId))
  // Which pokemon IDs are in the box
  const boxMap = new Map(box.map((b, i) => [b.pokemonId, i]))

  async function handleReplaceSelect(boxIdx: number) {
    if (!profile?.id) return
    const replacing = party[replacingPartyIdx]
    const incoming = box[boxIdx]
    if (!replacing || !incoming) return

    setBusy(true)
    const info = pokeMap[incoming.pokemonId]
    const built = info ? buildPartyPokemon(info, incoming.level) : null
    const incomingPartyMon: PartyPokemon = {
      pokemonId: incoming.pokemonId, nickname: incoming.nickname,
      level: incoming.level, xp: incoming.xp,
      currentHp: built?.maxHp ?? 50, maxHp: built?.maxHp ?? 50,
      moves: built?.moves ?? [], heldItem: null, status: null, sleepTurns: 0,
    }
    const outgoingBox: BoxPokemon = {
      pokemonId: replacing.pokemonId, nickname: replacing.nickname,
      level: replacing.level, xp: replacing.xp,
    }
    const newParty = party.map((p, i) => i === replacingPartyIdx ? incomingPartyMon : p)
    const newBox = box.map((b, i) => i === boxIdx ? outgoingBox : b)

    try {
      await updateProfile(profile.id, { party: newParty, box: newBox })
      useProfileStore.getState().setProfile({ ...profile, party: newParty, box: newBox })
      useProfileStore.getState().setReplacingPartyIdx(-1)
      navigate('/team')
    } catch { /* silent */ }
    setBusy(false)
  }

  function handleBack() {
    if (selected) {
      lastSelectedRef.current = selected
      setSelected(null)
      return
    }
    if (isReplacing) {
      useProfileStore.getState().setReplacingPartyIdx(-1)
      navigate('/team')
      return
    }
    navigate('/map')
  }

  return (
    <div ref={outerRef} className="fixed inset-0 bg-[#1a1a2e] overflow-y-auto flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>

      {/* Header */}
      <div className="bg-[#0f3460] px-4 py-3 grid grid-cols-3 items-center border-b border-yellow-400/20 flex-shrink-0">
        <button onClick={handleBack} className="text-yellow-400 font-bold text-xl text-left">Back</button>
        <h1 className="text-yellow-400 font-bold text-lg text-center">
          {isReplacing ? 'Choose a replacement' : 'Pokédex'}
        </h1>
        {!isReplacing
          ? <span className="text-gray-400 text-sm text-right">{caughtCount}/{gen1.length}</span>
          : <div />}
      </div>

      {/* Replacement mode banner */}
      {isReplacing && (
        <div className="bg-[#4ecdc4]/10 border-b border-[#4ecdc4]/30 px-4 py-2">
          <p className="text-[#4ecdc4] text-sm text-center">
            Tap a Pokemon from your Box to swap it into your team
          </p>
        </div>
      )}

      {/* Detail view */}
      {detail && !isReplacing ? (
        <div className="flex flex-col items-center p-6 gap-4 overflow-y-auto">
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${
            detailStatus === 'caught' ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
            'bg-gray-700/40 text-gray-400 border border-gray-600/40'
          }`}>
            {detailStatus === 'caught' ? 'Caught' : 'Not caught yet'}
          </div>
          <div className={detailStatus !== 'caught' ? 'opacity-70' : ''}>
            <PokemonSprite pokemonId={detail.id} variant="artwork" size={180} />
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">#{String(detail.id).padStart(3, '0')}</p>
            <h2 className="text-white text-2xl font-bold capitalize">{detail.name}</h2>
            <div className="flex gap-2 justify-center mt-2">
              {detail.types?.map(t => <TypeBadge key={t} type={t} />)}
            </div>
          </div>
          <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-2xl">
            <p className="text-yellow-400 font-bold mb-3 text-sm">Base Stats</p>
            {([
              ['HP', detail.baseStats?.hp], ['Attack', detail.baseStats?.atk],
              ['Defense', detail.baseStats?.def], ['Sp. Atk', detail.baseStats?.spAtk],
              ['Sp. Def', detail.baseStats?.spDef], ['Speed', detail.baseStats?.spd],
            ] as [string, number][]).map(([label, val]) => (
              <div key={label} className="flex items-center gap-2 mb-1">
                <span className="text-gray-400 text-xs w-14">{label}</span>
                <div className="flex-1 bg-gray-700 rounded-full h-2">
                  <div className="bg-[#4ecdc4] h-2 rounded-full"
                    style={{ width: `${Math.min(100, (val / 255) * 100)}%` }} />
                </div>
                <span className="text-white text-xs w-6 text-right">{val}</span>
              </div>
            ))}
          </div>
          {detail.evolvesAtLevel && detail.evolvesTo && (
            <div className="bg-[#16213e] rounded-xl p-4 w-full max-w-2xl">
              <p className="text-yellow-400 font-bold mb-2 text-sm">Evolution</p>
              <div className="flex items-center gap-4 justify-center">
                <PokemonSprite pokemonId={detail.id} variant="sprite" size={56} />
                <p className="text-white">Lv.{detail.evolvesAtLevel} &#x2192;</p>
                <PokemonSprite pokemonId={detail.evolvesTo} variant="sprite" size={56} />
              </div>
            </div>
          )}
        </div>

      ) : isReplacing ? (
        /* Replacement mode: show Box pokemon as selectable, party as "In Team" */
        <div className="p-4 flex flex-col gap-4">

          {/* Active party — informational, show what's being replaced */}
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase mb-2">Active Team</p>
            <div className="grid grid-cols-3 gap-2">
              {party.map((p, i) => {
                const inf = pokeMap[p.pokemonId]
                const isTarget = i === replacingPartyIdx
                return (
                  <div key={i} className={`rounded-xl p-2 flex flex-col items-center gap-1 border ${
                    isTarget
                      ? 'bg-red-900/30 border-red-500/60'
                      : 'bg-[#16213e] border-[#2a3a5a]'
                  }`}>
                    <PokemonSprite pokemonId={p.pokemonId} variant="sprite" size={44} />
                    <p className="text-white text-xs capitalize truncate w-full text-center">
                      {p.nickname ?? inf?.name ?? 'Pokemon'}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                      isTarget
                        ? 'bg-red-500/30 text-red-300'
                        : 'bg-[#4ecdc4]/20 text-[#4ecdc4]'
                    }`}>
                      {isTarget ? 'Replacing' : 'In Team'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Box — selectable */}
          {box.length > 0 ? (
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase mb-2">
                My Box — tap to replace
              </p>
              <div className="grid grid-cols-3 gap-2">
                {box.map((b, i) => {
                  const inf = pokeMap[b.pokemonId]
                  return (
                    <button
                      key={i}
                      onClick={() => handleReplaceSelect(i)}
                      disabled={busy}
                      className="bg-[#16213e] border border-[#4ecdc4]/40 hover:border-yellow-400 rounded-xl p-2 flex flex-col items-center gap-1 transition-all disabled:opacity-50"
                    >
                      <PokemonSprite pokemonId={b.pokemonId} variant="sprite" size={44} />
                      <p className="text-white text-xs capitalize truncate w-full text-center">
                        {b.nickname ?? inf?.name ?? 'Pokemon'}
                      </p>
                      <span className="text-xs text-yellow-400 font-bold">Lv.{b.level}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 font-bold">
                        {busy ? '...' : 'Select'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Your Box is empty.</p>
              <p className="text-gray-500 text-xs mt-1">Catch more Pokemon to fill your Box!</p>
            </div>
          )}
        </div>

      ) : (
        /* Normal Pokedex grid — all 151 */
        <div className="grid grid-cols-4 gap-2 p-4 overflow-y-auto">
          {gen1.map(p => {
            const status = (dex[p.id] ?? 'unseen') as DexStatus
            const inParty = partyIds.has(p.id)
            const inBox = boxMap.has(p.id)
            return (
              <button key={p.id}
                data-pkid={p.id}
                onClick={() => setSelected(p.id)}
                className={`bg-[#16213e] rounded-xl p-2 flex flex-col items-center border transition-all hover:border-yellow-400
                  ${status === 'caught' ? 'border-green-500/40' :
                    status === 'seen'   ? 'border-blue-500/20' : 'border-gray-700/20'}`}
              >
                <div className={status === 'caught' ? '' : 'grayscale opacity-40'}>
                  <PokemonSprite pokemonId={p.id} variant="sprite" size={40} />
                </div>
                <p className={`text-xs mt-1 capitalize ${status === 'caught' ? 'text-gray-300' : status === 'seen' ? 'text-blue-400' : 'text-gray-600'}`}>
                  {status === 'unseen' ? `#${String(p.id).padStart(3,'0')}` : p.name}
                </p>
                {inParty && (
                  <span className="text-xs px-1 py-0.5 mt-0.5 rounded bg-[#4ecdc4]/20 text-[#4ecdc4] font-bold leading-none">
                    Team
                  </span>
                )}
                {inBox && !inParty && (
                  <span className="text-xs px-1 py-0.5 mt-0.5 rounded bg-yellow-400/20 text-yellow-300 font-bold leading-none">
                    Box
                  </span>
                )}
                {status === 'caught' && !inParty && !inBox && (
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-0.5" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
