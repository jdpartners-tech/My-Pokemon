interface Props {
  pokemonId: number
  variant: 'artwork' | 'sprite' | 'back-sprite' | 'ruby-front' | 'ruby-back'
  size?: number
  flip?: boolean
  className?: string
}

const BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'

function getSpriteUrl(pokemonId: number, variant: Props['variant']): string {
  switch (variant) {
    case 'artwork':
      return `${BASE}/other/official-artwork/${pokemonId}.png`
    case 'sprite':
      return `${BASE}/${pokemonId}.png`
    case 'back-sprite':
      return `${BASE}/back/${pokemonId}.png`
    case 'ruby-front':
      return `${BASE}/versions/generation-iii/ruby-sapphire/${pokemonId}.png`
    case 'ruby-back':
      return `${BASE}/versions/generation-iii/ruby-sapphire/back/${pokemonId}.png`
  }
}

export default function PokemonSprite({ pokemonId, variant, size = 96, flip = false, className = '' }: Props) {
  const url = getSpriteUrl(pokemonId, variant)
  const isPixel = variant === 'ruby-front' || variant === 'ruby-back' || variant === 'sprite' || variant === 'back-sprite'
  return (
    <img
      src={url}
      alt={`Pokemon #${pokemonId}`}
      width={size}
      height={size}
      className={`object-contain ${isPixel ? 'image-rendering-pixelated' : ''} ${flip ? 'scale-x-[-1]' : ''} ${className}`}
      style={{
        imageRendering: isPixel ? 'pixelated' : 'auto',
        transform: flip ? 'scaleX(-1)' : undefined,
      }}
    />
  )
}
