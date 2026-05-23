import { pickQuestion, filterQuestionsForProfile, shuffleOptions } from '../../src/utils/questionPicker'
import type { Profile } from '../../src/types/game'

const sampleQuestions = [
  { id: 'q1', subject: 'maths', type: 'arithmetic', difficulty: 'beginner', question: '2+2?', options: ['3', '4', '5', '6'], answer: '4' },
  { id: 'q2', subject: 'maths', type: 'arithmetic', difficulty: 'beginner', question: '3+3?', options: ['5', '6', '7', '8'], answer: '6' },
  { id: 'q3', subject: 'english', type: 'vocabulary', difficulty: 'advanced', question: 'Fierce means?', options: ['A', 'B', 'C', 'D'], answer: 'A' },
] as any[]

const mockProfile = {
  difficulty: 'beginner',
  subjects: {
    maths: { enabled: true, types: ['arithmetic'] },
    english: { enabled: false, types: [] },
    chinese: { enabled: false, types: [] },
  },
} as any

describe('pickQuestion', () => {
  it('returns a question when questions are available', () => {
    const result = pickQuestion(sampleQuestions, new Set())
    expect(result).not.toBeNull()
  })

  it('returns the only unused question when two are used', () => {
    const result = pickQuestion(sampleQuestions, new Set(['q1', 'q2']))
    expect(result).not.toBeNull()
    expect(result!.id).toBe('q3')
  })

  it('returns null for empty question array', () => {
    expect(pickQuestion([], new Set())).toBeNull()
  })

  it('falls back to any question when all are in usedIds (not null)', () => {
    const result = pickQuestion(sampleQuestions, new Set(['q1', 'q2', 'q3']))
    expect(result).not.toBeNull()
  })

  it('returns a question from the available (unused) pool', () => {
    // q3 is the only one not used
    const result = pickQuestion(sampleQuestions, new Set(['q1', 'q2']))
    expect(result!.id).toBe('q3')
  })

  it('returns a question with id, question text, options, and answer', () => {
    const result = pickQuestion(sampleQuestions, new Set())
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('question')
    expect(result).toHaveProperty('options')
    expect(result).toHaveProperty('answer')
  })
})

describe('filterQuestionsForProfile', () => {
  it('returns only questions matching the profile', () => {
    const result = filterQuestionsForProfile(sampleQuestions, mockProfile)
    // maths enabled, difficulty beginner → q1 and q2 match; q3 is english (disabled) and advanced
    expect(result).toHaveLength(2)
    expect(result.map(q => q.id)).toEqual(expect.arrayContaining(['q1', 'q2']))
  })

  it('excludes questions from disabled subjects', () => {
    const result = filterQuestionsForProfile(sampleQuestions, mockProfile)
    expect(result.find(q => q.id === 'q3')).toBeUndefined()
  })

  it('excludes questions with wrong difficulty', () => {
    const result = filterQuestionsForProfile(sampleQuestions, mockProfile)
    // q3 is advanced; profile difficulty is beginner
    expect(result.every(q => q.difficulty === 'beginner')).toBe(true)
  })

  it('returns empty array when no questions match', () => {
    const noMatchProfile = {
      difficulty: 'advanced',
      subjects: {
        maths: { enabled: false, types: [] },
        english: { enabled: false, types: [] },
        chinese: { enabled: false, types: [] },
      },
    } as any
    expect(filterQuestionsForProfile(sampleQuestions, noMatchProfile)).toHaveLength(0)
  })

  it('returns all matching questions when type list is empty (no type filter)', () => {
    const profileNoTypeFilter = {
      difficulty: 'beginner',
      subjects: {
        maths: { enabled: true, types: [] },
        english: { enabled: false, types: [] },
        chinese: { enabled: false, types: [] },
      },
    } as any
    const result = filterQuestionsForProfile(sampleQuestions, profileNoTypeFilter)
    expect(result).toHaveLength(2)
  })
})

describe('shuffleOptions', () => {
  const q1 = sampleQuestions[0] // answer: '4', options: ['3','4','5','6']

  it('returns a question with all 4 original options', () => {
    const shuffled = shuffleOptions(q1)
    expect(shuffled.options).toHaveLength(4)
    expect(shuffled.options).toEqual(expect.arrayContaining(['3', '4', '5', '6']))
  })

  it('preserves the correct answer', () => {
    const shuffled = shuffleOptions(q1)
    expect(shuffled.answer).toBe('4')
  })

  it('does not mutate the original question', () => {
    const original = [...q1.options]
    shuffleOptions(q1)
    expect(q1.options).toEqual(original)
  })

  it('returns a new question object (not the same reference)', () => {
    const shuffled = shuffleOptions(q1)
    expect(shuffled).not.toBe(q1)
  })

  it('preserves question text and id', () => {
    const shuffled = shuffleOptions(q1)
    expect(shuffled.question).toBe(q1.question)
    expect(shuffled.id).toBe(q1.id)
  })
})
