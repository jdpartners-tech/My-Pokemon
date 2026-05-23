import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'
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

const questions = [
  // English — Beginner
  { subject:'english', type:'word-picture',  difficulty:'beginner', question:'Which animal says "Meow"?', options:['Cat','Dog','Bird','Fish'], answer:'Cat' },
  { subject:'english', type:'vocabulary',    difficulty:'beginner', question:'What colour is the sun?', options:['Yellow','Blue','Red','Green'], answer:'Yellow' },
  { subject:'english', type:'fill-blank',    difficulty:'beginner', question:'I ___ happy today.', options:['am','is','are','be'], answer:'am' },
  { subject:'english', type:'vocabulary',    difficulty:'beginner', question:'Opposite of "big" is?', options:['Small','Tall','Fast','Dark'], answer:'Small' },
  // English — Advanced
  { subject:'english', type:'vocabulary',    difficulty:'advanced', question:'What does "fierce" mean?', options:['Very strong','Very kind','Very slow','Very small'], answer:'Very strong' },
  { subject:'english', type:'grammar',       difficulty:'advanced', question:'Which sentence is correct?', options:['She have two cats.','She has two cats.','She having two cats.','She had two cat.'], answer:'She has two cats.' },
  { subject:'english', type:'synonyms',      difficulty:'advanced', question:'A synonym for "happy" is?', options:['Joyful','Angry','Tired','Confused'], answer:'Joyful' },
  { subject:'english', type:'comprehension', difficulty:'advanced', question:'"The sun set behind the mountains." When does this happen?', options:['In the evening','In the morning','At noon','At midnight'], answer:'In the evening' },
  // Maths — Beginner
  { subject:'maths', type:'arithmetic', difficulty:'beginner', question:'3 + 4 = ?', options:['6','7','8','5'], answer:'7' },
  { subject:'maths', type:'arithmetic', difficulty:'beginner', question:'9 − 5 = ?', options:['3','4','5','6'], answer:'4' },
  { subject:'maths', type:'shapes',     difficulty:'beginner', question:'How many sides does a triangle have?', options:['3','4','5','2'], answer:'3' },
  { subject:'maths', type:'arithmetic', difficulty:'beginner', question:'2 + 2 + 2 = ?', options:['4','5','6','8'], answer:'6' },
  // Maths — Advanced
  { subject:'maths', type:'arithmetic',    difficulty:'advanced', question:'7 × 8 = ?', options:['54','56','48','63'], answer:'56' },
  { subject:'maths', type:'arithmetic',    difficulty:'advanced', question:'144 ÷ 12 = ?', options:['11','12','13','14'], answer:'12' },
  { subject:'maths', type:'word-problems', difficulty:'advanced', question:'Amy has 3 packs of 8 stickers. Total stickers?', options:['11','24','21','18'], answer:'24' },
  { subject:'maths', type:'sequences',     difficulty:'advanced', question:'What comes next: 2, 4, 8, 16, ?', options:['18','24','32','20'], answer:'32' },
  // Chinese — Beginner
  { subject:'chinese', type:'character', difficulty:'beginner', question:'Which character means "fire"?', options:['火','水','木','土'], answer:'火' },
  { subject:'chinese', type:'character', difficulty:'beginner', question:'Which character means "big"?', options:['小','大','中','山'], answer:'大' },
  { subject:'chinese', type:'pinyin',    difficulty:'beginner', question:'Pinyin for 猫 (cat)?', options:['māo','gǒu','niǎo','yú'], answer:'māo' },
  { subject:'chinese', type:'character', difficulty:'beginner', question:'Which character means "water"?', options:['火','山','水','人'], answer:'水' },
  // Chinese — Advanced
  { subject:'chinese', type:'idioms',     difficulty:'advanced', question:'半途而廢 means?', options:['Give up halfway','Work very hard','Never give up','Start over'], answer:'Give up halfway' },
  { subject:'chinese', type:'vocabulary', difficulty:'advanced', question:'勤奮 means?', options:['Diligent','Lazy','Clever','Brave'], answer:'Diligent' },
  { subject:'chinese', type:'grammar',    difficulty:'advanced', question:'她____去學校。Choose the correct verb:', options:['走路','跑步','游泳','飛翔'], answer:'走路' },
  { subject:'chinese', type:'radicals',   difficulty:'advanced', question:'The radical 氵means?', options:['Water','Fire','Wood','Earth'], answer:'Water' },
]

async function seed() {
  await signInAnonymously(auth)
  console.log(`Seeding ${questions.length} questions to Firebase...`)
  for (const q of questions) {
    await addDoc(collection(db, 'questionBank', q.subject, 'questions'), q)
    console.log(`  ✓ [${q.subject}/${q.difficulty}] ${q.question.slice(0, 50)}`)
  }
  console.log('\nDone! All questions seeded.')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
