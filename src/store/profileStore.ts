import { create } from 'zustand'
import type { Profile } from '../types/game'

interface ProfileState {
  profile: Profile | null
  setProfile: (profile: Profile) => void
  clearProfile: () => void
  updateProfile: (updates: Partial<Profile>) => void
  // Team replacement flow: which party slot is being replaced (-1 = none)
  replacingPartyIdx: number
  setReplacingPartyIdx: (idx: number) => void
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
  updateProfile: (updates) => set((state) => ({
    profile: state.profile ? { ...state.profile, ...updates } : null
  })),
  replacingPartyIdx: -1,
  setReplacingPartyIdx: (idx) => set({ replacingPartyIdx: idx }),
}))
