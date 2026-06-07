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

function expForLevel(level) {
  if (level <= 1)  return 0
  if (level <= 11) return (level - 1) * 120
  if (level <= 21) return 1200 + (level - 11) * 300
  if (level <= 31) return 4200 + (level - 21) * 500
  if (level <= 41) return 9200 + (level - 31) * 800
  return 17200 + (level - 41) * 1100
}

function getLevel(xp) {
  let level = 1
  while (expForLevel(level + 1) <= xp && level < 100) level++
  return level
}

function calcMaxHp(baseHp, level) {
  return Math.floor((2 * baseHp * level) / 100 + level + 10)
}

// Checks and fixes a party pokemon: xp must correspond to stored level, maxHp must be correct
function fixPartyMon(p, label) {
  const info = pokeMap[p.pokemonId]
  let changed = false
  let fixed = { ...p }

  // Fix XP: if getLevel(xp) != stored level, reset XP to expForLevel(level)
  const xpLevel = getLevel(p.xp ?? 0)
  if (xpLevel !== p.level) {
    const correctXp = expForLevel(p.level)
    console.log(`  ${label} #${p.pokemonId} Lv${p.level}: xp ${p.xp} maps to Lv${xpLevel} → reset to ${correctXp}`)
    fixed.xp = correctXp
    changed = true
  }

  // Fix maxHp: must match formula
  if (info) {
    const correctMaxHp = calcMaxHp(info.baseStats.hp, p.level)
    if (p.maxHp !== correctMaxHp) {
      console.log(`  ${label} #${p.pokemonId} Lv${p.level}: maxHp ${p.maxHp} → ${correctMaxHp}`)
      fixed.maxHp = correctMaxHp
      fixed.currentHp = Math.min(p.currentHp ?? correctMaxHp, correctMaxHp)
      changed = true
    }
  }

  return { fixed, changed }
}

// Box pokemon only have pokemonId/level/xp, no maxHp
function fixBoxMon(p, label) {
  const xpLevel = getLevel(p.xp ?? 0)
  if (xpLevel !== p.level) {
    const correctXp = expForLevel(p.level)
    console.log(`  ${label} #${p.pokemonId} Lv${p.level}: xp ${p.xp} maps to Lv${xpLevel} → reset to ${correctXp}`)
    return { fixed: { ...p, xp: correctXp }, changed: true }
  }
  return { fixed: p, changed: false }
}

async function fixProfile(profileId, name) {
  const ref = doc(db, 'profiles', profileId)
  const snap = await getDoc(ref)
  if (!snap.exists()) { console.log(`${name}: profile not found`); return }

  const data = snap.data()
  const party = data.party ?? []
  const box = data.box ?? []
  let anyChanged = false

  const newParty = party.map((p, i) => {
    const { fixed, changed } = fixPartyMon(p, `${name} party[${i}]`)
    if (changed) anyChanged = true
    return fixed
  })

  const newBox = box.map((p, i) => {
    const { fixed, changed } = fixBoxMon(p, `${name} box[${i}]`)
    if (changed) anyChanged = true
    return fixed
  })

  if (anyChanged) {
    await updateDoc(ref, { party: newParty, box: newBox })
    console.log(`  ${name}: saved`)
  } else {
    console.log(`  ${name}: all XP and maxHp values are correct`)
  }
}

async function run() {
  await signInAnonymously(auth)
  console.log('Fixing XP and maxHp inconsistencies across all profiles...\n')
  await fixProfile('ShJnbciQEEqE403UcUa8', 'Kayden')
  await fixProfile('NifmP11ADr0GWuDekd1i', 'Kaylie')
  await fixProfile('UAy8QDJtBRyfEL43b9sx', 'Derek')
  console.log('\nDone.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
