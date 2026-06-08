import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import type { Profile } from '../types/game'

interface RivalData {
  name: string
  battlesWon: number
  pokedexSeen: number
  loginStreak: number
}

function toRival(doc: Profile): RivalData {
  const seen = Object.values(doc.pokedex ?? {}).filter(v => v === 'caught' || v === 'seen').length
  return {
    name: doc.name,
    battlesWon: doc.stats?.battlesWon ?? 0,
    pokedexSeen: seen,
    loginStreak: doc.loginStreak ?? 0,
  }
}

export default function RivalsTab() {
  const [kayden, setKayden] = useState<RivalData | null>(null)
  const [kaylie, setKaylie] = useState<RivalData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(collection(db, 'profiles')).then(snap => {
      snap.forEach(d => {
        const data = d.data() as Profile
        if (data.name === 'Kayden') setKayden(toRival(data))
        if (data.name === 'Kaylie') setKaylie(toRival(data))
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ color: '#4a6a8a', textAlign: 'center', padding: 24 }}>Loading...</div>
  }

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {([kayden, kaylie] as const).map((rival, i) => (
          <div key={i} style={{
            background: '#16213e', borderRadius: 14,
            border: '1px solid #2a3a5a', padding: '16px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{i === 0 ? '🔵' : '🩷'}</div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              {rival ? rival.name : (i === 0 ? 'Kayden' : 'Kaylie')}
            </div>
            {rival ? (
              <>
                <StatRow
                  emoji="⚔️" label="Battles Won" value={rival.battlesWon}
                  isLeading={
                    kayden && kaylie
                      ? (i === 0 ? rival.battlesWon >= kaylie.battlesWon : rival.battlesWon >= kayden.battlesWon)
                      : false
                  }
                />
                <StatRow
                  emoji="📖" label="Pokédex Seen" value={rival.pokedexSeen}
                  isLeading={
                    kayden && kaylie
                      ? (i === 0 ? rival.pokedexSeen >= kaylie.pokedexSeen : rival.pokedexSeen >= kayden.pokedexSeen)
                      : false
                  }
                />
                <div style={{ color: '#e74c3c', fontSize: 13, marginTop: 10 }}>
                  🔥 {rival.loginStreak}-day streak
                </div>
              </>
            ) : (
              <div style={{ color: '#4a6a8a', fontSize: 13 }}>Not started yet</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatRow({ emoji, label, value, isLeading }: {
  emoji: string; label: string; value: number; isLeading: boolean
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 20 }}>{isLeading ? '👑' : ''}{emoji} {value}</div>
      <div style={{ color: '#4a6a8a', fontSize: 11 }}>{label}</div>
    </div>
  )
}
