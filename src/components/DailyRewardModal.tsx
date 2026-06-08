import type { DayReward } from '../hooks/useLoginReward'

interface Props {
  streak: number           // current new streak (1–7)
  todayReward: DayReward
  onCollect: () => void
}

export default function DailyRewardModal({ streak, todayReward, onCollect }: Props) {
  const daysUntil3 = Math.max(0, 3 - streak)
  const daysUntil7 = Math.max(0, 7 - streak)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ fontFamily: 'Georgia, serif', color: '#fff', textAlign: 'center', maxWidth: 360, width: '100%' }}>

        {/* Title */}
        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>🌟 Daily Login Reward!</div>
        <div style={{ color: '#aaa', fontSize: 14, marginBottom: 24 }}>Day {streak} streak</div>

        {/* Today's reward */}
        <div style={{
          background: '#1a1a2e', borderRadius: 16, padding: '20px 24px',
          border: '2px solid #c8a820', marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, color: '#c8a820', marginBottom: 8, fontWeight: 600 }}>TODAY'S REWARD</div>
          <div style={{ fontSize: 36, marginBottom: 6 }}>🪙</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ffd700' }}>+{todayReward.coins}₽</div>
          {todayReward.itemName && (
            <div style={{ fontSize: 16, color: '#80c060', marginTop: 8 }}>+ {todayReward.itemName} 💊</div>
          )}
          {todayReward.rareEncounter && (
            <div style={{ fontSize: 16, color: '#ff79c6', marginTop: 8 }}>+ Rare Pokémon encounter! 🦕</div>
          )}
        </div>

        {/* Preview strip */}
        <div style={{ fontSize: 13, color: '#888', marginBottom: 20, lineHeight: 1.8 }}>
          {streak < 3 && (
            <div>📅 Day 3 in {daysUntil3} day{daysUntil3 !== 1 ? 's' : ''}: 200₽ + Potion 💊</div>
          )}
          {streak < 7 && (
            <div>🦕 Day 7 in {daysUntil7} day{daysUntil7 !== 1 ? 's' : ''}: 500₽ + Rare Candy + Rare Pokémon!</div>
          )}
          {streak === 7 && (
            <div style={{ color: '#ff79c6', fontWeight: 600 }}>Today's the big day! 🦕 A rare Pokémon awaits!</div>
          )}
        </div>

        {/* 7-dot progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1,2,3,4,5,6,7].map(d => (
            <div key={d} style={{
              width: 12, height: 12, borderRadius: '50%',
              background: d < streak ? '#c8a820' : d === streak ? '#fff' : '#333',
              boxShadow: d === streak ? '0 0 8px #fff' : 'none',
            }} />
          ))}
        </div>

        {/* Collect button */}
        <button
          onClick={onCollect}
          style={{
            background: '#c8a820', color: '#000', border: 'none',
            borderRadius: 12, padding: '14px 48px',
            fontSize: 18, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'Georgia, serif',
          }}
        >
          Collect!
        </button>
      </div>
    </div>
  )
}
