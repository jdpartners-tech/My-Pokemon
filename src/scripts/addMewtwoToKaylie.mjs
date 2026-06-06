// Add level 50 Mewtwo to Kaylie's party, replacing the weakest (lowest level) Pokemon
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(resolve(__dirname, '../../.env.local'), 'utf-8')
const vars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

const app = initializeApp({
  apiKey: vars.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: vars.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: vars.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: vars.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: vars.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: vars.VITE_FIREBASE_APP_ID?.trim(),
})
const db = getFirestore(app)
const auth = getAuth(app)

// Mewtwo lv50 stats: HP = floor((2*106 + 31 + floor(0/4)) * 50/100 + 50 + 10) ≈ 178
// Simple approximation matching the game's buildPartyPokemon formula
const MEWTWO_ID = 150
const LEVEL = 50
const mewtwoMaxHp = Math.floor((2 * 106 * LEVEL) / 100 + LEVEL + 10)  // ~167

const mewtwo = {
  pokemonId: MEWTWO_ID,
  nickname: null,
  level: LEVEL,
  xp: Math.pow(LEVEL, 3),
  maxHp: mewtwoMaxHp,
  currentHp: mewtwoMaxHp,
  moves: [
    { moveId: 'psychic',      pp: 10, maxPp: 10 },
    { moveId: 'swift',        pp: 20, maxPp: 20 },
    { moveId: 'recover',      pp: 10, maxPp: 10 },
    { moveId: 'shadow-ball',  pp: 15, maxPp: 15 },
  ],
}

async function run() {
  await signInAnonymously(auth)
  const snap = await getDocs(collection(db, 'profiles'))
  const kaylie = snap.docs.find(d => d.data().name?.toLowerCase().startsWith('kaylie'))
  if (!kaylie) { console.log('Kaylie not found'); process.exit(1) }

  const party = kaylie.data().party ?? []
  console.log("Kaylie's current party:")
  party.forEach((p, i) => console.log(`  [${i}] #${p.pokemonId} Lv${p.level} HP ${p.currentHp}/${p.maxHp}`))

  if (party.length === 0) {
    console.log('Party is empty — adding Mewtwo as first member')
    await updateDoc(doc(db, 'profiles', kaylie.id), { party: [mewtwo] })
  } else {
    // Find weakest = lowest level (ties broken by lowest index)
    let weakestIdx = 0
    for (let i = 1; i < party.length; i++) {
      if (party[i].level < party[weakestIdx].level) weakestIdx = i
    }
    console.log(`\nReplacing slot [${weakestIdx}] #${party[weakestIdx].pokemonId} Lv${party[weakestIdx].level} with Mewtwo Lv${LEVEL}`)
    const newParty = [...party]
    newParty[weakestIdx] = mewtwo
    await updateDoc(doc(db, 'profiles', kaylie.id), { party: newParty })
    console.log("\nUpdated party:")
    newParty.forEach((p, i) => console.log(`  [${i}] #${p.pokemonId} Lv${p.level} HP ${p.currentHp}/${p.maxHp}`))
  }

  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
