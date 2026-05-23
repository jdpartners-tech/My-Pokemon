import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBattleStore } from '../store/battleStore'
import PokemonSprite from '../components/PokemonSprite'
import HpBar from '../components/HpBar'
import MoveSelector from '../components/MoveSelector'
import QuestionPopup from '../components/QuestionPopup'
import BattleLog from '../components/BattleLog'
import movesJson from '../data/moves.json'
import { MoveData } from '../types/game'

export default function Battle() {
  const navigate = useNavigate()
  const {
    playerPokemon, opponentPokemon, phase,
    question, selectedMoveIndex, log,
    selectMove, handleAnswer,
  } = useBattleStore()

  useEffect(() => {
    if (phase === 'idle') navigate('/map')
  }, [phase, navigate])

  if (!playerPokemon || !opponentPokemon) return null

  const moveMap = Object.fromEntries(
    (movesJson as MoveData[]).map(m => [m.id, m])
  ) as Record<string, MoveData>

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      {/* Battle scene */}
      <div className="relative bg-gradient-to-b from-sky-400 to-green-600 h-56 overflow-hidden flex-shrink-0">
        {/* Opponent top-right */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          <div className="bg-white/90 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 min-w-32">
            <div className="flex justify-between">
              <span className="capitalize">{opponentPokemon.nickname || `Pokemon #${opponentPokemon.pokemonId}`}</span>
              <span>Lv.{opponentPokemon.level}</span>
            </div>
            <HpBar current={opponentPokemon.currentHp} max={opponentPokemon.maxHp} />
          </div>
          <PokemonSprite pokemonId={opponentPokemon.pokemonId} variant="artwork" size={110} />
        </div>
        {/* Player bottom-left */}
        <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1">
          <PokemonSprite pokemonId={playerPokemon.pokemonId} variant="artwork" size={110} flip />
          <div className="bg-white/90 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 min-w-32">
            <div className="flex justify-between">
              <span className="capitalize">{playerPokemon.nickname || `Pokemon #${playerPokemon.pokemonId}`}</span>
              <span>Lv.{playerPokemon.level}</span>
            </div>
            <HpBar current={playerPokemon.currentHp} max={playerPokemon.maxHp} />
            <div className="text-right text-gray-600">{playerPokemon.currentHp}/{playerPokemon.maxHp}</div>
          </div>
        </div>
      </div>

      {/* Battle log */}
      <BattleLog messages={log} />

      {/* Controls */}
      <div className="flex-1 bg-[#0f3460] border-t-2 border-yellow-400/30 p-4">
        {phase === 'player_turn' && (
          <>
            <p className="text-yellow-400 font-bold text-sm mb-2">
              What will <span className="capitalize">{playerPokemon.nickname || `Pokemon #${playerPokemon.pokemonId}`}</span> do?
            </p>
            <MoveSelector
              moves={playerPokemon.moves}
              moveData={moveMap}
              onSelect={selectMove}
              disabled={false}
            />
          </>
        )}
        {(phase === 'opponent_turn' || phase === 'animating') && (
          <div className="flex items-center justify-center h-20">
            <p className="text-white animate-pulse text-lg">...</p>
          </div>
        )}
        {phase === 'win' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-green-400 font-bold text-xl">You won!</p>
            <button
              onClick={() => navigate('/map')}
              className="bg-yellow-400 text-[#1a1a2e] font-bold px-8 py-3 rounded-xl text-lg"
            >
              Continue
            </button>
          </div>
        )}
        {phase === 'lose' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-red-400 font-bold text-xl">You blacked out...</p>
            <button
              onClick={() => navigate('/map')}
              className="bg-yellow-400 text-[#1a1a2e] font-bold px-8 py-3 rounded-xl text-lg"
            >
              Return to Pokémon Center
            </button>
          </div>
        )}
      </div>

      {/* Question popup — shown over everything */}
      {phase === 'question' && question && selectedMoveIndex !== null && (
        <QuestionPopup
          moveName={moveMap[playerPokemon.moves[selectedMoveIndex]?.moveId]?.name ?? 'Move'}
          question={question}
          onAnswer={handleAnswer}
        />
      )}
    </div>
  )
}
