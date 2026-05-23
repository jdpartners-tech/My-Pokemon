import type { Question, Profile, SubjectType } from '../types/game'

export function pickQuestion(
  questions: Question[],
  usedIds: Set<string>
): Question | null {
  const available = questions.filter(q => q.id && !usedIds.has(q.id))
  if (available.length === 0) return questions.length > 0 ? questions[Math.floor(Math.random() * questions.length)] : null
  return available[Math.floor(Math.random() * available.length)]
}

export function filterQuestionsForProfile(
  questions: Question[],
  profile: Profile
): Question[] {
  return questions.filter(q => {
    const subject = q.subject as SubjectType
    const settings = profile.subjects[subject]
    if (!settings?.enabled) return false
    if (q.difficulty !== profile.difficulty) return false
    if (settings.types.length > 0 && !(settings.types as string[]).includes(q.type)) return false
    return true
  })
}

export function shuffleOptions(question: Question): Question {
  const options = [...question.options] as [string, string, string, string]
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { ...question, options }
}
