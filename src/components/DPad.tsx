interface Props {
  onMove: (dx: number, dy: number) => void
  isBiking?: boolean
  onBikeToggle?: () => void
}

export default function DPad({ onMove, isBiking, onBikeToggle }: Props) {
  const btn = (dx: number, dy: number, label: string) => (
    <button
      onPointerDown={e => { e.preventDefault(); onMove(dx, dy) }}
      className="bg-[#16213e] border border-[#4ecdc4]/40 rounded-xl h-20 w-20 flex items-center justify-center text-white text-3xl font-bold active:bg-[#0f3460] select-none touch-none"
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 80px)', gridTemplateRows: 'repeat(3, 80px)', gap: 8 }}>
      <div />{btn(0, -1, '▲')}<div />
      {btn(-1, 0, '◄')}
      <button
        onPointerDown={e => { e.preventDefault(); onBikeToggle?.() }}
        style={{
          width: 80, height: 80, borderRadius: '50%',
          background: isBiking ? '#4ecdc4' : '#16213e',
          border: `2px solid ${isBiking ? '#4ecdc4' : 'rgba(78,205,196,0.4)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, cursor: 'pointer', touchAction: 'none', userSelect: 'none',
          opacity: isBiking ? 1 : 0.5,
        }}
      >
        🚲
      </button>
      {btn(1, 0, '►')}
      <div />{btn(0, 1, '▼')}<div />
    </div>
  )
}
