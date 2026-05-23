const TYPE_COLORS: Record<string, string> = {
  normal:   'bg-gray-400 text-white',
  fire:     'bg-orange-500 text-white',
  water:    'bg-blue-500 text-white',
  electric: 'bg-yellow-400 text-black',
  grass:    'bg-green-500 text-white',
  ice:      'bg-cyan-300 text-black',
  fighting: 'bg-red-700 text-white',
  poison:   'bg-purple-600 text-white',
  ground:   'bg-yellow-700 text-white',
  flying:   'bg-sky-400 text-white',
  psychic:  'bg-pink-500 text-white',
  bug:      'bg-lime-500 text-black',
  rock:     'bg-yellow-800 text-white',
  ghost:    'bg-purple-800 text-white',
  dragon:   'bg-indigo-600 text-white',
  dark:     'bg-gray-700 text-white',
  steel:    'bg-gray-400 text-white',
  fairy:    'bg-pink-300 text-black',
}

interface Props {
  type: string
}

export default function TypeBadge({ type }: Props) {
  const colorClass = TYPE_COLORS[type] ?? 'bg-gray-500 text-white'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${colorClass}`}>
      {type}
    </span>
  )
}
