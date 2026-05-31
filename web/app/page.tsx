'use client'

import { useEffect, useRef, useState } from 'react'
import { getDeviceId } from '@/lib/deviceId'
import { getFeed, registerUser, submitAnswer, parseOptions, type Question, type Results } from '@/lib/api'

export default function FeedPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [votes, setVotes] = useState<Record<string, { results: Results; total: number; chosen: string }>>({})
  const [loading, setLoading] = useState(true)
  const [empty, setEmpty] = useState(false)
  const userIdRef = useRef<string>('')

  useEffect(() => {
    const id = getDeviceId()
    userIdRef.current = id
    registerUser(id).catch(() => {})
    getFeed(id)
      .then(qs => {
        setQuestions(qs)
        setEmpty(qs.length === 0)
      })
      .catch(() => setEmpty(true))
      .finally(() => setLoading(false))
  }, [])

  async function vote(questionId: string, value: string) {
    if (votes[questionId]) return
    try {
      const data = await submitAnswer(questionId, userIdRef.current, value)
      setVotes(prev => ({ ...prev, [questionId]: { ...data, chosen: value } }))
    } catch {}
  }

  let content: React.ReactNode
  if (loading) {
    content = (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f0f13' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #6C63FF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  } else if (empty) {
    content = (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0f13', gap: 12 }}>
        <div style={{ fontSize: 48 }}>🎉</div>
        <p style={{ color: '#aaa', fontSize: 18 }}>You&apos;ve seen everything!</p>
        <p style={{ color: '#555', fontSize: 14 }}>Check back later for new questions.</p>
      </div>
    )
  } else {
    content = (
      <div className="feed">
        {questions.map(q => (
          <div className="feed-card" key={q.id}>
            <QuestionCard
              question={q}
              vote={votes[q.id]}
              onVote={value => vote(q.id, value)}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {content}
      <SurveyorLink />
    </>
  )
}

function SurveyorLink() {
  return (
    <a
      href="/surveyor"
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 50,
        background: '#1a1a24', border: '1.5px solid #6C63FF55', borderRadius: 100,
        padding: '8px 16px', color: '#cfcaff', fontSize: 13, fontWeight: 600,
        textDecoration: 'none', boxShadow: '0 4px 20px rgba(108,99,255,0.2)',
        backdropFilter: 'blur(4px)',
      }}
    >
      Sign in as Surveyor →
    </a>
  )
}

function QuestionCard({
  question,
  vote,
  onVote,
}: {
  question: Question
  vote?: { results: Results; total: number; chosen: string }
  onVote: (value: string) => void
}) {
  const options = question.type === 'yesno'
    ? [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]
    : parseOptions(question.options).map((label, i) => ({ label, value: String(i) }))

  const total = vote?.total ?? 0

  return (
    <div style={{
      background: '#1a1a24',
      borderRadius: 20,
      padding: '36px 28px',
      width: '100%',
      maxWidth: 460,
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      boxShadow: '0 8px 40px rgba(108,99,255,0.15)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          background: '#6C63FF22',
          color: '#6C63FF',
          borderRadius: 100,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          {question.type === 'yesno' ? 'Yes / No' : 'Poll'}
        </span>
        {vote && (
          <span style={{ color: '#555', fontSize: 13 }}>
            {total} {total === 1 ? 'vote' : 'votes'}
          </span>
        )}
      </div>

      <p style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.4, margin: 0, color: '#f0f0f5' }}>
        {question.text}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {options.map(opt => {
          const count = vote?.results[opt.value] ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const chosen = vote?.chosen === opt.value

          if (vote) {
            return (
              <div key={opt.value} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#0f0f13' }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: `${pct}%`,
                  background: chosen ? '#6C63FF' : '#6C63FF33',
                  transition: 'width 0.6s ease',
                }} />
                <div style={{
                  position: 'relative', display: 'flex', justifyContent: 'space-between',
                  padding: '14px 16px', fontSize: 15, fontWeight: chosen ? 700 : 500,
                  color: chosen ? '#fff' : '#ccc',
                }}>
                  <span>{opt.label}</span>
                  <span>{pct}%</span>
                </div>
              </div>
            )
          }

          return (
            <button
              key={opt.value}
              onClick={() => onVote(opt.value)}
              style={{
                background: 'transparent',
                border: '1.5px solid #6C63FF55',
                borderRadius: 12,
                padding: '14px 16px',
                color: '#f0f0f5',
                fontSize: 15,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'border-color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#6C63FF'
                ;(e.currentTarget as HTMLButtonElement).style.background = '#6C63FF18'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#6C63FF55'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {!vote && (
        <p style={{ margin: 0, color: '#555', fontSize: 13, textAlign: 'center' }}>
          Tap an answer to see results
        </p>
      )}
    </div>
  )
}
