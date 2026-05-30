const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export type Question = {
  id: string
  text: string
  type: 'yesno' | 'multiplechoice'
  options: string | null
  authorId: string
  createdAt: string
  status: string
}

export type Results = Record<string, number>

export async function registerUser(userId: string): Promise<void> {
  await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: userId }),
  })
}

export async function getFeed(userId: string): Promise<Question[]> {
  const res = await fetch(`${API_URL}/questions/feed?userId=${encodeURIComponent(userId)}`)
  if (!res.ok) throw new Error('Failed to fetch feed')
  return res.json()
}

export async function submitAnswer(
  questionId: string,
  userId: string,
  value: string
): Promise<{ results: Results; total: number }> {
  const res = await fetch(`${API_URL}/questions/${questionId}/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, value }),
  })
  if (!res.ok) throw new Error('Failed to submit answer')
  return res.json()
}

export function parseOptions(optionsJson: string | null): string[] {
  if (!optionsJson) return []
  try {
    const parsed = JSON.parse(optionsJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
