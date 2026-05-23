import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Question, Profile, SubjectType } from '../types/game'
import { filterQuestionsForProfile } from '../utils/questionPicker'

export function useQuestions() {
  async function getQuestionsForSubject(subject: SubjectType): Promise<Question[]> {
    const snap = await getDocs(collection(db, 'questionBank', subject, 'questions'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Question))
  }

  async function getQuestionsForProfile(profile: Profile): Promise<Question[]> {
    const subjects: SubjectType[] = ['english', 'maths', 'chinese']
    const allQuestions: Question[] = []
    for (const subject of subjects) {
      if (profile.subjects[subject]?.enabled) {
        const questions = await getQuestionsForSubject(subject)
        allQuestions.push(...questions)
      }
    }
    return filterQuestionsForProfile(allQuestions, profile)
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
    addQuestion,
    updateQuestion,
    deleteQuestion,
  }
}
