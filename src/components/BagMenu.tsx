import itemsJson from '../data/items.json'
import type { BagItem, ItemData } from '../types/game'

const ITEMS = itemsJson as ItemData[]

const ITEM_SPRITE: Record<string, string> = {
  'pokeball':     'poke-ball',
  'potion':       'potion',
  'super-potion': 'super-potion',
  'hyper-potion': 'hyper-potion',
  'revive':       'revive',
}

const ITEM_COLOR: Record<string, string> = {
  'pokeball':     '#e82020',
  'potion':       '#4ecdc4',
  'super-potion': '#4e8cdc',
  'hyper-potion': '#a04edc',
  'revive':       '#ffd700',
}

interface Props {
  bag: BagItem[]
  onUse: (itemId: string) => void
  onClose: () => void
}

export default function BagMenu({ bag, onUse, onClose }: Props) {
  const usable = bag
    .filter(b => b.qty > 0)
    .map(b => ({ ...b, data: ITEMS.find(i => i.id === b.itemId) }))
    .filter(b => b.data)

  return (
    <div className="absolute inset-0 bg-black/65 z-40 flex items-center justify-center">
      <div style={{
        background: 'linear-gradient(160deg, #0f1e4a 0%, #0a1530 100%)',
        border: '2px solid #ffd700',
        borderRadius: 16,
        padding: '16px 14px',
        width: 280,
        maxWidth: '92vw',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 20 }}>🎒</span>
            <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 }}>BAG</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e2d52', border: '1px solid #4ecdc4/40',
              borderRadius: 8, padding: '3px 10px',
              color: '#aaa', fontSize: 11, cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #ffd700, transparent)', marginBottom: 12 }} />

        {usable.length === 0 ? (
          <div style={{ color: '#666', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
            No usable items
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {usable.map(({ itemId, qty, data }) => {
              const spriteName = ITEM_SPRITE[itemId]
              const accentColor = ITEM_COLOR[itemId] ?? '#4ecdc4'
              return (
                <button
                  key={itemId}
                  onClick={() => onUse(itemId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: '#16213e',
                    border: `1.5px solid ${accentColor}40`,
                    borderRadius: 10, padding: '8px 10px',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accentColor)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = `${accentColor}40`)}
                >
                  {/* Icon */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `${accentColor}18`,
                    border: `1px solid ${accentColor}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {spriteName ? (
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${spriteName}.png`}
                        alt=""
                        style={{ width: 28, height: 28, imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <span style={{ fontSize: 18 }}>📦</span>
                    )}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>{data!.name}</div>
                    <div style={{ color: '#888', fontSize: 10, marginTop: 1 }}>{data!.description}</div>
                  </div>

                  {/* Qty badge */}
                  <div style={{
                    background: `${accentColor}25`,
                    border: `1px solid ${accentColor}60`,
                    borderRadius: 8, padding: '2px 8px',
                    color: accentColor, fontWeight: 'bold', fontSize: 12,
                    flexShrink: 0,
                  }}>
                    ×{qty}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
