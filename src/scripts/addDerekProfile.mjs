// Adds Derek's profile with the 6 strongest Gen 1 Pokemon at level 30
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(resolve(__dirname, '../../.env.local'), 'utf-8')
const vars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

const app = initializeApp({
  apiKey:            vars.VITE_FIREBASE_API_KEY?.trim(),
  authDomain:        vars.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId:         vars.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket:     vars.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: vars.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId:             vars.VITE_FIREBASE_APP_ID?.trim(),
})
const db = getFirestore(app)
const auth = getAuth(app)

// Strongest 6 Gen 1: Mewtwo(150), Dragonite(149), Mew(151), Zapdos(145), Arcanine(59), Gyarados(130)
// All at level 30
function buildMon(pokemonId, level) {
  return {
    pokemonId,
    nickname: null,
    level,
    xp: Math.pow(level, 3),
    currentHp: 100,
    maxHp: 100,
    moves: [
      { moveId: 'tackle', pp: 35, maxPp: 35 },
      { moveId: 'swift', pp: 20, maxPp: 20 },
    ],
    heldItem: null,
    status: null,
    sleepTurns: 0,
  }
}

const DEREK_PARTY = [
  buildMon(150, 30),  // Mewtwo
  buildMon(149, 30),  // Dragonite
  buildMon(151, 30),  // Mew
  buildMon(145, 30),  // Zapdos
  buildMon(59,  30),  // Arcanine
  buildMon(130, 30),  // Gyarados
]

const DEREK_POKEDEX = Object.fromEntries(
  [150, 149, 151, 145, 59, 130].map(id => [id, 'caught'])
)

async function run() {
  await signInAnonymously(auth)

  // Check if Derek already has a profile
  const snapshot = await getDocs(collection(db, 'profiles'))
  const derek = snapshot.docs.find(d => d.data().name?.toLowerCase() === 'derek')

  if (derek) {
    // Update existing profile
    await updateDoc(doc(db, 'profiles', derek.id), {
      party: DEREK_PARTY,
      pokedex: { ...derek.data().pokedex, ...DEREK_POKEDEX },
    })
    console.log(`Updated Derek's profile (${derek.id}) with 6 strongest Pokemon at Lv30`)
  } else {
    console.log('No profile named Derek found. Please create one in the game first (Admin panel or Add Profile).')
    console.log('Existing profiles:', snapshot.docs.map(d => d.data().name).join(', '))
  }

  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
