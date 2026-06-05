interface Props {
  currentMapId: string
  expanded: boolean
  onToggle: () => void
}

// 3×3 boustrophedon layout — every connection is between adjacent cells, no snake:
//
//  Pallet  →  Sunlit  →  Viridian
//                            ↓
//  Rocky   ←  Misty   ←  Flower
//    ↓
//  Trainer →  Cinnabar →  Volcano
//
// CSS grid: 5 cols × 5 rows  (odd = nodes 1/3/5, even = connectors 2/4)
const AREAS = [
  { id: 'pallet',         emoji: '🏠', name: 'Pallet',    hint: 'Town',      cssCol: 1, cssRow: 1 },
  { id: 'sunlitMeadow',   emoji: '🌸', name: 'Sunlit',    hint: 'Lv 2–8',    cssCol: 3, cssRow: 1 },
  { id: 'viridianForest', emoji: '🌲', name: 'Viridian',  hint: 'Lv 3–10',   cssCol: 5, cssRow: 1 },
  { id: 'flowerMeadow',   emoji: '🌼', name: 'Flower',    hint: 'Lv 5–14',   cssCol: 5, cssRow: 3 },
  { id: 'mistyLake',      emoji: '🌊', name: 'Misty',     hint: 'Lv 5–16',   cssCol: 3, cssRow: 3 },
  { id: 'rockyCave',      emoji: '🪨', name: 'Rocky',     hint: 'Lv 12–30',  cssCol: 1, cssRow: 3 },
  { id: 'trainerRoad',    emoji: '🛤️', name: 'Trainer',   hint: 'Lv 18–27',  cssCol: 1, cssRow: 5 },
  { id: 'cinnabarTown',   emoji: '🏙️', name: 'Cinnabar',  hint: 'Town',       cssCol: 3, cssRow: 5 },
  { id: 'volcanoTrail',   emoji: '🌋', name: 'Volcano',   hint: 'Lv 25–55',  cssCol: 5, cssRow: 5 },
]

const CONNECTORS: Array<{ cssCol: number; cssRow: number; dir: 'h' | 'v' }> = [
  { cssCol: 2, cssRow: 1, dir: 'h' },  // Pallet    → Sunlit
  { cssCol: 4, cssRow: 1, dir: 'h' },  // Sunlit    → Viridian
  { cssCol: 5, cssRow: 2, dir: 'v' },  // Viridian  ↓ Flower
  { cssCol: 4, cssRow: 3, dir: 'h' },  // Flower    ← Misty
  { cssCol: 2, cssRow: 3, dir: 'h' },  // Misty     ← Rocky
  { cssCol: 1, cssRow: 4, dir: 'v' },  // Rocky     ↓ Trainer
  { cssCol: 2, cssRow: 5, dir: 'h' },  // Trainer   → Cinnabar
  { cssCol: 4, cssRow: 5, dir: 'h' },  // Cinnabar  → Volcano
]

const NODE_W = 80
const NODE_H = 58
const CONN_W = 18

export default function MiniMap({ currentMapId, expanded, onToggle }: Props) {
  const ID_ALIASES: Record<string, string> = {
    pokecenter: 'pallet',
    route1: 'sunlitMeadow',
  }
  const activeId = ID_ALIASES[currentMapId] ?? currentMapId
  const activeArea = AREAS.find(a => a.id === activeId)

  if (!expanded) {
    return (
      <button
        onClick={onToggle}
        style={{
          width: 50, height: 54,
          background: 'rgba(10, 16, 32, 0.80)',
          border: '1.5px solid rgba(74, 106, 154, 0.7)',
          borderRadius: 10,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', gap: 1,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      >
        <div style={{ fontSize: 20, lineHeight: 1 }}>🗺</div>
        <div style={{ fontSize: 15, lineHeight: 1 }}>{activeArea?.emoji ?? '?'}</div>
      </button>
    )
  }

  const colTemplate = `${NODE_W}px ${CONN_W}px ${NODE_W}px ${CONN_W}px ${NODE_W}px`
  const rowTemplate = `${NODE_H}px ${CONN_W}px ${NODE_H}px ${CONN_W}px ${NODE_H}px`

  return (
    <div
      onClick={onToggle}
      style={{
        background: 'rgba(10, 16, 32, 0.88)',
        border: '1.5px solid #1e2e4a',
        borderRadius: 12,
        padding: '10px 12px 8px',
        width: 'fit-content',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        textAlign: 'center', fontSize: 9, fontWeight: 'bold',
        color: '#4a6a9a', letterSpacing: 3, marginBottom: 8,
      }}>
        WORLD MAP
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: colTemplate,
        gridTemplateRows: rowTemplate,
      }}>
        {AREAS.map(area => {
          const isCurrent = area.id === activeId
          return (
            <div
              key={area.id}
              style={{
                gridColumn: area.cssCol,
                gridRow: area.cssRow,
                background: isCurrent ? '#0d2a0d' : '#111827',
                border: isCurrent ? '2.5px solid #ffd700' : '1.5px solid #1e3a5a',
                borderRadius: 7,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 2px',
                overflow: 'hidden',
                boxShadow: isCurrent ? '0 0 10px rgba(255,215,0,0.5)' : 'none',
              }}
            >
              <div style={{ fontSize: 16, lineHeight: 1 }}>{area.emoji}</div>
              <div style={{
                fontSize: 9, fontWeight: 'bold', lineHeight: 1.3, marginTop: 2,
                color: isCurrent ? '#ffd700' : '#a0b8d0',
                textAlign: 'center', whiteSpace: 'nowrap',
              }}>
                {isCurrent ? '★ ' : ''}{area.name}
              </div>
              <div style={{
                fontSize: 7, lineHeight: 1.2, marginTop: 1,
                color: isCurrent ? '#80c060' : '#3a5870',
                textAlign: 'center', whiteSpace: 'nowrap',
              }}>
                {area.hint}
              </div>
            </div>
          )
        })}

        {CONNECTORS.map((c, i) => (
          <div
            key={i}
            style={{
              gridColumn: c.cssCol,
              gridRow: c.cssRow,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {c.dir === 'v'
              ? <div style={{ width: 2, height: '100%', background: '#2a4a6a', borderRadius: 1 }} />
              : <div style={{ height: 2, width: '100%', background: '#2a4a6a', borderRadius: 1 }} />
            }
          </div>
        ))}
      </div>

      <div style={{
        textAlign: 'center', fontSize: 7, color: '#2a4060', marginTop: 5,
        letterSpacing: 1,
      }}>
        tap to close
      </div>
    </div>
  )
}
