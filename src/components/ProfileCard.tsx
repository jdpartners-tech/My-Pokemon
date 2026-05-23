import { Profile } from '../types/game'
import PokemonSprite from './PokemonSprite'

interface Props {
  profile: Profile
  onClick: () => void
}

const STARTER_IDS: Record<string, number> = {
  bulbasaur: 1, charmander: 4, squirtle: 7, pikachu: 25, eevee: 133,
}

export default function ProfileCard({ profile, onClick }: Props) {
  const spriteId = STARTER_IDS[profile.starterPokemon] ?? 1
  return (
    <button
      onClick={onClick}
      className="bg-[#16213e] border-2 border-[#4ecdc4]/40 hover:border-yellow-400 rounded-2xl p-5 w-40 flex flex-col items-center gap-3 transition-all active:scale-95"
    >
      <PokemonSprite pokemonId={spriteId} variant="artwork" size={80} />
      <div>
        <p className="text-white font-bold text-lg">{profile.name}</p>
        <p className="text-gray-400 text-sm">Age {profile.age}</p>
      </div>
      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
        profile.difficulty === 'advanced'
          ? 'bg-red-500/20 text-red-400 border border-red-500/40'
          : 'bg-green-500/20 text-green-400 border border-green-500/40'
      }`}>
        {profile.difficulty === 'advanced' ? 'Advanced' : 'Beginner'}
      </span>
    </button>
  )
}
