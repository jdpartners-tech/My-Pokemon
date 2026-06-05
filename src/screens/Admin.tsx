import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuestions } from '../hooks/useQuestions'
import { useFirestoreProfile } from '../hooks/useFirestoreProfile'
import { Question, Profile, SubjectSettings, EnglishQuestionType, MathsQuestionType, ChineseQuestionType } from '../types/game'

const ADMIN_PASSWORD = 'parent123'
type Tab = 'profiles' | 'questions'
type SubjectKey = 'english' | 'maths' | 'chinese'
type WrongFilter = 'all' | 'english' | 'maths' | 'chinese'

const ENGLISH_TYPES: { id: EnglishQuestionType; label: string }[] = [
  { id: 'vocabulary',    label: 'Vocabulary' },
  { id: 'grammar',       label: 'Grammar' },
  { id: 'spelling',      label: 'Spelling' },
  { id: 'synonyms',      label: 'Synonyms' },
  { id: 'fillBlank',     label: 'Fill in the Blank' },
  { id: 'comprehension', label: 'Comprehension' },
  { id: 'wordPicture',   label: 'Word Picture' },
]
const MATHS_TYPES: { id: MathsQuestionType; label: string }[] = [
  { id: 'arithmetic',    label: 'Arithmetic' },
  { id: 'wordProblems',  label: 'Word Problems' },
  { id: 'sequences',     label: 'Sequences' },
  { id: 'shapes',        label: 'Shapes' },
  { id: 'time',          label: 'Time' },
  { id: 'money',         label: 'Money' },
  { id: 'logic',         label: 'Logic' },
]
const CHINESE_TYPES: { id: ChineseQuestionType; label: string }[] = [
  { id: 'characterRecognition', label: 'Character Recognition' },
  { id: 'vocabulary',           label: 'Vocabulary' },
  { id: 'strokeOrder',          label: 'Stroke Order' },
  { id: 'radicals',             label: 'Radicals' },
  { id: 'pinyin',               label: 'Pinyin' },
  { id: 'grammar',              label: 'Grammar' },
  { id: 'idioms',               label: 'Idioms' },
  { id: 'fillBlank',            label: 'Fill in the Blank' },
]
const ALL_TYPES: Record<SubjectKey, string[]> = {
  english: ENGLISH_TYPES.map(t => t.id),
  maths:   MATHS_TYPES.map(t => t.id),
  chinese: CHINESE_TYPES.map(t => t.id),
}

const SUBJECT_LABEL: Record<SubjectKey, string> = {
  english: 'English', maths: 'Maths', chinese: 'Chinese',
}

