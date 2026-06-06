// Cap all party Pokemon above level 35 back to level 35 for Kayden and Kaylie
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

const CAP = 35

function capPokemon(p) {
  if (p.level <= CAP) return p
  const newLevel = CAP
  const newMaxHp = Math.floor((2 * 45 * newLevel) / 100 + newLevel + 10)  // generic fallback HP
  // Keep maxHp proportional: scale down by level ratio
  const scaledMaxHp = Math.max(1, Math.round(p.maxHp * newLevel / p.level))
  const scaledHp    = Math.max(1, Math.min(scaledMaxHp, Math.round(p.currentHp * newLevel / p.level)))
  return {
    ...p,
    level:     newLevel,
    xp:        Math.pow(newLevel, 3),
    maxHp:     scaledMaxHp,
    currentHp: scaledHp,
  }
}

async function processProfile(docSnap) {
  const data = docSnap.data()
  const name = data.name ?? '(unknown)'
  const party = data.party ?? []

  console.log(`\n── ${name} ──`)
  const over = party.filter(p => p.level > CAP)
  if (over.length === 0) {
    console.log('  No Pokemon above level 35 — skipping')
    return
  }

  const newParty = party.map(p => {
    if (p.level <= CAP) return p
    const capped = capPokemon(p)
    console.log(`  #${p.pokemonId} Lv${p.level} → Lv${capped.level}  HP ${p.currentHp}/${p.maxHp} → ${capped.currentHp}/${capped.maxHp}`)
    return capped
  })

  await updateDoc(doc(db, 'profiles', docSnap.id), { party: newParty })
  console.log(`  Saved.`)
}

async function run() {
  await signInAnonymously(auth)
  const snap = await getDocs(collection(db, 'profiles'))

  for (const d of snap.docs) {
    const name = (d.data().name ?? '').toLowerCase()
    if (name.startsWith('kayden') || name.startsWith('kaylie')) {
      await processProfile(d)
    }
  }

  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
