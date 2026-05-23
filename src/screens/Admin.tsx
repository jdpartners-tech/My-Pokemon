import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuestions } from '../hooks/useQuestions'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import { Question, Profile } from '../types/game'

const ADMIN_PASSWORD = 'parent123'
type Tab = 'profiles' | 'questions' | 'progress'
type SubjectKey = 'english' | 'maths' | 'chinese'

export default function Admin() {
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [tab, setTab] = useState<Tab>('questions')
  const [subject, setSubject] = useState<SubjectKey>('maths')
  const [questions, setQuestions] = useState<Question[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [editing, setEditing] = useState<Partial<Question> | null>(null)
  const { getQuestionsForSubject, addQuestion, updateQuestion, deleteQuestion } = useQuestions()
  const { getAllProfiles, deleteProfile } = useFirestoreProfile()

  useEffect(() => {
    if (!unlocked) return
    getQuestionsForSubject(subject).then(setQuestions)
    getAllProfiles().then(setProfiles)
  }, [unlocked, subject])

  async function saveQ() {
    if (!editing?.question || !editing?.answer || editing.options?.length !== 4) return
    const q = editing as Question
    if (q.id) await updateQuestion(q.id, q)
    else await addQuestion({ ...q, subject })
    setEditing(null)
    getQuestionsForSubject(subject).then(setQuestions)
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center gap-4 p-6">
        <button onClick={() => navigate('/')} className="self-start text-yellow-400 font-bold text-lg">←</button>
        <h1 className="text-red-400 font-bold text-2xl">Parent Settings</h1>
        <input type="password" placeholder="Enter parent password" value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (password === ADMIN_PASSWORD ? (setUnlocked(true), setPwError('')) : setPwError('Wrong password'))}
          className="bg-[#16213e] border border-[#4ecdc4]/40 rounded-xl px-4 py-3 text-white w-full max-w-xs"
        />
        {pwError && <p className="text-red-400 text-sm">{pwError}</p>}
        <button
          onClick={() => password === ADMIN_PASSWORD ? (setUnlocked(true), setPwError('')) : setPwError('Wrong password')}
          className="bg-yellow-400 text-[#1a1a2e] font-bold px-6 py-3 rounded-xl w-full max-w-xs"
        >
          Unlock
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col">
      <div className="bg-[#0f3460] px-4 py-3 flex items-center gap-3 border-b border-red-400/20 flex-shrink-0">
        <button onClick={() => navigate('/')} className="text-yellow-400 font-bold text-xl">←</button>
        <h1 className="text-red-400 font-bold text-lg flex-1">Parent Admin Panel</h1>
      </div>

      <div className="flex border-b border-gray-700 flex-shrink-0">
        {(['profiles', 'questions', 'progress'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-bold capitalize transition-all
              ${tab === t ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">

        {tab === 'questions' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              {(['english', 'maths', 'chinese'] as SubjectKey[]).map(s => (
                <button key={s} onClick={() => setSubject(s)}
                  className={`px-3 py-1 rounded-full text-sm font-bold capitalize transition-all
                    ${subject === s ? 'bg-yellow-400 text-[#1a1a2e]' : 'bg-[#16213e] text-gray-400 border border-gray-700'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {editing ? (
              <div className="bg-[#16213e] border border-[#4ecdc4]/20 rounded-xl p-4 flex flex-col gap-3">
                <h3 className="text-yellow-400 font-bold">{editing.id ? 'Edit' : 'New'} Question</h3>
                <input placeholder="Question text" value={editing.question ?? ''}
                  onChange={e => setEditing(q => ({ ...q!, question: e.target.value }))}
                  className="bg-[#0f3460] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                {[0,1,2,3].map(i => (
                  <input key={i} placeholder={`Option ${['A','B','C','D'][i]}`}
                    value={editing.options?.[i] ?? ''}
                    onChange={e => {
                      const o = [...(editing.options ?? ['','','',''])] as [string,string,string,string]
                      o[i] = e.target.value
                      setEditing(q => ({ ...q!, options: o }))
                    }}
                    className="bg-[#0f3460] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                ))}
                <input placeholder="Correct answer (must exactly match one option)"
                  value={editing.answer ?? ''}
                  onChange={e => setEditing(q => ({ ...q!, answer: e.target.value }))}
                  className="bg-[#0f3460] border border-yellow-400/40 rounded-lg px-3 py-2 text-yellow-300 text-sm" />
                <select value={editing.difficulty ?? 'beginner'}
                  onChange={e => setEditing(q => ({ ...q!, difficulty: e.target.value as 'beginner' | 'advanced' }))}
                  className="bg-[#0f3460] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                  <option value="beginner">Beginner</option>
                  <option value="advanced">Advanced</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={saveQ} className="flex-1 bg-yellow-400 text-[#1a1a2e] font-bold py-2 rounded-lg">Save</button>
                  <button onClick={() => setEditing(null)} className="flex-1 bg-gray-700 text-white py-2 rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditing({ subject, difficulty: 'beginner', options: ['','','',''] as [string,string,string,string] })}
                className="bg-[#0f3460] border border-yellow-400/40 text-yellow-400 rounded-xl p-3 text-sm font-bold">
                + Add Question
              </button>
            )}

            {questions.map(q => (
              <div key={q.id} className="bg-[#16213e] border border-gray-700 rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white text-sm flex-1">{q.question}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0
                    ${q.difficulty === 'advanced' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                    {q.difficulty}
                  </span>
                </div>
                <p className="text-green-400 text-xs">✓ {q.answer}</p>
                <div className="flex gap-3 mt-1">
                  <button onClick={() => setEditing(q)} className="text-[#4ecdc4] text-xs underline">Edit</button>
                  <button
                    onClick={async () => {
                      await deleteQuestion(q.id!, subject)
                      getQuestionsForSubject(subject).then(setQuestions)
                    }}
                    className="text-red-400 text-xs underline"
                  >Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'profiles' && (
          <div className="flex flex-col gap-3">
            {profiles.map(p => (
              <div key={p.id} className="bg-[#16213e] border border-gray-700 rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-white font-bold text-lg">{p.name}</p>
                  <p className="text-gray-400 text-sm">Age {p.age} · {p.difficulty}</p>
                  <p className="text-gray-500 text-xs">
                    Battles: {p.stats?.battlesWon ?? 0} ·
                    Accuracy: {Math.round(((p.stats?.questionsCorrect ?? 0) / Math.max(1, p.stats?.questionsAnswered ?? 1)) * 100)}%
                  </p>
                </div>
                <button
                  onClick={async () => { await deleteProfile(p.id!); getAllProfiles().then(setProfiles) }}
                  className="text-red-400 text-xs border border-red-400/30 rounded-lg px-3 py-1"
                >
                  Delete
                </button>
              </div>
            ))}
            <button onClick={() => navigate('/add-profile')}
              className="bg-[#0f3460] border border-yellow-400/40 text-yellow-400 rounded-xl p-3 text-sm font-bold">
              + Add New Trainer
            </button>
          </div>
        )}

        {tab === 'progress' && (
          <div className="flex flex-col gap-4">
            {profiles.map(p => (
              <div key={p.id} className="bg-[#16213e] border border-[#4ecdc4]/20 rounded-xl p-4">
                <p className="text-white font-bold text-xl mb-3">{p.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    ['Battles Won', p.stats?.battlesWon ?? 0, 'text-yellow-400'],
                    ['Pokémon Caught', Object.values(p.pokedex ?? {}).filter(v => v === 'caught').length, 'text-[#4ecdc4]'],
                    ['Accuracy', `${Math.round(((p.stats?.questionsCorrect ?? 0) / Math.max(1, p.stats?.questionsAnswered ?? 1)) * 100)}%`, 'text-green-400'],
                    ['Gym Badges', p.badges?.length ?? 0, 'text-purple-400'],
                  ] as [string, string | number, string][]).map(([label, val, color]) => (
                    <div key={label} className="bg-[#0f3460] rounded-xl p-3 text-center">
                      <p className={`text-3xl font-bold ${color}`}>{val}</p>
                      <p className="text-gray-400 text-xs mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