export default function Admin() {
  const navigate = useNavigate()
  const [unlocked, setUnlocked] = useState(false)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [tab, setTab] = useState<Tab>('profiles')
  const [subject, setSubject] = useState<SubjectKey>('maths')
  const [questions, setQuestions] = useState<Question[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [editing, setEditing] = useState<Partial<Question> | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [wrongFilter, setWrongFilter] = useState<WrongFilter>('all')
  const [subjectEditId, setSubjectEditId] = useState<string | null>(null)
  const [subjectDraft, setSubjectDraft] = useState<SubjectSettings | null>(null)
  const [subjectSaving, setSubjectSaving] = useState(false)

  const { getQuestionsForSubject, addQuestion, updateQuestion, deleteQuestion } = useQuestions()
  const { getAllProfiles, deleteProfile, updateProfile } = useFirestoreProfile()

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

  function openSubjectEdit(p: Profile) {
    const s = p.subjects ?? {
      english: { enabled: true, types: [] },
      maths:   { enabled: true, types: [] },
      chinese: { enabled: true, types: [] },
    }
    setSubjectDraft(JSON.parse(JSON.stringify(s)))
    setSubjectEditId(p.id!)
    setExpandedId(null)
  }

  function toggleSubjectEnabled(key: SubjectKey) {
    if (!subjectDraft) return
    setSubjectDraft({
      ...subjectDraft,
      [key]: { ...subjectDraft[key], enabled: !subjectDraft[key].enabled },
    })
  }

  function toggleType(key: SubjectKey, typeId: string) {
    if (!subjectDraft) return
    const current: string[] = subjectDraft[key].types as string[]
    const allTypes = ALL_TYPES[key]
    // treat empty as all enabled
    const effective = current.length === 0 ? allTypes : current
    const next = effective.includes(typeId)
      ? effective.filter(t => t !== typeId)
      : [...effective, typeId]
    // if all selected, store [] to mean "all"
    const stored = next.length === allTypes.length ? [] : next
    setSubjectDraft({
      ...subjectDraft,
      [key]: { ...subjectDraft[key], types: stored },
    })
  }

  function isTypeChecked(key: SubjectKey, typeId: string): boolean {
    if (!subjectDraft) return false
    const current: string[] = subjectDraft[key].types as string[]
    return current.length === 0 || current.includes(typeId)
  }

  async function saveSubjects() {
    if (!subjectDraft || !subjectEditId) return
    setSubjectSaving(true)
    await updateProfile(subjectEditId, { subjects: subjectDraft })
    await getAllProfiles().then(setProfiles)
    setSubjectSaving(false)
    setSubjectEditId(null)
    setSubjectDraft(null)
  }

  if (!unlocked) {
    return (
      <div className="fixed inset-0 bg-[#1a1a2e] overflow-y-auto flex flex-col items-center justify-center gap-4 p-6">
        <button onClick={() => navigate('/')} className="self-start text-yellow-400 font-bold text-lg">Back</button>
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

  const subjectColor: Record<string, string> = {
    english: '#4ecdc4', maths: '#ffd700', chinese: '#ff6b9d',
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a2e] overflow-y-auto flex flex-col">
      <div className="bg-[#0f3460] px-4 py-3 flex items-center gap-3 border-b border-red-400/20 flex-shrink-0">
        <button onClick={() => navigate('/')} className="text-yellow-400 font-bold text-xl">Back</button>
        <h1 className="text-red-400 font-bold text-lg flex-1">Parent Admin Panel</h1>
      </div>

      <div className="flex border-b border-gray-700 flex-shrink-0">
        {(['profiles', 'questions'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-bold capitalize transition-all
              ${tab === t ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t === 'profiles' ? 'Profiles' : 'Questions'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">

        {tab === 'profiles' && (
          <div className="flex flex-col gap-4">
            {profiles.map(p => {
              const correct = p.stats?.questionsCorrect ?? 0
              // questionsWrong is the tracked counter; fall back to wrongAnswers.length for historical profiles
              const wrongCount = p.stats?.questionsWrong ?? (p.wrongAnswers?.length ?? 0)
              const total = correct + wrongCount
              const accuracy = total === 0 ? null : Math.round((correct / total) * 100)
              const caught = Object.values(p.pokedex ?? {}).filter(v => v === 'caught').length
              const wrong = p.wrongAnswers ?? []
              const isExpanded = expandedId === p.id
              const isEditingSubjects = subjectEditId === p.id
              const filtered = wrongFilter === 'all' ? wrong : wrong.filter(w => w.subject === wrongFilter)

              return (
                <div key={p.id} className="bg-[#16213e] border border-gray-700 rounded-xl overflow-hidden">
                  {/* Profile header */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                    <div className="flex-1">
                      <p className="text-white font-bold text-lg">{p.name}</p>
                      <p className="text-gray-400 text-sm">Age {p.age} {'·'} {p.difficulty}</p>
                    </div>
                    <button
                      onClick={async () => { await deleteProfile(p.id!); getAllProfiles().then(setProfiles) }}
                      className="text-red-400 text-xs border border-red-400/30 rounded-lg px-3 py-1 flex-shrink-0"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 px-4 pb-3">
                    <div className="bg-[#0f3460] rounded-xl p-3 text-center">
                      <p className="text-yellow-400 text-2xl font-bold">{p.stats?.battlesWon ?? 0}</p>
                      <p className="text-gray-400 text-xs mt-1">Battles Won</p>
                    </div>
                    <div className="bg-[#0f3460] rounded-xl p-3 text-center">
                      <p className="text-[#4ecdc4] text-2xl font-bold">{caught}</p>
                      <p className="text-gray-400 text-xs mt-1">Pokémon Caught</p>
                    </div>
                    <button
                      onClick={() => {
                        setSubjectEditId(null)
                        setSubjectDraft(null)
                        if (isExpanded) { setExpandedId(null) } else { setExpandedId(p.id!); setWrongFilter('all') }
                      }}
                      className="bg-[#0f3460] rounded-xl p-3 text-center active:opacity-70"
                    >
                      <p className="text-green-400 text-2xl font-bold">
                        {accuracy === null ? '—' : `${accuracy}%`}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {accuracy === null ? 'No data yet' : `${correct} correct / ${total} answered`}
                      </p>
                      <p className="text-gray-600 text-xs mt-1">tap to review</p>
                    </button>
                  </div>

                  {/* Subject settings button */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => {
                        if (isEditingSubjects) {
                          setSubjectEditId(null); setSubjectDraft(null)
                        } else {
                          setExpandedId(null)
                          openSubjectEdit(p)
                        }
                      }}
                      className={`w-full py-2 rounded-xl text-sm font-bold border transition-all
                        ${isEditingSubjects
                          ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-400'
                          : 'bg-[#0f3460] border-[#4ecdc4]/20 text-[#4ecdc4]'}`}
                    >
                      {isEditingSubjects ? 'Cancel Subject Edit' : '⚙ Edit Subjects & Question Types'}
                    </button>
                  </div>

                  {/* Subject settings editor */}
                  {isEditingSubjects && subjectDraft && (
                    <div className="border-t border-gray-700 px-4 pb-4 pt-3">
                      <p className="text-white font-bold text-sm mb-3">Subject Settings</p>
                      {(['english', 'maths', 'chinese'] as SubjectKey[]).map(key => {
                        const enabled = subjectDraft[key].enabled
                        const types = key === 'english' ? ENGLISH_TYPES : key === 'maths' ? MATHS_TYPES : CHINESE_TYPES
                        return (
                          <div key={key} className="mb-4">
                            {/* Subject toggle row */}
                            <button
                              onClick={() => toggleSubjectEnabled(key)}
                              className="flex items-center gap-3 w-full mb-2"
                            >
                              <div className={`w-10 h-6 rounded-full relative transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-600'}`}>
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enabled ? 'left-5' : 'left-1'}`} />
                              </div>
                              <span className={`font-bold text-sm ${enabled ? 'text-white' : 'text-gray-500'}`}>
                                {SUBJECT_LABEL[key]}
                              </span>
                            </button>

                            {/* Question types (only when subject is on) */}
                            {enabled && (
                              <div className="flex flex-wrap gap-2 pl-2">
                                {types.map(t => {
                                  const checked = isTypeChecked(key, t.id)
                                  return (
                                    <button
                                      key={t.id}
                                      onClick={() => toggleType(key, t.id)}
                                      className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all
                                        ${checked
                                          ? 'border-transparent text-[#1a1a2e]'
                                          : 'bg-transparent text-gray-500 border-gray-700'}`}
                                      style={checked ? { background: subjectColor[key] } : {}}
                                    >
                                      {t.label}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      <button
                        onClick={saveSubjects}
                        disabled={subjectSaving}
                        className="w-full bg-yellow-400 text-[#1a1a2e] font-bold py-2 rounded-xl mt-1 disabled:opacity-50"
                      >
                        {subjectSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}

                  {/* Wrong answers panel */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 px-4 pb-4 pt-3">
                      <p className="text-red-400 font-bold text-sm mb-3">
                        Questions Answered Incorrectly{wrong.length > 0 ? ` (${wrong.length})` : ''}
                      </p>

                      <div className="flex gap-2 mb-3 flex-wrap">
                        {(['all', 'english', 'maths', 'chinese'] as WrongFilter[]).map(f => {
                          const count = f === 'all' ? wrong.length : wrong.filter(w => w.subject === f).length
                          const label = f === 'all' ? 'All' : f === 'english' ? 'English' : f === 'maths' ? 'Maths' : 'Chinese'
                          return (
                            <button key={f} onClick={() => setWrongFilter(f)}
                              className={`px-3 py-1 rounded-full text-xs font-bold transition-all
                                ${wrongFilter === f ? 'bg-yellow-400 text-[#1a1a2e]' : 'bg-[#0f3460] text-gray-400 border border-gray-700'}`}
                            >
                              {label}{count > 0 ? ` (${count})` : ''}
                            </button>
                          )
                        })}
                      </div>

                      {filtered.length === 0 && (
                        <p className="text-gray-600 text-xs text-center py-4">
                          {wrong.length === 0 ? 'No wrong answers recorded yet.' : 'No wrong answers for this subject.'}
                        </p>
                      )}

                      <div className="flex flex-col gap-2">
                        {[...filtered].reverse().map((w, i) => (
                          <div key={i} className="bg-[#0a1628] rounded-lg p-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full mb-2 inline-block"
                              style={{ background: `${subjectColor[w.subject] ?? '#888'}22`, color: subjectColor[w.subject] ?? '#888' }}>
                              {w.subject === 'english' ? 'English' : w.subject === 'maths' ? 'Maths' : 'Chinese'}
                            </span>
                            <p className="text-white text-sm mb-2">{w.question}</p>
                            <p className="text-red-400 text-xs">
                              {'✗'} {w.givenAnswer || <span className="text-gray-600 italic">answer not recorded</span>}
                            </p>
                            <p className="text-green-400 text-xs mt-1">{'✓'} {w.correctAnswer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            <button onClick={() => navigate('/add-profile')}
              className="bg-[#0f3460] border border-yellow-400/40 text-yellow-400 rounded-xl p-3 text-sm font-bold">
              + Add New Trainer
            </button>
          </div>
        )}

        {tab === 'questions' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              {(['english', 'maths', 'chinese'] as SubjectKey[]).map(s => (
                <button key={s} onClick={() => setSubject(s)}
                  className={`px-3 py-1 rounded-full text-sm font-bold capitalize transition-all
                    ${subject === s ? 'bg-yellow-400 text-[#1a1a2e]' : 'bg-[#16213e] text-gray-400 border border-gray-700'}`}
                >
                  {SUBJECT_LABEL[s]}
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
                <p className="text-green-400 text-xs">{'✓'} {q.answer}</p>
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

      </div>
    </div>
  )
}
