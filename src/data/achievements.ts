import type { Profile } from '../types/game'

export interface AchievementDef {
  id: string
  name: string
  icon: string
  description: string   // shown when locked
  flavour: string       // shown when unlocked
  check: (profile: Profile) => boolean
}

function caughtCount(profile: Profile): number {
  return Object.values(profile.pokedex ?? {}).filter(v => v === 'caught').length
}

function seenCount(profile: Profile): number {
  return Object.values(profile.pokedex ?? {}).filter(v => v === 'seen' || v === 'caught').length
}

export const ALL_MAP_IDS = [
  'pallet', 'pokecenter', 'cinnabarPokecenter',
  'sunlitMeadow', 'viridianForest', 'flowerMeadow',
  'mistyLake', 'rockyCave', 'trainerRoad',
  'cinnabarTown', 'volcanoTrail',
]

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Battle ──────────────────────────────────────────────────────────
  {
    id: 'first_battle', name: 'First Victory', icon: '🥇',
    description: 'Win your first battle',
    flavour: 'Every champion starts somewhere!',
    check: p => (p.stats?.battlesWon ?? 0) >= 1,
  },
  {
    id: 'battle_10', name: 'Fighter', icon: '⚔️',
    description: 'Win 10 battles',
    flavour: 'You\'re getting the hang of this.',
    check: p => (p.stats?.battlesWon ?? 0) >= 10,
  },
  {
    id: 'battle_50', name: 'Warrior', icon: '🗡️',
    description: 'Win 50 battles',
    flavour: 'Battle-hardened and fearless.',
    check: p => (p.stats?.battlesWon ?? 0) >= 50,
  },
  {
    id: 'battle_100', name: 'Champion', icon: '👑',
    description: 'Win 100 battles',
    flavour: 'A true Pokémon Champion!',
    check: p => (p.stats?.battlesWon ?? 0) >= 100,
  },

  // ── Scholar ─────────────────────────────────────────────────────────
  {
    id: 'question_10', name: 'Student', icon: '✏️',
    description: 'Answer 10 questions correctly',
    flavour: 'Knowledge is power!',
    check: p => (p.stats?.questionsCorrect ?? 0) >= 10,
  },
  {
    id: 'question_50', name: 'Bookworm', icon: '📝',
    description: 'Answer 50 questions correctly',
    flavour: 'Your brain is your best weapon.',
    check: p => (p.stats?.questionsCorrect ?? 0) >= 50,
  },
  {
    id: 'question_100', name: 'Scholar', icon: '🎓',
    description: 'Answer 100 questions correctly',
    flavour: 'Top of the class!',
    check: p => (p.stats?.questionsCorrect ?? 0) >= 100,
  },
  {
    id: 'accuracy_80', name: 'Sharp Mind', icon: '🎯',
    description: 'Reach 80% accuracy (min 20 answered)',
    flavour: 'Precision is everything.',
    check: p => {
      const answered = p.stats?.questionsAnswered ?? 0
      const correct = p.stats?.questionsCorrect ?? 0
      return answered >= 20 && correct / answered >= 0.8
    },
  },

  // ── Streak ──────────────────────────────────────────────────────────
  {
    id: 'streak_3', name: 'On a Roll', icon: '🔥',
    description: 'Log in 3 days in a row',
    flavour: 'Keep the fire burning!',
    check: p => (p.loginStreak ?? 0) >= 3,
  },
  {
    id: 'streak_7', name: 'Dedicated Trainer', icon: '🌟',
    description: 'Log in 7 days in a row',
    flavour: 'Your dedication is unmatched.',
    check: p => (p.loginStreak ?? 0) >= 7,
  },

  // ── Game Progress ────────────────────────────────────────────────────
  {
    id: 'first_catch', name: 'First Catch', icon: '🎣',
    description: 'Catch your first Pokémon',
    flavour: 'Gotcha!',
    check: p => Object.values(p.pokedex ?? {}).some(v => v === 'caught'),
  },
  {
    id: 'catch_5', name: 'Collector', icon: '📦',
    description: 'Catch 5 Pokémon',
    flavour: 'Building a collection!',
    check: p => caughtCount(p) >= 5,
  },
  {
    id: 'catch_20', name: 'Master Catcher', icon: '🏆',
    description: 'Catch 20 Pokémon',
    flavour: 'You\'ve got quite the team!',
    check: p => caughtCount(p) >= 20,
  },
  {
    id: 'evolved', name: 'Evolved!', icon: '⭐',
    description: 'Evolve a Pokémon',
    flavour: 'The power of growth!',
    check: p => (p.achievements ?? []).includes('evolved'),
  },
  {
    id: 'full_party', name: 'Full Team', icon: '👥',
    description: 'Have 6 Pokémon in your party',
    flavour: 'A full squad is ready for anything.',
    check: p => (p.party ?? []).length >= 6,
  },
  {
    id: 'pokedex_30', name: 'Scout', icon: '📖',
    description: 'See 30 different Pokémon',
    flavour: 'The world is full of Pokémon!',
    check: p => seenCount(p) >= 30,
  },
  {
    id: 'pokedex_50', name: 'Researcher', icon: '📕',
    description: 'See 50 different Pokémon',
    flavour: 'A true Pokémon researcher!',
    check: p => seenCount(p) >= 50,
  },
  {
    id: 'explorer_3', name: 'Explorer', icon: '🗺️',
    description: 'Visit 3 different maps',
    flavour: 'Adventure awaits around every corner.',
    check: p => (p.visitedRoutes ?? []).length >= 3,
  },
  {
    id: 'explorer_all', name: 'Adventurer', icon: '🌍',
    description: 'Visit all maps',
    flavour: 'You\'ve seen it all!',
    check: p => (p.visitedRoutes ?? []).length >= ALL_MAP_IDS.length,
  },
  {
    id: 'rich_trainer', name: 'Rich Trainer', icon: '💰',
    description: 'Hold 2000₽ at once',
    flavour: 'Money talks!',
    check: p => (p.money ?? 0) >= 2000,
  },
]
