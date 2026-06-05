interface Props {
  onMove: (dx: number, dy: number) => void
}

export default function DPad({ onMove }: Props) {
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
      {btn(-1, 0, '◄')}<div style={{ width: 80, height: 80, background: '#16213e', borderRadius: '50%', border: '1px solid rgba(78,205,196,0.1)' }} />{btn(1, 0, '►')}
      <div />{btn(0, 1, '▼')}<div />
    </div>
  )
}
