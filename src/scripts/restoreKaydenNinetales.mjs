import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore'
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

const KAYDEN_ID = 'ShJnbciQEEqE403UcUa8'

// Ninetales: #38, level 30 (user said "30 ish")
// XP for level 30 from the formula: expForLevel(30) = 4200 + (30-21)*500 = 4200 + 4500 = 8700
const ninetales = {
  pokemonId: 38,
  nickname: null,
  level: 30,
  xp: 8700,
}

async function run() {
  await signInAnonymously(auth)
  const ref = doc(db, 'profiles', KAYDEN_ID)
  const snap = await getDoc(ref)
  if (!snap.exists()) { console.error('Profile not found'); process.exit(1) }

  const data = snap.data()
  const box = data.box ?? []

  // Check Ninetales isn't already there
  const existing = box.find(b => b.pokemonId === 38)
  if (existing) {
    console.log('Ninetales already in box:', existing)
    process.exit(0)
  }

  const newBox = [...box, ninetales]
  await updateDoc(ref, { box: newBox })
  console.log(`Restored Ninetales #38 Lv30 to Kayden's box (now ${newBox.length} Pokemon in box)`)
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
