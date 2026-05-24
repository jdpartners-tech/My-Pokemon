import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBattleStore } from '../store/battleStore'
import { useBattleEngine } from '../hooks/useBattleEngine'
import { useProfileStore } from '../store/profileStore'
import PokemonSprite from '../components/PokemonSprite'
import HpBar from '../components/HpBar'
import MoveSelector from '../components/MoveSelector'
import QuestionPopup from '../components/QuestionPopup'
import BattleLog from '../components/BattleLog'
import BagMenu from '../components/BagMenu'
import movesJson from '../data/moves.json'
import { MoveData } from '../types/game'
import { expForLevel } from '../utils/exp'

export default function Battle() {
  const navigate = useNavigate()
  const {
    playerPokemon, opponentPokemon, phase,
    question, selectedMoveIndex, log,
    expAnimating, leveledUp,
  } = useBattleStore()
  const { selectMove, handleAnswer, useItemInBattle } = useBattleEngine()
  const profile = useProfileStore(s => s.profile)
  const [bagOpen, setBagOpen] = useState(false)
  const [flashOn, setFlashOn] = useState(false)

  useEffect(() => {
    if (phase === 'idle') navigate('/map')
  }, [phase, navigate])

  useEffect(() => {
    if (phase !== 'evolving') { setFlashOn(false); return }
    setFlashOn(true)
    const timers: ReturnType<typeof setTimeout>[] = []
    ;[400, 800, 1200, 1600, 2000].forEach((ms, i) => {
      timers.push(setTimeout(() => setFlashOn(i % 2 === 0 ? false : true), ms))
    })
    timers.push(setTimeout(() => setFlashOn(false), 2400))
    return () => timers.forEach(clearTimeout)
  }, [phase])

  if (!playerPokemon || !opponentPokemon) return null

  const moveMap = Object.fromEntries(
    (movesJson as MoveData[]).map(m => [m.id, m])
  ) as Record<string, MoveData>

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col relative">
      {/* Battle scene */}
      <div className="relative bg-gradient-to-b from-sky-400 to-green-600 h-56 overflow-hidden flex-shrink-0">
        {/* Opponent top-right: front artwork */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
          <div className="bg-white/90 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 min-w-32">
            <div className="flex justify-between">
              <span className="capitalize">{opponentPokemon.nickname || `Pokemon #${opponentPokemon.pokemonId}`}</span>
              <span>Lv.{opponentPokemon.level}</span>
            </div>
            <HpBar current={opponentPokemon.currentHp} max={opponentPokemon.maxHp} />
          </div>
          <PokemonSprite pokemonId={opponentPokemon.pokemonId} variant="artwork" size={120} />
        </div>
        {/* Player bottom-left: back sprite (Ruby-style — you see your own Pokemon from behind) */}
        <div className="absolute bottom-3 left-3 flex flex-col items-start gap-1">
          <PokemonSprite pokemonId={playerPokemon.pokemonId} variant="ruby-back" size={140} />
          <div className={`bg-white/90 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 min-w-32 transition-all ${leveledUp ? 'ring-2 ring-yellow-400 shadow-yellow-400/60 shadow-lg' : ''}`}>
            <div className="flex justify-between">
              <span className="capitalize">{playerPokemon.nickname || `Pokemon #${playerPokemon.pokemonId}`}</span>
              <span>Lv.{playerPokemon.level}</span>
            </div>
            <HpBar current={playerPokemon.currentHp} max={playerPokemon.maxHp} />
            <div className="text-right text-gray-600">{playerPokemon.currentHp}/{playerPokemon.maxHp}</div>
            {(() => {
              const lvFloor = expForLevel(playerPokemon.level)
              const lvCeil  = expForLevel(playerPokemon.level + 1)
              const pct = Math.min(1, (playerPokemon.xp - lvFloor) / (lvCeil - lvFloor))
              return (
                <div className="mt-1">
                  <div className="flex justify-between text-[9px] text-gray-500">
                    <span>EXP</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{
                        width: `${pct * 100}%`,
                        transition: expAnimating ? 'width 1s ease-out' : 'none',
                      }}
                    />
                  </div>
                </div>
              )
            })()}
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
            <button
              onClick={() => setBagOpen(true)}
              className="mt-2 w-full bg-[#1a1a2e] border border-gray-600 text-gray-300 font-bold py-2 rounded-xl text-sm"
            >
              BAG
            </button>
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

      {/* Bag menu overlay */}
      {bagOpen && profile && (
        <BagMenu
          bag={profile.bag ?? []}
          onUse={(itemId) => { setBagOpen(false); useItemInBattle(itemId) }}
          onClose={() => setBagOpen(false)}
        />
      )}

      {/* Evolution flash overlay */}
      {phase === 'evolving' && (
        <div
          className="absolute inset-0 z-50 pointer-events-none transition-opacity duration-300"
          style={{ backgroundColor: 'white', opacity: flashOn ? 1 : 0 }}
        />
      )}
    </div>
  )
}
