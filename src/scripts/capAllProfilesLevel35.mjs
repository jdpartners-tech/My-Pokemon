// Cap every Pokemon above level 35 to level 35 across ALL profiles
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
  const scaledMaxHp = Math.max(1, Math.round(p.maxHp * CAP / p.level))
  const scaledHp    = Math.max(1, Math.min(scaledMaxHp, Math.round(p.currentHp * CAP / p.level)))
  return { ...p, level: CAP, xp: Math.pow(CAP, 3), maxHp: scaledMaxHp, currentHp: scaledHp }
}

async function run() {
  await signInAnonymously(auth)
  const snap = await getDocs(collection(db, 'profiles'))

  console.log(`Found ${snap.docs.length} profile(s)\n`)

  for (const d of snap.docs) {
    const data = d.data()
    const name = data.name ?? '(unnamed)'
    const party = data.party ?? []

    const over = party.filter(p => p.level > CAP)
    if (over.length === 0) {
      console.log(`${name}: all Pokemon <= Lv${CAP} — no changes needed`)
      continue
    }

    console.log(`${name}: ${over.length} Pokemon above Lv${CAP}`)
    const newParty = party.map(p => {
      if (p.level <= CAP) return p
      const capped = capPokemon(p)
      console.log(`  #${p.pokemonId} Lv${p.level} → Lv${capped.level}  (HP ${p.currentHp}/${p.maxHp} → ${capped.currentHp}/${capped.maxHp})`)
      return capped
    })

    await updateDoc(doc(db, 'profiles', d.id), { party: newParty })
    console.log(`  Saved.\n`)
  }

  console.log('Done.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
