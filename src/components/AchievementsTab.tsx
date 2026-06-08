import { useState } from 'react'
import { ACHIEVEMENTS } from '../data/achievements'
import type { Profile } from '../types/game'

interface Props {
  profile: Profile
}

export default function AchievementsTab({ profile }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const unlocked = profile.achievements ?? []
  const unlockedCount = ACHIEVEMENTS.filter(a => unlocked.includes(a.id)).length

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{
        color: '#4ecdc4', fontWeight: 700, fontSize: 14,
        marginBottom: 12, textAlign: 'center',
      }}>
        {unlockedCount} / {ACHIEVEMENTS.length} unlocked
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
        gap: 10,
      }}>
        {ACHIEVEMENTS.map(a => {
          const isUnlocked = unlocked.includes(a.id)
          const isSelected = selected === a.id
          return (
            <div
              key={a.id}
              onClick={() => setSelected(isSelected ? null : a.id)}
              style={{
                background: isUnlocked ? '#1a2540' : '#111',
                border: isUnlocked ? '1px solid #c8a820' : '1px solid #2a3a5a',
                borderRadius: 12, padding: '10px 6px',
                textAlign: 'center', cursor: 'pointer',
                opacity: isUnlocked ? 1 : 0.45,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{ fontSize: isUnlocked ? 28 : 20, filter: isUnlocked ? 'none' : 'grayscale(1)' }}>
                {a.icon}
              </div>
              <div style={{
                color: isUnlocked ? '#fff' : '#555',
                fontSize: 10, marginTop: 4, lineHeight: 1.3, fontWeight: 600,
              }}>
                {a.name}
              </div>
            </div>
          )
        })}
      </div>

      {selected && (() => {
        const a = ACHIEVEMENTS.find(x => x.id === selected)!
        const isUnlocked = unlocked.includes(a.id)
        return (
          <div style={{
            marginTop: 16, background: '#16213e',
            border: '1px solid #2a3a5a', borderRadius: 12, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>{a.icon}</div>
            <div style={{ color: '#fff', fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>{a.name}</div>
            <div style={{ color: '#4a6a8a', fontSize: 13, textAlign: 'center' }}>
              {isUnlocked ? a.flavour : a.description}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
