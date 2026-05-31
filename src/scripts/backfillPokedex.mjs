// Backfills profile.pokedex from existing party pokemon
// Run once: node src/scripts/backfillPokedex.mjs
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
  apiKey:            vars.VITE_FIREBASE_API_KEY?.trim(),
  authDomain:        vars.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId:         vars.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket:     vars.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: vars.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId:             vars.VITE_FIREBASE_APP_ID?.trim(),
})
const db = getFirestore(app)
const auth = getAuth(app)

async function backfill() {
  await signInAnonymously(auth)
  const snapshot = await getDocs(collection(db, 'profiles'))

  for (const docSnap of snapshot.docs) {
    const profile = docSnap.data()
    const party = profile.party ?? []
    const box = profile.box ?? []
    const allPokemon = [...party, ...box]

    if (allPokemon.length === 0) continue

    // Build pokedex from all pokemon the player owns
    const existingPokedex = profile.pokedex ?? {}
    const updatedPokedex = { ...existingPokedex }

    for (const mon of allPokemon) {
      if (mon.pokemonId) {
        updatedPokedex[mon.pokemonId] = 'caught'
      }
    }

    const newEntries = Object.keys(updatedPokedex).length - Object.keys(existingPokedex).length
    if (newEntries > 0) {
      await updateDoc(doc(db, 'profiles', docSnap.id), { pokedex: updatedPokedex })
      console.log(`  Updated ${profile.name}: added ${newEntries} Pokedex entries (total: ${Object.keys(updatedPokedex).length})`)
    } else {
      console.log(`  ${profile.name}: already up to date (${Object.keys(existingPokedex).length} entries)`)
    }
  }

  console.log('\nDone.')
  process.exit(0)
}

backfill().catch(err => { console.error(err); process.exit(1) })
