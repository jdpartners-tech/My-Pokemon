// Cap ALL Pokemon (party + box) above level 35 across ALL profiles
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

function capList(label, list) {
  let changed = 0
  const result = list.map(p => {
    if (p.level <= CAP) return p
    const capped = capPokemon(p)
    console.log(`    ${label} #${p.pokemonId} Lv${p.level} → Lv${capped.level}`)
    changed++
    return capped
  })
  return { result, changed }
}

async function run() {
  await signInAnonymously(auth)
  const snap = await getDocs(collection(db, 'profiles'))
  console.log(`Found ${snap.docs.length} profile(s)\n`)

  for (const d of snap.docs) {
    const data = d.data()
    const name = data.name ?? '(unnamed)'
    const party = data.party ?? []
    const box   = data.box   ?? []

    const partyOver = party.filter(p => p.level > CAP).length
    const boxOver   = box.filter(p => p.level > CAP).length

    if (partyOver === 0 && boxOver === 0) {
      console.log(`${name}: all clean`)
      continue
    }

    console.log(`${name}: ${partyOver} party + ${boxOver} box Pokemon above Lv${CAP}`)
    const { result: newParty, changed: pc } = capList('party', party)
    const { result: newBox,   changed: bc } = capList('box',   box)

    const updates = {}
    if (pc > 0) updates.party = newParty
    if (bc > 0) updates.box   = newBox

    await updateDoc(doc(db, 'profiles', d.id), updates)
    console.log(`  Saved (${pc} party + ${bc} box updated)\n`)
  }

  console.log('All done.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
