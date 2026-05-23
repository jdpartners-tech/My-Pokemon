import { useEffect, useRef } from 'react'

interface Props {
  messages: string[]
}

export default function BattleLog({ messages }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [messages])

  return (
    <div
      ref={ref}
      className="h-16 bg-[#16213e] border-b border-gray-700 px-4 py-2 overflow-y-auto flex flex-col gap-1"
    >
      {messages.slice(-3).map((msg, i) => (
        <p
          key={i}
          className={`text-sm ${i === messages.slice(-3).length - 1 ? 'text-white' : 'text-gray-500'}`}
        >
          {msg}
        </p>
      ))}
    </div>
  )
}
