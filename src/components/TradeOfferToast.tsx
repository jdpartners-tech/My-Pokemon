import type { TradeOffer } from '../types/game'
import pokemonJson from '../data/pokemon.json'
import type { PokemonData } from '../types/game'

const pokeMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p])
) as Record<number, PokemonData>

interface Props {
  offer: TradeOffer
  onTap: () => void
  onDismiss: () => void
}

export default function TradeOfferToast({ offer, onTap, onDismiss }: Props) {
  const pokeName = offer.offeredPokemon.nickname
    ?? pokeMap[offer.offeredPokemon.pokemonId]?.name
    ?? 'a Pokémon'

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#0f3460',
        border: '2px solid #c8a820',
        borderRadius: 16,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        maxWidth: 320,
        width: 'calc(100vw - 32px)',
        cursor: 'pointer',
      }}
      onClick={onTap}
    >
      <span style={{ fontSize: 28 }}>🔄</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ color: '#c8a820', fontWeight: 700, fontSize: 13, margin: 0 }}>
          Trade offer!
        </p>
        <p style={{ color: '#fff', fontSize: 12, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {offer.offererProfileName} wants to trade {pokeName}
        </p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onDismiss() }}
        style={{ color: '#4a6a8a', fontWeight: 700, fontSize: 18, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
      >
        ✕
      </button>
    </div>
  )
}
