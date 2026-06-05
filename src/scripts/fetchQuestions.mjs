import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
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
  const subjects = ['english', 'maths', 'chinese']
  for (const subject of subjects) {
    const snap = await getDocs(collection(db, 'questionBank', subject, 'questions'))
    console.log(`\n${'='.repeat(60)}`)
    console.log(`  ${subject.toUpperCase()}  (${snap.docs.length} questions)`)
    console.log('='.repeat(60))
    snap.docs.forEach((d, i) => {
      const q = d.data()
      console.log(`\n[${i+1}] ID: ${d.id}`)
      console.log(`  Q: ${q.question}`)
      console.log(`  A: ${q.answer}`)
      console.log(`  Options: ${(q.options ?? []).join(' | ')}`)
    })
  }
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
