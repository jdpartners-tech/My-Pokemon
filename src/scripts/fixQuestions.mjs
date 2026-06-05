import { initializeApp } from 'firebase/app'
import { getFirestore, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
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

async function run() {
  await signInAnonymously(auth)

  // 1. Fix Q481: 三心二意 → 三心兩意 (question text)
  {
    const ref = doc(db, 'questionBank', 'chinese', 'questions', 'oPq8JsCRNKiZwu90lvON')
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await updateDoc(ref, {
        question: '「三心兩意」是什麼意思？',
      })
      console.log('✓ Fixed Q481: 三心二意 → 三心兩意 (question)')
    } else {
      console.log('✗ Q481 not found')
    }
  }

  // 2. Fix Q390: distractor option 三心二意 → 三心兩意
  {
    const ref = doc(db, 'questionBank', 'chinese', 'questions', 'fjgUWVF1zX50lh38dwiB')
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const data = snap.data()
      const options = data.options.map(o => o === '三心二意' ? '三心兩意' : o)
      await updateDoc(ref, { options })
      console.log('✓ Fixed Q390: distractor 三心二意 → 三心兩意')
    } else {
      console.log('✗ Q390 not found')
    }
  }

  // 3. Fix Q558: 祖母 answer — 奶奶或外婆 → 奶奶 (祖母 = paternal grandmother only)
  {
    const ref = doc(db, 'questionBank', 'chinese', 'questions', 'vGJsck7PMQVwFETLh2eI')
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const data = snap.data()
      const options = data.options.map(o => o === '奶奶或外婆' ? '奶奶' : o)
      await updateDoc(ref, { answer: '奶奶', options })
      console.log('✓ Fixed Q558: 祖母 answer → 奶奶')
    } else {
      console.log('✗ Q558 not found')
    }
  }

  // 4. Delete duplicate "What is frozen rain called?" (ID: TLKTSuoYLCBJEwGl99c1)
  {
    const ref = doc(db, 'questionBank', 'english', 'questions', 'TLKTSuoYLCBJEwGl99c1')
    const snap = await getDoc(ref)
    if (snap.exists()) {
      await deleteDoc(ref)
      console.log('✓ Deleted duplicate "frozen rain" question')
    } else {
      console.log('✗ Duplicate frozen rain question not found')
    }
  }

  console.log('\nAll fixes applied.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
