import { MoveData } from '../types/game'

interface PartyMove {
  moveId: string
  pp: number
  maxPp: number
}

interface Props {
  moves: PartyMove[]
  moveData: Record<string, MoveData>
  onSelect: (index: number) => void
  disabled: boolean
}

const TYPE_COLORS: Record<string, string> = {
  fire: 'bg-orange-500', water: 'bg-blue-500', grass: 'bg-green-500',
  electric: 'bg-yellow-400', psychic: 'bg-pink-500', ice: 'bg-cyan-400',
  dragon: 'bg-indigo-600', dark: 'bg-gray-700', normal: 'bg-gray-500',
  fighting: 'bg-red-700', poison: 'bg-purple-600', ground: 'bg-yellow-700',
  flying: 'bg-sky-400', bug: 'bg-lime-500', rock: 'bg-yellow-800',
  ghost: 'bg-purple-800', steel: 'bg-gray-400', fairy: 'bg-pink-300',
}

export default function MoveSelector({ moves, moveData, onSelect, disabled }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {moves.map((m, i) => {
        const mv = moveData[m.moveId]
        if (!mv) return null
        const noPP = m.pp === 0
        return (
          <button
            key={i}
            disabled={disabled || noPP}
            onClick={() => onSelect(i)}
            className={`flex flex-col items-start p-3 rounded-xl border transition-all
              ${disabled || noPP
                ? 'border-gray-700 bg-gray-800/50 text-gray-500 cursor-not-allowed'
                : 'border-[#4ecdc4]/40 bg-[#16213e] hover:border-yellow-400 hover:bg-[#0f3460] text-white active:scale-95'
              }`}
          >
            <div className="flex items-center gap-2 w-full">
              <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${TYPE_COLORS[mv.type] ?? 'bg-gray-500'}`}>
                {mv.type.toUpperCase()}
              </span>
              <span className="font-bold text-sm flex-1 capitalize">{mv.name}</span>
            </div>
            <div className="flex justify-between w-full mt-1 text-xs text-gray-400">
              <span>PWR {mv.power ?? '—'}</span>
              <span>PP {m.pp}/{m.maxPp}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
