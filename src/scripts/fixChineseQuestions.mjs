import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(resolve(__dirname, '../../.env.local'), 'utf-8')
const vars = Object.fromEntries(env.split('\n').filter(l => l.includes('=')).map(l => l.split('=')))

const app = initializeApp({
  apiKey:            vars.VITE_FIREBASE_API_KEY?.trim(),
  authDomain:        vars.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId:         vars.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket:     vars.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: vars.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId:             vars.VITE_FIREBASE_APP_ID?.trim(),
})
const db = getFirestore(app)
const auth = getAuth(app)

// Tautological questions and their corrected versions
const fixes = [
  {
    oldQuestion: '哪個字的意思是「大」？',
    newQuestion: '「大」字是什麼意思？',
    newOptions: ['尺寸很大','尺寸很小','不大不小','高山'],
    newAnswer: '尺寸很大',
  },
  {
    oldQuestion: '「水」代表什麼？',
    newQuestion: '「水」代表什麼意思？',
    newOptions: ['液體，如河流','火焰','泥土','樹木'],
    newAnswer: '液體，如河流',
  },
  {
    oldQuestion: '「火」代表什麼？',
    newQuestion: '「火」代表什麼意思？',
    newOptions: ['火焰，會發光發熱','液體，如河流','泥土','樹木'],
    newAnswer: '火焰，會發光發熱',
  },
  {
    oldQuestion: '「手」代表什麼身體部位？',
    newQuestion: '「手」是指哪個身體部位？',
    newOptions: ['手掌和手指','腳和腳趾','頭部','耳朵'],
    newAnswer: '手掌和手指',
  },
  {
    oldQuestion: '「魚」代表什麼動物？',
    newQuestion: '「魚」是什麼樣的動物？',
    newOptions: ['在水中游泳的動物','在天空飛翔的動物','人類的寵物狗','人類的寵物貓'],
    newAnswer: '在水中游泳的動物',
  },
  {
    oldQuestion: '「鳥」代表什麼動物？',
    newQuestion: '「鳥」是什麼樣的動物？',
    newOptions: ['在天空飛翔的動物','在水中游泳的動物','人類的寵物狗','人類的寵物貓'],
    newAnswer: '在天空飛翔的動物',
  },
]

async function fix() {
  await signInAnonymously(auth)
  const colRef = collection(db, 'questionBank', 'chinese', 'questions')
  const snapshot = await getDocs(colRef)
  let fixed = 0

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const match = fixes.find(f => f.oldQuestion === data.question)
    if (match) {
      await updateDoc(doc(db, 'questionBank', 'chinese', 'questions', docSnap.id), {
        question: match.newQuestion,
        options: match.newOptions,
        answer: match.newAnswer,
      })
      console.log(`  ✓ Fixed: "${match.oldQuestion}" → "${match.newQuestion}"`)
      fixed++
    }
  }

  console.log(`\nDone. Fixed ${fixed} of ${fixes.length} target questions.`)
  if (fixed < fixes.length) {
    const notFound = fixes.filter(f => !snapshot.docs.some(d => d.data().question === f.oldQuestion))
    notFound.forEach(f => console.log(`  ✗ Not found in Firestore: "${f.oldQuestion}"`))
  }
  process.exit(0)
}

fix().catch(err => { console.error(err); process.exit(1) })
