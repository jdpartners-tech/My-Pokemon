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
        borderRadius: 20,
        padding: '20px 18px',
        width: 360,
        maxWidth: '94vw',
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 26 }}>🎒</span>
            <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: 20, letterSpacing: 1 }}>BAG</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#1e2d52', border: '1px solid rgba(78,205,196,0.4)',
              borderRadius: 10, padding: '6px 16px',
              color: '#aaa', fontSize: 14, cursor: 'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #ffd700, transparent)', marginBottom: 14 }} />

        {usable.length === 0 ? (
          <div style={{ color: '#666', fontSize: 15, textAlign: 'center', padding: '20px 0' }}>
            No usable items
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {usable.map(({ itemId, qty, data }) => {
              const spriteName = ITEM_SPRITE[itemId]
              const accentColor = ITEM_COLOR[itemId] ?? '#4ecdc4'
              return (
                <button
                  key={itemId}
                  onClick={() => onUse(itemId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    background: '#16213e',
                    border: `2px solid ${accentColor}40`,
                    borderRadius: 14, padding: '12px 14px',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = accentColor)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = `${accentColor}40`)}
                >
                  {/* Icon */}
                  <div style={{
                    width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                    background: `${accentColor}18`,
                    border: `1.5px solid ${accentColor}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {spriteName ? (
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${spriteName}.png`}
                        alt=""
                        style={{ width: 40, height: 40, imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <span style={{ fontSize: 26 }}>📦</span>
                    )}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{data!.name}</div>
                    <div style={{ color: '#888', fontSize: 13, marginTop: 3 }}>{data!.description}</div>
                  </div>

                  {/* Qty badge */}
                  <div style={{
                    background: `${accentColor}25`,
                    border: `1.5px solid ${accentColor}60`,
                    borderRadius: 10, padding: '4px 12px',
                    color: accentColor, fontWeight: 'bold', fontSize: 15,
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
