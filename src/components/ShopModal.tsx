import itemsJson from '../data/items.json'
import type { ItemData, Profile } from '../types/game'

const ITEMS = itemsJson as ItemData[]

interface Props {
  profile: Profile
  onBuy: (itemId: string) => void
  onClose: () => void
}

export default function ShopModal({ profile, onBuy, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
      <div className="w-full max-w-sm bg-[#0f3460] border-t-2 border-yellow-400 rounded-t-2xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-yellow-400 font-bold">Pokémart</h2>
          <span className="text-white text-sm">₽{profile.money.toLocaleString()}</span>
        </div>
        <div className="flex flex-col gap-2">
          {ITEMS.map(item => {
            const owned = (profile.bag ?? []).find(b => b.itemId === item.id)?.qty ?? 0
            const canAfford = profile.money >= item.price
            return (
              <div key={item.id} className="flex justify-between items-center bg-[#1a1a2e] rounded-xl px-3 py-2">
                <div>
                  <div className="text-white font-bold text-sm">{item.name}</div>
                  <div className="text-gray-400 text-xs">{item.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  {owned > 0 && <span className="text-gray-400 text-xs">×{owned}</span>}
                  <button
                    onClick={() => onBuy(item.id)}
                    disabled={!canAfford}
                    className="bg-yellow-400 disabled:bg-gray-600 text-black disabled:text-gray-400 font-bold text-xs px-3 py-1 rounded-lg"
                  >
                    ₽{item.price}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <button onClick={onClose} className="text-gray-400 text-sm underline text-center">
          Leave Shop
        </button>
      </div>
    </div>
  )
}
