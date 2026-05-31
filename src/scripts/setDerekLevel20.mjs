// Set all of Derek's party Pokémon to level 20 with full heal
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

const TARGET_LEVEL = 20

async function run() {
  await signInAnonymously(auth)
  const snap = await getDocs(collection(db, 'profiles'))
  const derek = snap.docs.find(d => d.data().name?.toLowerCase() === 'derek')
  if (!derek) { console.log('Derek not found'); process.exit(1) }

  const party = derek.data().party ?? []
  const updated = party.map(p => {
    const xp = Math.pow(TARGET_LEVEL, 3)
    const scale = TARGET_LEVEL / Math.max(1, p.level)
    const newMaxHp = Math.max(20, Math.round((p.maxHp ?? 20) * scale))
    return { ...p, level: TARGET_LEVEL, xp, currentHp: newMaxHp, maxHp: newMaxHp }
  })

  await updateDoc(doc(db, 'profiles', derek.id), { party: updated })
  console.log(`Derek's party set to level ${TARGET_LEVEL}:`)
  updated.forEach(p => console.log(`  #${p.pokemonId} Lv${p.level} HP ${p.currentHp}/${p.maxHp}`))
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
