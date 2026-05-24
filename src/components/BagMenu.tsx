import itemsJson from '../data/items.json'
import type { BagItem, ItemData } from '../types/game'

const ITEMS = itemsJson as ItemData[]

interface Props {
  bag: BagItem[]
  onUse: (itemId: string) => void
  onClose: () => void
}

export default function BagMenu({ bag, onUse, onClose }: Props) {
  const usable = bag
    .filter(b => b.qty > 0)
    .map(b => ({ ...b, data: ITEMS.find(i => i.id === b.itemId) }))
    .filter(b => b.data)

  return (
    <div className="absolute inset-0 bg-black/50 z-40 flex items-end">
      <div className="w-full bg-[#0f3460] border-t-2 border-yellow-400 p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-yellow-400 font-bold text-sm">BAG</span>
          <button onClick={onClose} className="text-gray-400 text-xs underline">Back</button>
        </div>
        {usable.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-2">No usable items</p>
        )}
        {usable.map(({ itemId, qty, data }) => (
          <button
            key={itemId}
            onClick={() => onUse(itemId)}
            className="flex justify-between items-center bg-[#1a1a2e] rounded-xl px-3 py-2 text-left"
          >
            <div>
              <div className="text-white font-bold text-sm">{data!.name}</div>
              <div className="text-gray-400 text-xs">{data!.description}</div>
            </div>
            <span className="text-gray-300 text-sm ml-2">×{qty}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
