import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useProfileStore } from '../store/profileStore'
import { useTrades } from '../hooks/useTrades'
import PokemonSprite from '../components/PokemonSprite'
import type { TradeOffer, PartyPokemon } from '../types/game'
import pokemonJson from '../data/pokemon.json'
import type { PokemonData } from '../types/game'

const pokeMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p])
) as Record<number, PokemonData>

function pokeName(p: PartyPokemon) {
  return p.nickname ?? pokeMap[p.pokemonId]?.name ?? 'Pokémon'
}

export default function Trade() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const profile = useProfileStore(s => s.profile)
  const { acceptOffer } = useTrades()

  const [offer, setOffer] = useState<TradeOffer | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [phase, setPhase] = useState<'pick' | 'confirm' | 'success' | 'error'>('pick')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const offerId = params.get('offerId')
    if (!offerId) { navigate('/map'); return }
    getDoc(doc(db, 'trades', offerId)).then(snap => {
      if (!snap.exists() || snap.data().status !== 'pending') {
        navigate('/map')
        return
      }
      setOffer({ id: snap.id, ...snap.data() } as TradeOffer)
    })
  }, [params, navigate])

  if (!profile || !offer) {
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] flex items-center justify-center">
        <p className="text-white">Loading…</p>
      </div>
    )
  }

  const party = profile.party ?? []

  async function confirmTrade() {
    if (selectedIdx === null || !offer || !profile?.id) return
    setBusy(true)
    try {
      await acceptOffer(
        offer.id,
        offer.offererProfileId,
        offer.offeredPartyIdx,
        offer.offeredPokemon,
        profile.id,
        party,
        selectedIdx,
      )
      // Refresh local profile party
      const snap = await getDoc(doc(db, 'profiles', profile.id))
      if (snap.exists()) {
        useProfileStore.getState().setProfile({ id: snap.id, ...snap.data() } as typeof profile)
      }
      setPhase('success')
    } catch {
      setPhase('error')
    }
    setBusy(false)
  }

  if (phase === 'success') {
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center gap-6 p-6">
        <div className="text-6xl">🎉</div>
        <p className="text-white text-xl font-bold text-center">Trade complete!</p>
        <p className="text-gray-400 text-center">
          You received <span className="text-yellow-400">{pokeName(offer.offeredPokemon)}</span>!
        </p>
        <button
          onClick={() => navigate('/team')}
          className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl"
        >
          View My Team
        </button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center gap-6 p-6">
        <p className="text-red-400 text-xl font-bold">Trade failed</p>
        <p className="text-gray-400 text-center text-sm">The offer may have been cancelled.</p>
        <button onClick={() => navigate('/map')} className="text-yellow-400 font-bold">Back to Map</button>
      </div>
    )
  }

  if (phase === 'confirm' && selectedIdx !== null) {
    const myPokemon = party[selectedIdx]
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col items-center justify-center gap-6 p-6">
        <h2 className="text-white text-xl font-bold">Confirm Trade</h2>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <PokemonSprite pokemonId={offer.offeredPokemon.pokemonId} variant="artwork" size={80} />
            <p className="text-yellow-400 text-sm font-bold">{pokeName(offer.offeredPokemon)}</p>
            <p className="text-gray-400 text-xs">from {offer.offererProfileName}</p>
          </div>
          <div className="text-white text-3xl">↔</div>
          <div className="flex flex-col items-center gap-2">
            <PokemonSprite pokemonId={myPokemon.pokemonId} variant="artwork" size={80} />
            <p className="text-yellow-400 text-sm font-bold">{pokeName(myPokemon)}</p>
            <p className="text-gray-400 text-xs">yours</p>
          </div>
        </div>
        <p className="text-gray-400 text-xs text-center">Friendship resets to 70 for traded Pokémon.</p>
        <div className="flex gap-4">
          <button
            onClick={() => setPhase('pick')}
            className="border border-gray-600 text-gray-400 px-6 py-3 rounded-xl font-bold"
          >
            Back
          </button>
          <button
            onClick={confirmTrade}
            disabled={busy}
            className="bg-yellow-400 text-black font-bold px-8 py-3 rounded-xl disabled:opacity-50"
          >
            {busy ? 'Trading…' : 'Confirm!'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a2e] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="bg-[#0f3460] px-4 py-3 flex items-center gap-3 border-b border-yellow-400/20">
        <button onClick={() => navigate('/map')} className="text-yellow-400 font-bold text-xl">✕</button>
        <h1 className="text-yellow-400 font-bold text-lg">Incoming Trade</h1>
      </div>

      <div className="flex flex-col items-center gap-4 p-6">
        <p className="text-gray-400 text-sm text-center">
          <span className="text-white font-bold">{offer.offererProfileName}</span> wants to trade:
        </p>
        <PokemonSprite pokemonId={offer.offeredPokemon.pokemonId} variant="artwork" size={100} />
        <p className="text-white text-xl font-bold">{pokeName(offer.offeredPokemon)}</p>
        <p className="text-gray-400 text-sm">Lv. {offer.offeredPokemon.level}</p>
      </div>

      <p className="text-gray-400 text-sm text-center px-4">Choose a Pokémon to trade:</p>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {party.map((mon, idx) => (
          <button
            key={idx}
            onClick={() => { setSelectedIdx(idx); setPhase('confirm') }}
            disabled={party.length <= 1}
            className="flex items-center gap-4 bg-[#16213e] rounded-xl p-4 border border-[#2a3a5a] text-left disabled:opacity-40"
          >
            <PokemonSprite pokemonId={mon.pokemonId} variant="sprite" size={48} />
            <div>
              <p className="text-white font-bold">{pokeName(mon)}</p>
              <p className="text-gray-400 text-sm">Lv. {mon.level} · {mon.currentHp}/{mon.maxHp} HP</p>
            </div>
          </button>
        ))}
        {party.length <= 1 && (
          <p className="text-gray-500 text-sm text-center">You need at least 2 Pokémon to trade.</p>
        )}
      </div>
    </div>
  )
}
