// Remove duplicate Mewtwo from Kaylie's party, cap remaining to level 35
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

const MEWTWO_ID = 150
const TARGET_LEVEL = 35

async function run() {
  await signInAnonymously(auth)
  const snap = await getDocs(collection(db, 'profiles'))
  const kaylie = snap.docs.find(d => d.data().name?.toLowerCase().startsWith('kaylie'))
  if (!kaylie) { console.log('Kaylie not found'); process.exit(1) }

  const party = kaylie.data().party ?? []
  console.log("Kaylie's current party:")
  party.forEach((p, i) => console.log(`  [${i}] #${p.pokemonId} Lv${p.level} HP ${p.currentHp}/${p.maxHp}`))

  const mewtwoIndices = party.map((p, i) => p.pokemonId === MEWTWO_ID ? i : -1).filter(i => i >= 0)
  console.log(`\nMewtwo slots: ${mewtwoIndices.join(', ')}`)

  if (mewtwoIndices.length === 0) {
    console.log('No Mewtwo found'); process.exit(0)
  }

  // Keep the first Mewtwo, remove extras
  const keepIdx = mewtwoIndices[0]
  let newParty = party.filter((_, i) => i === keepIdx || party[i].pokemonId !== MEWTWO_ID)

  // Cap the kept Mewtwo to level 35
  newParty = newParty.map(p => {
    if (p.pokemonId !== MEWTWO_ID) return p
    const scaledMaxHp = Math.max(1, Math.round(p.maxHp * TARGET_LEVEL / p.level))
    const scaledHp    = Math.max(1, Math.min(scaledMaxHp, Math.round(p.currentHp * TARGET_LEVEL / p.level)))
    return { ...p, level: TARGET_LEVEL, xp: Math.pow(TARGET_LEVEL, 3), maxHp: scaledMaxHp, currentHp: scaledHp }
  })

  console.log("\nUpdated party:")
  newParty.forEach((p, i) => console.log(`  [${i}] #${p.pokemonId} Lv${p.level} HP ${p.currentHp}/${p.maxHp}`))

  await updateDoc(doc(db, 'profiles', kaylie.id), { party: newParty })
  console.log('\nSaved.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
