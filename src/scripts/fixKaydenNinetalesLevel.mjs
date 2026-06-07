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

async function run() {
  await signInAnonymously(auth)
  const ref = doc(db, 'profiles', KAYDEN_ID)
  const snap = await getDoc(ref)
  if (!snap.exists()) { console.error('Profile not found'); process.exit(1) }

  const data = snap.data()
  const box = data.box ?? []

  // Find the Lv30 Ninetales we just added and correct it to Lv33
  // XP for Lv33 = 9200 + (33-31)*800 = 10800
  const newBox = box.map(b => {
    if (b.pokemonId === 38 && b.level === 30) {
      return { ...b, level: 33, xp: 10800 }
    }
    return b
  })

  const changed = newBox.some((b, i) => b.level !== box[i]?.level)
  if (!changed) { console.log('Ninetales Lv30 not found — nothing updated'); process.exit(0) }

  await updateDoc(ref, { box: newBox })
  console.log('Updated Ninetales in Kayden\'s box: Lv30 → Lv33 (XP 10800)')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
