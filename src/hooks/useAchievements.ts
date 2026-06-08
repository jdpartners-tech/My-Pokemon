import { useState, useEffect, useRef, useCallback } from 'react'
import { ACHIEVEMENTS, AchievementDef } from '../data/achievements'
import type { Profile } from '../types/game'

export function useAchievements(
  profile: Profile | null,
  profileId: string | undefined,
  rewardReady: boolean,
  updateProfile: (id: string, updates: Partial<Profile>) => Promise<void>,
  setProfile: (p: Profile) => void,
) {
  const [toastQueue, setToastQueue] = useState<AchievementDef[]>([])
  const checked = useRef(false)

  useEffect(() => {
    // Wait until daily reward has been shown (or skipped) before checking
    if (rewardReady) return
    if (!profile || !profileId || checked.current) return
    checked.current = true

    const unlocked = profile.achievements ?? []
    const newlyUnlocked = ACHIEVEMENTS.filter(
      def => !unlocked.includes(def.id) && def.check(profile)
    )
    if (newlyUnlocked.length === 0) return

    const updatedAchievements = [...unlocked, ...newlyUnlocked.map(d => d.id)]
    setProfile({ ...profile, achievements: updatedAchievements })
    updateProfile(profileId, { achievements: updatedAchievements }).catch(() => {})
    setToastQueue(newlyUnlocked)
  }, [profile, profileId, rewardReady])

  const dismissToast = useCallback((id: string) => {
    setToastQueue(q => q.filter(a => a.id !== id))
  }, [])

  return { toastQueue, dismissToast }
}
