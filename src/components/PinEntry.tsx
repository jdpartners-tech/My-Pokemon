import { useState, useEffect } from 'react'

interface Props {
  onComplete: (pin: string) => void
  error?: string
  onClear?: () => void
}

export default function PinEntry({ onComplete, error, onClear }: Props) {
  const [pin, setPin] = useState('')

  useEffect(() => {
    if (pin.length === 4) {
      onComplete(pin)
      setPin('')
    }
  }, [pin])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= '0' && e.key <= '9') {
        onClear?.()
        setPin(p => p.length < 4 ? p + e.key : p)
      } else if (e.key === 'Backspace') {
        onClear?.()
        setPin(p => p.slice(0, -1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClear])

  function press(digit: string) {
    if (pin.length < 4) setPin(p => p + digit)
    onClear?.()
  }

  function del() {
    setPin(p => p.slice(0, -1))
    onClear?.()
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-4">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center text-3xl font-bold
              ${pin.length > i
                ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400'
                : 'border-gray-600 bg-gray-800'}`}
          >
            {pin.length > i ? '●' : ''}
          </div>
        ))}
      </div>
      {error && <p className="text-red-400 text-base">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
          <button
            key={i}
            onClick={() => k === '⌫' ? del() : k ? press(k) : undefined}
            disabled={!k}
            className={`w-20 h-20 rounded-2xl text-2xl font-bold transition-all
              ${!k
                ? 'invisible'
                : k === '⌫'
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  : 'bg-[#16213e] hover:bg-[#0f3460] border border-[#4ecdc4]/40 text-white active:scale-95'
              }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  )
}
