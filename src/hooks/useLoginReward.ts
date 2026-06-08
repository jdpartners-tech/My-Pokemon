import { useState, useEffect, useRef } from 'react'
import type { Profile, BagItem } from '../types/game'

export interface DayReward {
  day: number
  coins: number
  itemId: string | null
  itemName: string | null
  rareEncounter: boolean
}

export const REWARD_SCHEDULE: Record<number, DayReward> = {
  1: { day: 1, coins: 100,  itemId: null,          itemName: null,           rareEncounter: false },
  2: { day: 2, coins: 150,  itemId: null,          itemName: null,           rareEncounter: false },
  3: { day: 3, coins: 200,  itemId: 'potion',      itemName: 'Potion',       rareEncounter: false },
  4: { day: 4, coins: 250,  itemId: null,          itemName: null,           rareEncounter: false },
  5: { day: 5, coins: 300,  itemId: null,          itemName: null,           rareEncounter: false },
  6: { day: 6, coins: 350,  itemId: 'super-potion', itemName: 'Super Potion', rareEncounter: false },
  7: { day: 7, coins: 500,  itemId: 'rare-candy',  itemName: 'Rare Candy',   rareEncounter: true  },
}

export const RARE_ENCOUNTER_POOL = [147, 131, 133, 113, 143, 140, 138]
// Dratini, Lapras, Eevee, Chansey, Snorlax, Kabuto, Omanyte

function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

function applyItem(bag: BagItem[], itemId: string): BagItem[] {
  const existing = bag.find(b => b.itemId === itemId)
  if (existing) {
    return bag.map(b => b.itemId === itemId ? { ...b, qty: b.qty + 1 } : b)
  }
  return [...bag, { itemId, qty: 1 }]
}

export function useLoginReward(
  profile: Profile | null,
  profileId: string | undefined,
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>,
  setProfile: (p: Profile) => void,
) {
  const today = new Date().toISOString().slice(0, 10)

  // Compute reward state once on mount — profile ref guards against re-runs
  const computed = useRef(false)
  const [rewardReady, setRewardReady] = useState(false)
  const [todayReward, setTodayReward] = useState<DayReward>(REWARD_SCHEDULE[1])
  const [newStreak, setNewStreak] = useState(1)
  const pendingRareEncounterRef = useRef(false)

  useEffect(() => {
    if (!profile || !profileId || computed.current) return
    if ((profile.lastLoginDate ?? '') === today) return  // already claimed today
    computed.current = true

    const yesterday = addDays(today, -1)
    const streak = (profile.lastLoginDate ?? '') === yesterday
      ? Math.min((profile.loginStreak ?? 0) + 1, 7)
      : 1
    const reward = REWARD_SCHEDULE[streak]
    setNewStreak(streak)
    setTodayReward(reward)
    setRewardReady(true)
  }, [profile, profileId, today])

  function dismissReward() {
    if (!profile || !profileId) return
    const reward = REWARD_SCHEDULE[newStreak]
    const newMoney = (profile.money ?? 0) + reward.coins
    const newBag = reward.itemId ? applyItem(profile.bag ?? [], reward.itemId) : (profile.bag ?? [])
    const updates: Partial<Profile> = {
      money: newMoney,
      bag: newBag,
      lastLoginDate: today,
      loginStreak: newStreak,
    }
    // Optimistic local update
    setProfile({ ...profile, ...updates })
    updateProfile(profileId, updates).catch(() => {})
    if (reward.rareEncounter) pendingRareEncounterRef.current = true
    setRewardReady(false)
  }

  return { rewardReady, todayReward, newStreak, dismissReward, pendingRareEncounterRef }
}
