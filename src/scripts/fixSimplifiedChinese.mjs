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
  apiKey:            vars.VITE_FIREBASE_API_KEY?.trim(),
  authDomain:        vars.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId:         vars.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket:     vars.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: vars.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId:             vars.VITE_FIREBASE_APP_ID?.trim(),
})
const db = getFirestore(app)
const auth = getAuth(app)

// Simplified → Traditional replacements (ordered longest-match first where needed)
const REPLACEMENTS = [
  ['这', '這'], ['时', '時'], ['说', '說'], ['来', '來'], ['们', '們'],
  ['书', '書'], ['动', '動'], ['会', '會'], ['学', '學'], ['现', '現'],
  ['还', '還'], ['话', '話'], ['国', '國'], ['开', '開'], ['过', '過'],
  ['长', '長'], ['见', '見'], ['问', '問'], ['让', '讓'], ['为', '為'],
  ['对', '對'], ['从', '從'], ['关', '關'], ['边', '邊'], ['实', '實'],
  ['发', '發'], ['给', '給'], ['经', '經'], ['进', '進'], ['几', '幾'],
  ['门', '門'], ['没', '沒'], ['气', '氣'], ['强', '強'], ['体', '體'],
  ['万', '萬'], ['义', '義'], ['与', '與'], ['员', '員'], ['远', '遠'],
  ['运', '運'], ['张', '張'], ['只', '只'],  // 只 same in both, skip
]

// Filter to pairs that are actually different
const PAIRS = REPLACEMENTS.filter(([s, t]) => s !== t)

function convertToTraditional(text) {
  let result = text
  for (const [simp, trad] of PAIRS) {
    result = result.split(simp).join(trad)
  }
  return result
}

function hasSimplified(text) {
  return PAIRS.some(([simp]) => text.includes(simp))
}

async function fix() {
  await signInAnonymously(auth)
  const colRef = collection(db, 'questionBank', 'chinese', 'questions')
  const snapshot = await getDocs(colRef)

  let checked = 0, fixed = 0

  for (const docSnap of snapshot.docs) {
    checked++
    const data = docSnap.data()
    const fields = ['question', 'answer', ...((data.options ?? []))]
    const allText = [data.question, data.answer, ...(data.options ?? [])].join(' ')

    if (!hasSimplified(allText)) continue

    const newQuestion = convertToTraditional(data.question)
    const newAnswer = convertToTraditional(data.answer)
    const newOptions = (data.options ?? []).map(o => convertToTraditional(o))

    console.log(`  Fixing: "${data.question.slice(0, 50)}"`)

    await updateDoc(doc(db, 'questionBank', 'chinese', 'questions', docSnap.id), {
      question: newQuestion,
      answer: newAnswer,
      options: newOptions,
    })
    fixed++
  }

  console.log(`\nChecked ${checked} questions. Fixed ${fixed} with simplified characters.`)
  process.exit(0)
}

fix().catch(err => { console.error(err); process.exit(1) })
