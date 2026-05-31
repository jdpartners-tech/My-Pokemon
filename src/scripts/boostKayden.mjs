// Add 10 levels and full heal all of Kayden's party
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

async function run() {
  await signInAnonymously(auth)
  const snap = await getDocs(collection(db, 'profiles'))
  const kayden = snap.docs.find(d => d.data().name?.toLowerCase() === 'kayden')
  if (!kayden) { console.log('Kayden not found'); process.exit(1) }

  const party = kayden.data().party ?? []
  const boosted = party.map(p => {
    const newLevel = Math.min(100, p.level + 10)
    const newXp = Math.pow(newLevel, 3)
    // Estimate new maxHp with higher level (simple formula)
    const newMaxHp = Math.floor(p.maxHp * (newLevel / p.level) * 1.1)
    return { ...p, level: newLevel, xp: newXp, currentHp: newMaxHp, maxHp: newMaxHp }
  })

  await updateDoc(doc(db, 'profiles', kayden.id), { party: boosted })
  console.log(`Kayden's party boosted +10 levels and fully healed:`)
  boosted.forEach(p => console.log(`  #${p.pokemonId} Lv${p.level} HP ${p.currentHp}/${p.maxHp}`))
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
