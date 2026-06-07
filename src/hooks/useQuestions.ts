import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Question, Profile, SubjectType } from '../types/game'
import { filterQuestionsForProfile } from '../utils/questionPicker'

// Module-level cache — persists across battle mounts/unmounts for the whole session.
// Keyed by profileId so switching profiles clears stale data.
const _rawCache: Map<SubjectType, Question[]> = new Map()
let _filteredCache: Question[] | null = null
let _filteredCacheProfileId: string | null = null
// In-flight promise: prevents duplicate fetches if called concurrently
let _fetchPromise: Promise<Question[]> | null = null
let _fetchProfileId: string | null = null

export function invalidateQuestionCache() {
  _rawCache.clear()
  _filteredCache = null
  _filteredCacheProfileId = null
  _fetchPromise = null
  _fetchProfileId = null
}

export function useQuestions() {
  async function getQuestionsForSubject(subject: SubjectType): Promise<Question[]> {
    if (_rawCache.has(subject)) return _rawCache.get(subject)!
    const snap = await getDocs(collection(db, 'questionBank', subject, 'questions'))
    const qs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
    _rawCache.set(subject, qs)
    return qs
  }

  async function getQuestionsForProfile(profile: Profile): Promise<Question[]> {
    const profileId = profile.id ?? null

    // Return filtered cache if profile hasn't changed
    if (_filteredCache && _filteredCacheProfileId === profileId) return _filteredCache

    // Deduplicate concurrent fetches for the same profile
    if (_fetchPromise && _fetchProfileId === profileId) return _fetchPromise

    _fetchProfileId = profileId
    _fetchPromise = (async () => {
      const subjects: SubjectType[] = ['english', 'maths', 'chinese']
      const enabled = subjects.filter(s => profile.subjects[s]?.enabled)
      const results = await Promise.all(enabled.map(s => getQuestionsForSubject(s)))
      const allQuestions: Question[] = results.flat()
      const filtered = filterQuestionsForProfile(allQuestions, profile)
      _filteredCache = filtered
      _filteredCacheProfileId = profileId
      _fetchPromise = null
      return filtered
    })()

    return _fetchPromise
  }

  // Call this from WorldMap on mount to warm the cache before any battle starts
  async function prefetchQuestionsForProfile(profile: Profile): Promise<void> {
    await getQuestionsForProfile(profile).catch(() => {})
  }

  async function addQuestion(question: Omit<Question, 'id'>): Promise<string> {
    const ref = await addDoc(
      collection(db, 'questionBank', question.subject, 'questions'),
      question
    )
    return ref.id
  }

  async function updateQuestion(id: string, updates: Partial<Question>): Promise<void> {
    const subject = updates.subject
    if (!subject) throw new Error('Subject required to update question')
    await updateDoc(
      doc(db, 'questionBank', subject, 'questions', id),
      updates as any // eslint-disable-line @typescript-eslint/no-explicit-any
    )
  }

  async function deleteQuestion(id: string, subject: SubjectType): Promise<void> {
    await deleteDoc(doc(db, 'questionBank', subject, 'questions', id))
  }

  return {
    getQuestionsForSubject,
    getQuestionsForProfile,
    prefetchQuestionsForProfile,
    addQuestion,
    updateQuestion,
    deleteQuestion,
  }
}
