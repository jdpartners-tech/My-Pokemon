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

const pokemon = JSON.parse(readFileSync(resolve(__dirname, '../data/pokemon.json'), 'utf-8'))
const pokeMap = Object.fromEntries(pokemon.map(p => [p.id, p]))

function calcMaxHp(baseHp, level) {
  return Math.floor((2 * baseHp * level) / 100 + level + 10)
}

async function fixProfile(profileId, name) {
  const ref = doc(db, 'profiles', profileId)
  const snap = await getDoc(ref)
  if (!snap.exists()) { console.log(`${name}: not found`); return }

  const data = snap.data()
  const party = data.party ?? []
  let changed = false

  const fixedParty = party.map(p => {
    const info = pokeMap[p.pokemonId]
    if (!info) return p
    const correctMaxHp = calcMaxHp(info.baseStats.hp, p.level)
    if (p.maxHp !== correctMaxHp) {
      console.log(`  ${name} #${p.pokemonId} Lv${p.level}: maxHp ${p.maxHp} → ${correctMaxHp} (currentHp: ${p.currentHp} → ${Math.min(p.currentHp, correctMaxHp)})`)
      changed = true
      return { ...p, maxHp: correctMaxHp, currentHp: Math.min(p.currentHp, correctMaxHp) }
    }
    return p
  })

  if (changed) {
    await updateDoc(ref, { party: fixedParty })
    console.log(`  ${name}: saved`)
  } else {
    console.log(`  ${name}: all maxHp values correct`)
  }
}

async function run() {
  await signInAnonymously(auth)
  console.log('Fixing stale maxHp in all profiles...')
  await fixProfile('ShJnbciQEEqE403UcUa8', 'Kayden')
  await fixProfile('NifmP11ADr0GWuDekd1i', 'Kaylie Cat')
  await fixProfile('UAy8QDJtBRyfEL43b9sx', 'Derek')
  console.log('Done.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
