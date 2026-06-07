// Migrates all party & box Pokemon XP to current formula.
// Keeps each Pokemon's current level — just recalculates XP to match the new curve.
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore'
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

function newExpForLevel(level) {
  if (level <= 1)  return 0
  if (level <= 11) return (level - 1) * 120
  if (level <= 21) return 1200 + (level - 11) * 300
  if (level <= 31) return 4200 + (level - 21) * 500
  if (level <= 41) return 9200 + (level - 31) * 800
  return 17200 + (level - 41) * 1100
}

function migratePokemon(list) {
  if (!Array.isArray(list)) return list
  return list.map(p => ({
    ...p,
    xp: newExpForLevel(p.level ?? 1),
  }))
}

async function run() {
  await signInAnonymously(auth)
  const snap = await getDocs(collection(db, 'profiles'))
  for (const d of snap.docs) {
    const data = d.data()
    const newParty = migratePokemon(data.party)
    const newBox   = migratePokemon(data.box)
    await updateDoc(doc(db, 'profiles', d.id), { party: newParty, box: newBox })
    const all = [...(newParty ?? []), ...(newBox ?? [])]
    console.log(`✓ "${data.name}" — ${all.length} pokemon updated`)
    all.forEach(p => console.log(`   lv${p.level} → xp=${p.xp}`))
  }
  console.log('\nDone. All Pokemon XP reset to new formula.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
