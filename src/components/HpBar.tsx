interface Props {
  current: number
  max: number
}

export default function HpBar({ current, max }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round((current / max) * 100)))
  const color = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-700 rounded-full h-2" data-testid="hp-bar-container">
      <div
        className={`${color} h-2 rounded-full transition-all`}
        style={{ width: `${pct}%` }}
        data-testid="hp-bar-fill"
        data-pct={pct}
      />
    </div>
  )
}
