import React from 'react'
import { useBattleStore } from '../store/battleStore'
import { useProfileStore } from '../store/profileStore'
import { useQuestions } from './useQuestions'
import { useFirestoreProfile } from './useFirestoreProfile'
import { calculateDamage, getTypeEffectiveness } from '../utils/damage'
import { expGained, getLevel, calculateStat } from '../utils/exp'
import { pickQuestion } from '../utils/questionPicker'
import pokemonJson from '../data/pokemon.json'
import movesJson from '../data/moves.json'
import itemsJson from '../data/items.json'
import { PokemonData, MoveData, PartyPokemon, Question, ItemData } from '../types/game'

const itemMap = Object.fromEntries(
  (itemsJson as ItemData[]).map(i => [i.id, i])
) as Record<string, ItemData>

const pokemonMap = Object.fromEntries(
  (pokemonJson as PokemonData[]).map(p => [p.id, p])
) as Record<number, PokemonData>

const moveMap = Object.fromEntries(
  (movesJson as MoveData[]).map(m => [m.id, m])
) as Record<string, MoveData>

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getName(p: PartyPokemon): string {
  return p.nickname || pokemonMap[p.pokemonId]?.name || 'Pokemon'
}

export function useBattleEngine() {
  const store = useBattleStore()
  const profile = useProfileStore(s => s.profile)
  const { getQuestionsForProfile } = useQuestions()
  const { updateProfile } = useFirestoreProfile()

  // Cache questions for the current battle so we don't hit Firestore on every move
  const questionCacheRef = React.useRef<Question[] | null>(null)
  const cacheProfileIdRef = React.useRef<string | null>(null)

  async function getQuestions(): Promise<Question[]> {
    const profileId = profile?.id ?? null
    if (questionCacheRef.current && cacheProfileIdRef.current === profileId) {
      return questionCacheRef.current
    }
    if (!profile) return []
    const qs = await getQuestionsForProfile(profile)
    questionCacheRef.current = qs
    cacheProfileIdRef.current = profileId
    return qs
  }

  async function selectMove(index: number) {
    if (!profile) return
    store.setSelectedMoveIndex(index)
    store.setPhase('question')
    const questions = await getQuestions()
    // Use getState() to avoid stale closure — usedQuestionIds may have changed since last render
    const { usedQuestionIds } = useBattleStore.getState()
    const q = pickQuestion(questions, usedQuestionIds)
    if (q) {
      store.setQuestion(q)
      if (q.id) store.addUsedQuestionId(q.id)
    }
  }

  async function handleAnswer(correct: boolean) {
    const state = useBattleStore.getState()
    const { playerPokemon, opponentPokemon, selectedMoveIndex } = state
    if (!playerPokemon || !opponentPokemon || selectedMoveIndex === null) return

    store.clearQuestion()
    store.setPhase('animating')

    const move = playerPokemon.moves[selectedMoveIndex]
    if (!move) {
      store.setPhase('player_turn')
      return
    }
    const moveInfo = moveMap[move.moveId]
    store.decrementPP(selectedMoveIndex)

    if (!correct) {
      store.addLog(`${getName(playerPokemon)} used ${moveInfo?.name ?? 'Move'}... but it missed!`)
    } else {
      const defenderData = pokemonMap[opponentPokemon.pokemonId]
      const eff = getTypeEffectiveness(
        moveInfo?.type ?? 'normal',
        defenderData?.types ?? ['normal']
      )
      const attackerData = pokemonMap[playerPokemon.pokemonId]
      const atkStat = calculateStat(attackerData?.baseStats.atk ?? 50, playerPokemon.level)
      const defStat = calculateStat(defenderData?.baseStats.def ?? 50, opponentPokemon.level)
      const dmg = calculateDamage(playerPokemon.level, moveInfo?.power ?? 0, atkStat, defStat, eff)
      store.dealDamageToOpponent(dmg)

      let msg = `${getName(playerPokemon)} used ${moveInfo?.name ?? 'Move'}! (${dmg} dmg)`
      if (eff >= 2) msg += " It's super effective!"
      else if (eff > 0 && eff < 1) msg += " It's not very effective..."
      else if (eff === 0) msg += ' It had no effect.'
      store.addLog(msg)

      if (useBattleStore.getState().opponentPokemon!.currentHp <= 0) {
        await handleWin()
        return
      }
    }

    await delay(600)
    await opponentTurn()
  }

  async function opponentTurn() {
    const { playerPokemon, opponentPokemon } = useBattleStore.getState()
    if (!playerPokemon || !opponentPokemon) return
    store.setPhase('opponent_turn')
    await delay(800)

    const idx = Math.floor(Math.random() * opponentPokemon.moves.length)
    const move = opponentPokemon.moves[idx]
    const moveInfo = moveMap[move?.moveId ?? '']

    const defenderData = pokemonMap[playerPokemon.pokemonId]
    const attackerData = pokemonMap[opponentPokemon.pokemonId]
    const eff = getTypeEffectiveness(moveInfo?.type ?? 'normal', defenderData?.types ?? ['normal'])
    const atkStat = calculateStat(attackerData?.baseStats.atk ?? 50, opponentPokemon.level)
    const defStat = calculateStat(defenderData?.baseStats.def ?? 50, playerPokemon.level)
    const dmg = calculateDamage(opponentPokemon.level, moveInfo?.power ?? 0, atkStat, defStat, eff)
    store.dealDamageToPlayer(dmg)
    store.addLog(`${getName(opponentPokemon)} used ${moveInfo?.name ?? 'Move'}! (${dmg} dmg)`)

    await delay(600)

    if (useBattleStore.getState().playerPokemon!.currentHp <= 0) {
      store.addLog(`${getName(playerPokemon)} fainted!`)
      store.setPhase('lose')
      return
    }

    store.setPhase('player_turn')
  }

  async function handleWin() {
    const { playerPokemon, opponentPokemon } = useBattleStore.getState()
    if (!playerPokemon || !opponentPokemon || !profile) return

    store.addLog(`${getName(opponentPokemon)} fainted!`)
    await delay(500)

    const exp = expGained(opponentPokemon.level)
    store.addExpToPlayer(exp)
    store.addLog(`${getName(playerPokemon)} gained ${exp} EXP!`)

    store.setExpAnimating(true)
    await delay(1000)
    store.setExpAnimating(false)

    const newXp = playerPokemon.xp + exp
    const newLevel = getLevel(newXp)
    if (newLevel > playerPokemon.level) {
      store.setLeveledUp(true)
      store.addLog(`${getName(playerPokemon)} grew to Lv.${newLevel}!`)
      await delay(800)
      store.setLeveledUp(false)

      const pokeInfo = pokemonMap[playerPokemon.pokemonId]
      if (
        pokeInfo?.evolvesAtLevel &&
        newLevel >= pokeInfo.evolvesAtLevel &&
        pokeInfo.evolvesTo != null
      ) {
        const evolvedData = pokemonMap[pokeInfo.evolvesTo]
        store.setPhase('evolving')
        await delay(2400)
        store.evolvePlayer(pokeInfo.evolvesTo, evolvedData?.name ?? getName(playerPokemon))
        store.addLog(`${getName(playerPokemon)} evolved into ${evolvedData?.name ?? 'a new form'}!`)
        await delay(600)
      }
    }

    if (profile.id && profile.party?.length) {
      const updatedParty = profile.party.map(p =>
        p.pokemonId === playerPokemon.pokemonId
          ? {
              ...p,
              xp: newXp,
              level: newLevel,
              currentHp: useBattleStore.getState().playerPokemon?.currentHp ?? p.currentHp,
            }
          : p
      )
      const stats = {
        battlesWon: (profile.stats?.battlesWon ?? 0) + 1,
        questionsAnswered: (profile.stats?.questionsAnswered ?? 0) + 1,
        questionsCorrect: (profile.stats?.questionsCorrect ?? 0) + 1,
      }
      try {
        await updateProfile(profile.id, { party: updatedParty, stats })
      } catch (e) {
        console.error('Failed to save battle result:', e)
      }
    }

    store.setPhase('win')
  }

  function continueBattle() {
    store.setPhase('player_turn')
  }

  async function useItemInBattle(itemId: string) {
    const item = itemMap[itemId]
    if (!item || !profile?.id) return
    const state = useBattleStore.getState()
    const { playerPokemon } = state
    if (!playerPokemon) return

    if (item.effect === 'heal' && playerPokemon.currentHp <= 0) return
    if (item.effect === 'revive' && playerPokemon.currentHp > 0) return

    store.setPhase('animating')

    if (item.effect === 'heal') {
      store.healPlayer(item.power)
      store.addLog(`Used ${item.name}! ${getName(playerPokemon)} restored ${item.power} HP.`)
    } else if (item.effect === 'revive') {
      const halfHp = Math.floor(playerPokemon.maxHp / 2)
      store.healPlayer(halfHp)
      store.addLog(`Used ${item.name}! ${getName(playerPokemon)} was revived!`)
    }

    const newBag = (profile.bag ?? [])
      .map(b => b.itemId === itemId ? { ...b, qty: b.qty - 1 } : b)
      .filter(b => b.qty > 0)
    try {
      await updateProfile(profile.id, { bag: newBag })
      useProfileStore.getState().setProfile({ ...profile, bag: newBag })
    } catch { /* silent */ }

    await delay(600)
    await opponentTurn()
  }

  return { selectMove, handleAnswer, continueBattle, useItemInBattle }
}
