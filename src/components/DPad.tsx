interface Props {
  onMove: (dx: number, dy: number) => void
}

export default function DPad({ onMove }: Props) {
  const btn = (dx: number, dy: number, label: string) => (
    <button
      onPointerDown={e => { e.preventDefault(); onMove(dx, dy) }}
      className="bg-[#16213e] border border-[#4ecdc4]/40 rounded-lg h-12 w-12 flex items-center justify-center text-white text-xl font-bold active:bg-[#0f3460] select-none touch-none"
    >
      {label}
    </button>
  )
  return (
    <div className="grid grid-cols-3 gap-1">
      <div />{btn(0, -1, '▲')}<div />
      {btn(-1, 0, '◄')}<div className="w-12 h-12 bg-[#16213e] rounded-full border border-[#4ecdc4]/10" />{btn(1, 0, '►')}
      <div />{btn(0, 1, '▼')}<div />
    </div>
  )
}
