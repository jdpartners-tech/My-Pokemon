import { useState } from 'react'
import { Question } from '../types/game'

interface Props {
  moveName: string
  question: Question
  onAnswer: (correct: boolean) => void
}

const SUBJECT_COLORS: Record<string, string> = {
  english: 'bg-blue-600',
  maths: 'bg-green-600',
  chinese: 'bg-red-600',
}

export default function QuestionPopup({ moveName, question, onAnswer }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  function pick(i: number) {
    if (revealed) return
    setSelected(i)
    setRevealed(true)
    const correct = question.options[i] === question.answer
    setTimeout(() => onAnswer(correct), 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#16213e] border-2 border-yellow-400 rounded-2xl p-5 max-w-sm w-full shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${SUBJECT_COLORS[question.subject] ?? 'bg-gray-600'}`}>
            {question.subject.toUpperCase()}
          </span>
          <span className="text-yellow-400 font-bold text-sm">⚡ {moveName} — Answer to attack!</span>
        </div>
        <p className="text-white font-semibold text-base mb-4 mt-2">{question.question}</p>
        <div className="grid grid-cols-2 gap-2">
          {question.options.map((opt, i) => {
            const isCorrect = opt === question.answer
            let cls = 'border-[#4ecdc4]/40 bg-[#0f3460] text-[#4ecdc4]'
            if (revealed) {
              if (selected === i)
                cls = isCorrect
                  ? 'border-green-400 bg-green-900/50 text-green-300'
                  : 'border-red-400 bg-red-900/50 text-red-300'
              else if (isCorrect) cls = 'border-green-400 bg-green-900/30 text-green-400'
              else cls = 'border-gray-700 bg-gray-800/50 text-gray-500'
            }
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={revealed}
                className={`border rounded-xl p-3 text-sm font-medium text-left transition-all ${cls}
                  ${!revealed ? 'hover:border-yellow-400 active:scale-95' : ''}`}
              >
                {['A', 'B', 'C', 'D'][i]}. {opt}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
