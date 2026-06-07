import React from 'react'
import { useBattleStore } from '../store/battleStore'
import { useProfileStore } from '../store/profileStore'
import { useQuestions } from './useQuestions'
import { useFirestoreProfile } from './useFirestoreProfile'
import { calculateDamage, getTypeEffectiveness } from '../utils/damage'
import { expGained, getLevel, calculateStat } from '../utils/exp'
import { pickQuestion, shuffleOptions } from '../utils/questionPicker'
import pokemonJson from '../data/pokemon.json'
import movesJson from '../data/moves.json'
import itemsJson from '../data/items.json'
import { PokemonData, MoveData, PartyPokemon, Question, ItemData, StatusCondition } from '../types/game'

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
    store.setPhase('animating')  // hold here while fetching so UI never shows blank 'question' phase
    const questions = await getQuestions()
    // Use getState() to avoid stale closure — usedQuestionIds may have changed since last render
    const { usedQuestionIds } = useBattleStore.getState()
    const q = pickQuestion(questions, usedQuestionIds)
    if (q) {
      store.setQuestion(shuffleOptions(q))
      if (q.id) store.addUsedQuestionId(q.id)
      store.setPhase('question')  // only show popup once we actually have a question
    } else {
      // No questions available — auto-proceed as correct so battle never freezes
      await handleAnswer(true)
    }
  }

  async function switchToPartyMember(index: number) {
    store.switchPokemon(index)
    const switched = useBattleStore.getState().playerPokemon!
    store.addLog(`Go, ${getName(switched)}!`)
    store.setPhase('animating')
    await delay(500)
    await opponentTurn()
  }

  function tryApplyAilment(
    moveInfo: MoveData | undefined,
    targetStatus: StatusCondition | null | undefined,
    setStatus: (s: StatusCondition, turns?: number) => void,
    targetName: string,
  ) {
    const eff = moveInfo?.effect
    if (!eff?.ailment || targetStatus) return
    const chance = eff.ailment_chance ?? 100
    if (Math.random() * 100 >= chance) return
    const ailment = eff.ailment as StatusCondition
    if (!ailment) return
    const turns = ailment === 'sleep' ? 1 + Math.floor(Math.random() * 3) : 0
    setStatus(ailment, turns)
    const label: Record<string, string> = {
      burn: 'burned', paralysis: 'paralyzed', sleep: 'fell asleep', poison: 'was poisoned',
      freeze: 'was frozen', confusion: 'became confused',
    }
    store.addLog(`${targetName} ${label[ailment] ?? ailment}!`)
  }

  async function handleAnswer(correct: boolean, chosenAnswer?: string) {
    // Guard: prevent double-tap race on mobile (only run while in question phase)
    if (useBattleStore.getState().phase !== 'question') return
    const state = useBattleStore.getState()
    const { playerPokemon, opponentPokemon, selectedMoveIndex, question } = state
    if (!playerPokemon || !opponentPokemon || selectedMoveIndex === null) return

    const correctAnswer = question?.answer ?? ''
    store.clearQuestion()
    store.setPhase('animating')

    try {

    const move = playerPokemon.moves[selectedMoveIndex]
    if (!move) {
      store.setPhase('player_turn')
      return
    }
    const moveInfo = moveMap[move.moveId]
    store.decrementPP(selectedMoveIndex)

    // Track per-question stats on every answer — read from store (not closure) to avoid stale values
    if (profile?.id) {
      const profileNow = useProfileStore.getState().profile ?? profile
      const updatedStats = {
        battlesWon: profileNow.stats?.battlesWon ?? 0,
        questionsAnswered: (profileNow.stats?.questionsAnswered ?? 0) + 1,
        questionsCorrect: (profileNow.stats?.questionsCorrect ?? 0) + (correct ? 1 : 0),
        questionsWrong: (profileNow.stats?.questionsWrong ?? 0) + (correct ? 0 : 1),
      }
      useProfileStore.getState().setProfile({ ...profileNow, stats: updatedStats })
      updateProfile(profile.id, { stats: updatedStats }).catch(() => {})
    }

    if (!correct) {
      store.setAnswerResult({ wasCorrect: false, correctAnswer })
      store.addLog(`${getName(playerPokemon)} used ${moveInfo?.name ?? 'Move'}... but it missed!`)

      // Track wrong answer — fire-and-forget so network hang never blocks the battle
      if (profile?.id && question) {
        const wrongEntry = {
          question: question.question,
          givenAnswer: chosenAnswer ?? '',
          correctAnswer: correctAnswer,
          subject: question.subject,
        }
        const profileNow = useProfileStore.getState().profile ?? profile
        const existing = profileNow.wrongAnswers ?? []
        const updated = [...existing.filter(w => w.question !== wrongEntry.question), wrongEntry].slice(-50)
        useProfileStore.getState().setProfile({ ...profileNow, wrongAnswers: updated })
        updateProfile(profile.id, { wrongAnswers: updated }).catch(() => {})
      }

      await new Promise<void>(resolve => store.setResolveWrongAnswer(resolve))
      await opponentTurn()
    } else {
      // Check player paralysis/sleep before attacking
      const playerStatus = playerPokemon.status
      if (playerStatus === 'sleep') {
        const turns = playerPokemon.sleepTurns
        if (turns > 1) {
          store.setPlayerStatus('sleep', turns - 1)
          store.addLog(`${getName(playerPokemon)} is fast asleep!`)
          await delay(1000)
          await opponentTurn()
          return
        } else {
          store.setPlayerStatus(null)
          store.addLog(`${getName(playerPokemon)} woke up!`)
        }
      }
      if (playerStatus === 'paralysis' && Math.random() < 0.25) {
        store.addLog(`${getName(playerPokemon)} is paralyzed and can't move!`)
        await delay(1000)
        await opponentTurn()
        return
      }

      // Player attack lurch
      store.setPlayerAttacking(true)
      await delay(220)
      store.setPlayerAttacking(false)

      const defenderData = pokemonMap[opponentPokemon.pokemonId]
      const attackerData = pokemonMap[playerPokemon.pokemonId]
      const eff = getTypeEffectiveness(
        moveInfo?.type ?? 'normal',
        defenderData?.types ?? ['normal']
      )
      const atkStat = calculateStat(attackerData?.baseStats.atk ?? 50, playerPokemon.level)
      const defStat = calculateStat(defenderData?.baseStats.def ?? 50, opponentPokemon.level)

      // Multi-hit
      const fx = moveInfo?.effect
      const hits = fx?.min_hits != null && fx?.max_hits != null
        ? fx.min_hits + Math.floor(Math.random() * (fx.max_hits - fx.min_hits + 1))
        : 1
      let totalDmg = 0
      let didCrit = false
      for (let h = 0; h < hits; h++) {
        const isCrit = Math.random() < (1 / 16)
        if (isCrit) didCrit = true
        const baseDmg = calculateDamage(playerPokemon.level, moveInfo?.power ?? 0, atkStat, defStat, eff)
        const singleDmg = isCrit ? Math.floor(baseDmg * 1.5) : baseDmg
        if (h === 0) {
          store.setProjectileAnim(moveInfo?.type ?? 'normal', true)
          await delay(360)
        }
        store.dealDamageToOpponent(singleDmg)
        totalDmg += singleDmg
        store.showDamagePopup(singleDmg, true)
        store.setHitEffect(moveInfo?.type ?? 'normal', true)
        store.setOpponentFlash(true)
        await delay(120)
        store.setOpponentFlash(false)
        if (h === 0) store.clearProjectileAnim()
        if (hits > 1) await delay(80)
      }

      let msg = `${getName(playerPokemon)} used ${moveInfo?.name ?? 'Move'}! (${totalDmg} dmg)`
      if (hits > 1) msg += ` ${hits}× hit!`
      if (didCrit) {
        store.setBattleBanner('Critical hit! ⚡')
        await delay(1200)
        store.setBattleBanner(null)
      } else if (eff >= 2) {
        msg += " It's super effective!"
        store.setBattleBanner("Super effective! ★")
        await delay(1500)
        store.setBattleBanner(null)
      } else if (eff > 0 && eff < 1) {
        msg += " It's not very effective..."
        store.setBattleBanner("Not very effective...")
        await delay(1500)
        store.setBattleBanner(null)
      } else if (eff === 0) {
        msg += ' It had no effect.'
      }
      store.addLog(msg)

      // Drain (positive = user heals, negative = recoil)
      if (fx?.drain && fx.drain !== 0) {
        const drainAmt = Math.max(1, Math.floor(totalDmg * Math.abs(fx.drain) / 100))
        if (fx.drain > 0) {
          store.healPlayer(drainAmt)
          store.addLog(`${getName(playerPokemon)} drained ${drainAmt} HP!`)
        } else {
          store.dealDamageToPlayer(drainAmt)
          store.addLog(`${getName(playerPokemon)} is damaged by recoil! (${drainAmt})`)
        }
      }

      // Healing move (power=0, healing>0, like Recover)
      if (!fx?.drain && fx?.healing && fx.healing > 0 && (moveInfo?.power ?? 0) === 0) {
        const healAmt = Math.max(1, Math.floor(playerPokemon.maxHp * fx.healing / 100))
        store.healPlayer(healAmt)
        store.addLog(`${getName(playerPokemon)} restored ${healAmt} HP!`)
      }

      if (useBattleStore.getState().opponentPokemon!.currentHp <= 0) {
        await handleWin()
        return
      }

      // Try to apply ailment to opponent
      tryApplyAilment(
        moveInfo,
        useBattleStore.getState().opponentPokemon!.status,
        (s, t) => store.setOpponentStatus(s, t),
        getName(useBattleStore.getState().opponentPokemon!),
      )

      // Shake animation (3 oscillations)
      for (let i = 0; i < 6; i++) {
        store.setShakeX(i % 2 === 0 ? 10 : -10)
        await delay(80)
      }
      store.setShakeX(0)

      // Burn/poison end-of-turn damage on opponent
      const oppAfterHit = useBattleStore.getState().opponentPokemon!
      if (oppAfterHit.status === 'burn' || oppAfterHit.status === 'poison') {
        const dotDmg = Math.max(1, Math.floor(oppAfterHit.maxHp / 8))
        store.dealDamageToOpponent(dotDmg)
        store.addLog(`${getName(oppAfterHit)} is hurt by ${oppAfterHit.status}! (${dotDmg})`)
        if (useBattleStore.getState().opponentPokemon!.currentHp <= 0) {
          await handleWin()
          return
        }
      }

      await delay(300)
      await opponentTurn()
    }
    } catch (e) {
      console.error('[Battle] handleAnswer error:', e)
      store.setPhase('player_turn')
    }
  }

  async function opponentTurn() {
    let { playerPokemon, opponentPokemon } = useBattleStore.getState()
    if (!playerPokemon || !opponentPokemon) return
    store.setPhase('opponent_turn')
    try {
    await delay(800)

    // Opponent status checks
    if (opponentPokemon.status === 'sleep') {
      const turns = opponentPokemon.sleepTurns
      if (turns > 1) {
        store.setOpponentStatus('sleep', turns - 1)
        store.addLog(`${getName(opponentPokemon)} is fast asleep!`)
        await delay(800)
        store.setPhase('player_turn')
        return
      } else {
        store.setOpponentStatus(null)
        store.addLog(`${getName(opponentPokemon)} woke up!`)
      }
    }
    if (opponentPokemon.status === 'paralysis' && Math.random() < 0.25) {
      store.addLog(`${getName(opponentPokemon)} is paralyzed and can't move!`)
      await delay(800)
      store.setPhase('player_turn')
      return
    }

    // Re-read after possible status update
    opponentPokemon = useBattleStore.getState().opponentPokemon!
    playerPokemon = useBattleStore.getState().playerPokemon!

    const idx = Math.floor(Math.random() * opponentPokemon.moves.length)
    const move = opponentPokemon.moves[idx]
    const moveInfo = moveMap[move?.moveId ?? '']

    const defenderData = pokemonMap[playerPokemon.pokemonId]
    const attackerData = pokemonMap[opponentPokemon.pokemonId]
    const eff = getTypeEffectiveness(moveInfo?.type ?? 'normal', defenderData?.types ?? ['normal'])
    const atkStat = calculateStat(attackerData?.baseStats.atk ?? 50, opponentPokemon.level)
    const defStat = calculateStat(defenderData?.baseStats.def ?? 50, playerPokemon.level)

    store.addLog(`${getName(opponentPokemon)} used ${moveInfo?.name ?? 'Move'}!`)

    // Opponent lurch toward player (shift left)
    store.setOpponentAttacking(true)
    await delay(220)
    store.setOpponentAttacking(false)

    // Multi-hit for opponent too
    const fx = moveInfo?.effect
    const hits = fx?.min_hits != null && fx?.max_hits != null
      ? fx.min_hits + Math.floor(Math.random() * (fx.max_hits - fx.min_hits + 1))
      : 1
    let totalDmg = 0
    for (let h = 0; h < hits; h++) {
      const singleDmg = calculateDamage(opponentPokemon.level, moveInfo?.power ?? 0, atkStat, defStat, eff)
      if (h === 0) {
        store.setProjectileAnim(moveInfo?.type ?? 'normal', false)
        await delay(360)
      }
      store.dealDamageToPlayer(singleDmg)
      totalDmg += singleDmg
      store.showDamagePopup(singleDmg, false)
      store.setHitEffect(moveInfo?.type ?? 'normal', false)
      store.setPlayerFlash(true)
      await delay(120)
      store.setPlayerFlash(false)
      if (h === 0) store.clearProjectileAnim()
      if (hits > 1) await delay(80)
    }

    store.addLog(`${getName(playerPokemon)} took ${totalDmg} damage!${hits > 1 ? ` (${hits}× hit)` : ''}`)

    // Drain for opponent
    if (fx?.drain && fx.drain > 0) {
      const drainAmt = Math.max(1, Math.floor(totalDmg * fx.drain / 100))
      store.healOpponent(drainAmt)
      store.addLog(`${getName(opponentPokemon)} drained ${drainAmt} HP!`)
    }

    // Player shake (3 oscillations)
    for (let i = 0; i < 6; i++) {
      store.setPlayerShakeX(i % 2 === 0 ? 8 : -8)
      await delay(80)
    }
    store.setPlayerShakeX(0)

    // Try ailment on player
    tryApplyAilment(
      moveInfo,
      useBattleStore.getState().playerPokemon!.status,
      (s, t) => store.setPlayerStatus(s, t),
      getName(useBattleStore.getState().playerPokemon!),
    )

    await delay(300)

    if (useBattleStore.getState().playerPokemon!.currentHp <= 0) {
      store.addLog(`${getName(playerPokemon)} fainted!`)
      const hasHealthy = useBattleStore.getState().party.some(p => p.currentHp > 0)
      store.setPhase(hasHealthy ? 'switch_pokemon' : 'lose')
      return
    }

    // Burn/poison end-of-turn on player
    const plrAfter = useBattleStore.getState().playerPokemon!
    if (plrAfter.status === 'burn' || plrAfter.status === 'poison') {
      const dotDmg = Math.max(1, Math.floor(plrAfter.maxHp / 8))
      store.dealDamageToPlayer(dotDmg)
      store.addLog(`${getName(plrAfter)} is hurt by ${plrAfter.status}! (${dotDmg})`)
      if (useBattleStore.getState().playerPokemon!.currentHp <= 0) {
        store.addLog(`${getName(plrAfter)} fainted!`)
        const hasHealthy = useBattleStore.getState().party.some(p => p.currentHp > 0)
        store.setPhase(hasHealthy ? 'switch_pokemon' : 'lose')
        return
      }
    }

    store.setPhase('player_turn')
    } catch (e) {
      console.error('[Battle] opponentTurn error:', e)
      store.setPhase('player_turn')
    }
  }

  async function handleWin() {
    const { playerPokemon, opponentPokemon } = useBattleStore.getState()
    if (!playerPokemon || !opponentPokemon || !profile) return

    store.addLog(`${getName(opponentPokemon)} fainted!`)
    await delay(500)

    const exp = expGained(opponentPokemon.level)
    store.addLog(`${getName(playerPokemon)} gained ${exp} EXP!`)
    store.setExpAnimating(true)   // enable CSS transition first
    await delay(50)               // let React render with transition active but old XP value
    store.addExpToPlayer(exp)     // now change XP → bar animates from old to new
    await delay(2700)
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

    // Get final pokemon state after all animations and evolution
    const finalPokemon = useBattleStore.getState().playerPokemon!

    // Learn moves for any new levels gained
    let updatedMoves = [...finalPokemon.moves]
    if (newLevel > playerPokemon.level) {
      const pokeInfoForMoves = pokemonMap[finalPokemon.pokemonId] ?? pokemonMap[playerPokemon.pokemonId]
      if (pokeInfoForMoves) {
        const toLearn = pokeInfoForMoves.learnset.filter(
          e => e.level > playerPokemon.level && e.level <= newLevel
        )
        for (const entry of toLearn) {
          if (updatedMoves.some(m => m.moveId === entry.moveId)) continue
          const newMove = { moveId: entry.moveId, pp: 10, maxPp: 10 }
          if (updatedMoves.length < 4) {
            updatedMoves.push(newMove)
          } else {
            updatedMoves = [...updatedMoves.slice(1), newMove]
          }
          const mvName = moveMap[entry.moveId]?.name ?? entry.moveId
          store.addLog(`${getName(finalPokemon)} learned ${mvName}!`)
        }
      }
    }

    if (profile.id && profile.party?.length) {
      const profileNow = useProfileStore.getState().profile ?? profile
      const stats = {
        ...profileNow.stats,
        battlesWon: (profileNow.stats?.battlesWon ?? 0) + 1,
      }
      const updatedParty = profile.party.map((p, idx) =>
        idx === 0
          ? {
              ...p,
              pokemonId: finalPokemon.pokemonId,
              xp: newXp,
              level: newLevel,
              currentHp: finalPokemon.currentHp,
              moves: updatedMoves,
              nickname: finalPokemon.nickname,
            }
          : p
      )

      // Trainer battles reward 2 Pokéballs
      const { isWildBattle, trainerName } = useBattleStore.getState()
      let updatedBag = profile.bag ?? []
      if (!isWildBattle) {
        const hasBalls = updatedBag.some(b => b.itemId === 'pokeball')
        updatedBag = hasBalls
          ? updatedBag.map(b => b.itemId === 'pokeball' ? { ...b, qty: b.qty + 2 } : b)
          : [...updatedBag, { itemId: 'pokeball', qty: 2 }]
        store.addLog(`${trainerName ?? 'Trainer'} gave you 2 Pokéballs!`)
      }

      // Optimistic local update first, then fire-and-forget to Firestore
      // so a network hang on iOS never freezes the game at 'animating'
      useProfileStore.getState().setProfile({
        ...(useProfileStore.getState().profile ?? profile),
        party: updatedParty,
        stats,
        bag: updatedBag,
      })
      updateProfile(profile.id, { party: updatedParty, stats, bag: updatedBag })
        .catch(e => console.error('Failed to save battle result:', e))
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
    useProfileStore.getState().setProfile({ ...profile, bag: newBag })
    updateProfile(profile.id, { bag: newBag }).catch(() => {})

    await delay(600)
    await opponentTurn()
  }

  async function attemptCatch() {
    const state = useBattleStore.getState()
    const { opponentPokemon, playerPokemon, isWildBattle } = state
    if (!opponentPokemon || !playerPokemon || !isWildBattle || !profile?.id) return

    const ballCount = (profile.bag ?? []).find(b => b.itemId === 'pokeball')?.qty ?? 0
    if (ballCount <= 0) {
      store.addLog("You don't have any Pokéballs!")
      store.setPhase('player_turn')
      return
    }

    // Deduct one Pokéball immediately — optimistic update, fire-and-forget save
    const newBag = (profile.bag ?? [])
      .map(b => b.itemId === 'pokeball' ? { ...b, qty: b.qty - 1 } : b)
      .filter(b => b.qty > 0)
    useProfileStore.getState().setProfile({ ...profile, bag: newBag })
    updateProfile(profile.id, { bag: newBag }).catch(() => {})

    store.setPhase('animating')

    // Determine catch success before animation starts
    const pokeData = pokemonMap[opponentPokemon.pokemonId]
    const catchRate = pokeData?.catchRate ?? 45
    // Gen 3 HP factor: ranges from 1/3 at full HP to 1 at near-faint
    const hpFactor = (3 * opponentPokemon.maxHp - 2 * opponentPokemon.currentHp) / (3 * opponentPokemon.maxHp)
    // Level scaling: exponential — Lv10=0.5, Lv20=1.0, Lv30=1.84, Lv35=2.31
    const levelMod = Math.max(0.5, Math.pow(opponentPokemon.level / 20, 1.5))
    const catchChance = Math.min(0.95, Math.max(0.01, (catchRate * hpFactor) / (255 * levelMod)))
    const caught = Math.random() < catchChance
    store.setBallCaught(caught)

    // Phase 0 → idle pause before throw
    store.setBallAnimPhase(0)
    await delay(600)

    // Phase 1 → ball flies to opponent
    store.setBallAnimPhase(1)
    await delay(700)

    // Phase 2 → ball opens, flash
    store.setBallAnimPhase(2)
    await delay(250)

    // Phase 3 → ball shakes 3 times
    store.setBallAnimPhase(3)
    await delay(700)

    if (caught) {
      // Phase 4 → caught sparkles
      store.setBallAnimPhase(4)
      store.addLog(`Gotcha! ${getName(opponentPokemon)} was caught!`)
      await delay(900)

      // Grant XP for catching
      const catchExp = expGained(opponentPokemon.level)
      store.addLog(`${getName(playerPokemon)} gained ${catchExp} EXP!`)
      store.setExpAnimating(true)
      await delay(50)
      store.addExpToPlayer(catchExp)
      await delay(2700)
      store.setExpAnimating(false)

      const catchNewXp = playerPokemon.xp + catchExp
      const catchNewLevel = getLevel(catchNewXp)
      if (catchNewLevel > playerPokemon.level) {
        store.setLeveledUp(true)
        store.addLog(`${getName(playerPokemon)} grew to Lv.${catchNewLevel}!`)
        await delay(800)
        store.setLeveledUp(false)
      }

      const finalCatchPokemon = useBattleStore.getState().playerPokemon!
      const freshProfile = useProfileStore.getState().profile ?? profile
      const currentParty = freshProfile.party ?? []
      const currentBox = freshProfile.box ?? []
      // Party not full → add to party; otherwise send to box (lighter BoxPokemon format)
      const partyWithCaught = currentParty.length < 6
        ? [...currentParty, { ...opponentPokemon, nickname: null }]
        : currentParty
      const newBox = currentParty.length >= 6
        ? [...currentBox, { pokemonId: opponentPokemon.pokemonId, nickname: null, level: opponentPokemon.level, xp: opponentPokemon.xp }]
        : currentBox

      if (currentParty.length >= 6) {
        store.addLog(`Party is full! ${getName(opponentPokemon)} was sent to your Box.`)
      }

      const updatedCatchParty = partyWithCaught.map((p, idx) =>
        idx === 0
          ? { ...p, xp: catchNewXp, level: catchNewLevel, currentHp: finalCatchPokemon.currentHp, moves: finalCatchPokemon.moves }
          : p
      )
      const updatedPokedex = {
        ...(freshProfile.pokedex ?? {}),
        [opponentPokemon.pokemonId]: 'caught' as const,
      }
      useProfileStore.getState().setProfile({
        ...freshProfile,
        party: updatedCatchParty,
        box: newBox,
        pokedex: updatedPokedex,
      })
      updateProfile(profile.id, { party: updatedCatchParty, box: newBox, pokedex: updatedPokedex })
        .catch(e => console.error('Failed to save caught pokemon:', e))
      store.setBallAnimPhase(0)
      store.setPhase('win')
    } else {
      // Phase 5 → broke free
      store.setBallAnimPhase(5)
      store.addLog(`${getName(opponentPokemon)} broke free!`)
      await delay(500)
      store.setBallAnimPhase(0)
      await opponentTurn()
    }
  }

  return { selectMove, handleAnswer, continueBattle, useItemInBattle, attemptCatch, switchToPartyMember }
}
