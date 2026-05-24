import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where,
} from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { db, auth } from '../firebase'
import type { Profile, SubjectSettings } from '../types/game'

async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth)
  }
}

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(pin + 'my-pokemon-salt')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function defaultSubjects(): SubjectSettings {
  return {
    english: { enabled: true, types: [] },
    maths:   { enabled: true, types: [] },
    chinese: { enabled: true, types: [] },
  }
}

export function useFirestoreProfile() {
  async function getAllProfiles(): Promise<Profile[]> {
    await ensureAuth()
    const snap = await getDocs(collection(db, 'profiles'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Profile))
  }

  async function getProfileByPin(pin: string): Promise<Profile | null> {
    await ensureAuth()
    const pinHash = await hashPin(pin)
    const q = query(collection(db, 'profiles'), where('pinHash', '==', pinHash))
    const snap = await getDocs(q)
    if (snap.empty) return null
    const d = snap.docs[0]
    return { id: d.id, ...d.data() } as Profile
  }

  async function saveProfile(profile: Omit<Profile, 'id'>, pin: string): Promise<string> {
    await ensureAuth()
    const pinHash = await hashPin(pin)
    const ref = doc(collection(db, 'profiles'))
    const data: Omit<Profile, 'id'> = {
      ...profile,
      pinHash,
    }
    await setDoc(ref, data)
    return ref.id
  }

  async function updateProfile(id: string, updates: Partial<Profile>): Promise<void> {
    await ensureAuth()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(doc(db, 'profiles', id), updates as any)
  }

  async function deleteProfile(id: string): Promise<void> {
    await ensureAuth()
    await deleteDoc(doc(db, 'profiles', id))
  }

  function createDefaultProfile(
    name: string,
    age: number,
    difficulty: 'beginner' | 'advanced',
    starterPokemon: string
  ): Omit<Profile, 'id' | 'pinHash'> {
    const starterIds: Record<string, number> = {
      bulbasaur: 1, charmander: 4, squirtle: 7, pikachu: 25, eevee: 133,
    }
    const starterId = starterIds[starterPokemon] ?? 4

    return {
      name,
      age,
      difficulty,
      starterPokemon,
      subjects: defaultSubjects(),
      party: [],
      box: [],
      pokedex: { [starterId]: 'caught' },
      badges: [],
      money: 3000,
      currentRoute: 'pallet',
      playerX: 7,
      playerY: 6,
      stats: { battlesWon: 0, questionsAnswered: 0, questionsCorrect: 0 },
    }
  }

  return {
    getAllProfiles,
    getProfileByPin,
    saveProfile,
    updateProfile,
    deleteProfile,
    createDefaultProfile,
    hashPin,
  }
}
