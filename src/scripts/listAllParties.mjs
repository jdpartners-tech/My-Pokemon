import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
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

async function run() {
  await signInAnonymously(auth)
  const snap = await getDocs(collection(db, 'profiles'))
  for (const d of snap.docs) {
    const data = d.data()
    console.log(`\n── ${data.name ?? '(unnamed)'} (id: ${d.id}) ──`)
    const party = data.party ?? []
    if (party.length === 0) { console.log('  (empty party)'); continue }
    party.forEach((p, i) => {
      const flag = p.level > 35 ? ' ⚠️  ABOVE 35' : ''
      console.log(`  [${i}] #${p.pokemonId} Lv${p.level} HP ${p.currentHp}/${p.maxHp}${flag}`)
    })
    // Also check box/storage if it exists
    const box = data.box ?? data.storage ?? data.caught ?? []
    if (box.length > 0) {
      console.log(`  Box (${box.length} Pokemon):`)
      box.forEach((p, i) => {
        const flag = p.level > 35 ? ' ⚠️  ABOVE 35' : ''
        console.log(`    [${i}] #${p.pokemonId} Lv${p.level}${flag}`)
      })
    }
  }
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
