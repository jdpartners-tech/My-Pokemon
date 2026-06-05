// Set each profile's first 6 party Pokemon to levels 10–15 (randomised order)
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { readFileSync, createReadStream } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(resolve(__dirname, '../../.env.local'), 'utf-8')
const vars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

// Load pokemon base stats
const pokemonRaw = JSON.parse(readFileSync(resolve(__dirname, '../data/pokemon.json'), 'utf-8'))
const pokemonMap = Object.fromEntries(pokemonRaw.map(p => [p.id, p]))

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

function calculateMaxHp(baseHp, level) {
  return Math.floor(((2 * baseHp * level) / 100) + level + 10)
}
function expForLevel(level) { return Math.pow(level, 3) }

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function run() {
  await signInAnonymously(auth)
  const snap = await getDocs(collection(db, 'profiles'))

  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const party = data.party ?? []
    if (party.length === 0) continue

    const slotCount = Math.min(party.length, 6)
    const levels = shuffle([10, 11, 12, 13, 14, 15]).slice(0, slotCount)

    const updated = party.map((p, i) => {
      if (i >= slotCount) return p
      const lvl = levels[i]
      const info = pokemonMap[p.pokemonId]
      const baseHp = info?.baseStats?.hp ?? 45
      const maxHp = calculateMaxHp(baseHp, lvl)
      return { ...p, level: lvl, xp: expForLevel(lvl), maxHp, currentHp: maxHp }
    })

    await updateDoc(doc(db, 'profiles', docSnap.id), { party: updated })
    console.log(`\n${data.name ?? docSnap.id}:`)
    updated.slice(0, slotCount).forEach(p =>
      console.log(`  #${p.pokemonId}  Lv${p.level}  HP ${p.currentHp}/${p.maxHp}`)
    )
  }

  console.log('\nDone.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
