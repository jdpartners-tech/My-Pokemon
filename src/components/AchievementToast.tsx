import { useEffect } from 'react'
import { AchievementDef } from '../data/achievements'

interface Props {
  toastQueue: AchievementDef[]
  onDismiss: (id: string) => void
}

export default function AchievementToast({ toastQueue, onDismiss }: Props) {
  useEffect(() => {
    if (toastQueue.length === 0) return
    const timers = toastQueue.map((a, i) =>
      setTimeout(() => onDismiss(a.id), 3000 + i * 500)
    )
    return () => timers.forEach(clearTimeout)
  }, [toastQueue.map(a => a.id).join(',')])

  if (toastQueue.length === 0) return null

  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 65, display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none', width: 'max-content', maxWidth: '90vw',
    }}>
      {toastQueue.map((a, i) => (
        <div
          key={a.id}
          style={{
            background: 'rgba(0,0,0,0.88)',
            border: '1px solid #c8a820',
            borderRadius: 10,
            padding: '10px 20px',
            color: '#c8a820',
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'Georgia, serif',
            textAlign: 'center',
            animation: 'slideDown 0.3s ease-out',
            animationDelay: `${i * 100}ms`,
            animationFillMode: 'both',
          }}
        >
          🏆 Achievement Unlocked: {a.name}!
        </div>
      ))}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
