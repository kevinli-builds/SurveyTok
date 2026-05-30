'use client'

import { useEffect, useState } from 'react'

type AdminQuestion = {
  id: string
  text: string
  type: string
  options: string | null
  authorId: string
  status: string
  createdAt: string
  answerCount: number
  results: Record<string, number>
}

type Stats = {
  totalQuestions: number
  totalAnswers: number
  totalUsers: number
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [questions, setQuestions] = useState<AdminQuestion[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setAuthed(true)
      } else {
        setAuthError('Wrong password.')
      }
    } catch {
      setAuthError('Connection error.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setAuthed(false)
    setQuestions([])
    setStats(null)
  }

  useEffect(() => {
    if (!authed) return
    setDataLoading(true)
    Promise.all([
      fetch('/api/admin/questions').then(r => r.json()),
      fetch('/api/admin/stats').then(r => r.json()),
    ])
      .then(([qs, st]) => {
        setQuestions(Array.isArray(qs) ? qs : [])
        setStats(st.totalQuestions !== undefined ? st : null)
      })
      .catch(() => {})
      .finally(() => setDataLoading(false))
  }, [authed])

  async function deleteQuestion(id: string) {
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
    setQuestions(prev => prev.filter(q => q.id !== id))
    setDeleteConfirm(null)
  }

  function parseOptions(optionsJson: string | null): string[] {
    if (!optionsJson) return []
    try {
      const parsed = JSON.parse(optionsJson)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  if (!authed) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0f0f13', padding: 24,
      }}>
        <form onSubmit={login} style={{
          background: '#1a1a24', borderRadius: 20, padding: '40px 32px',
          width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20,
          boxShadow: '0 8px 40px rgba(108,99,255,0.15)',
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f0f0f5' }}>Admin</h1>
            <p style={{ margin: '6px 0 0', color: '#666', fontSize: 14 }}>SurveyTok moderation dashboard</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ color: '#aaa', fontSize: 13, fontWeight: 600 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
              style={{
                background: '#0f0f13', border: '1.5px solid #333', borderRadius: 10,
                padding: '12px 14px', color: '#f0f0f5', fontSize: 15, outline: 'none',
              }}
            />
          </div>

          {authError && (
            <p style={{ margin: 0, color: '#ff6b6b', fontSize: 14 }}>{authError}</p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            style={{
              background: '#6C63FF', border: 'none', borderRadius: 10,
              padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: authLoading ? 'not-allowed' : 'pointer',
              opacity: authLoading ? 0.7 : 1,
            }}
          >
            {authLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#0f0f13', padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f0f0f5' }}>Admin Dashboard</h1>
            <p style={{ margin: '4px 0 0', color: '#555', fontSize: 14 }}>SurveyTok</p>
          </div>
          <button
            onClick={logout}
            style={{
              background: 'transparent', border: '1.5px solid #333', borderRadius: 8,
              padding: '8px 16px', color: '#888', fontSize: 13, cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Total Questions', value: stats.totalQuestions },
              { label: 'Total Answers', value: stats.totalAnswers },
              { label: 'Total Users', value: stats.totalUsers },
            ].map(s => (
              <div key={s.label} style={{
                background: '#1a1a24', borderRadius: 14, padding: '20px 24px',
                boxShadow: '0 4px 20px rgba(108,99,255,0.08)',
              }}>
                <p style={{ margin: 0, color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {s.label}
                </p>
                <p style={{ margin: '8px 0 0', color: '#f0f0f5', fontSize: 32, fontWeight: 800 }}>
                  {s.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Questions */}
        <div style={{ background: '#1a1a24', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a35' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f0f0f5' }}>
              All Questions
              {questions.length > 0 && (
                <span style={{ marginLeft: 10, color: '#555', fontSize: 14, fontWeight: 400 }}>
                  ({questions.length})
                </span>
              )}
            </h2>
          </div>

          {dataLoading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#555' }}>Loading…</div>
          ) : questions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#555' }}>No questions yet.</div>
          ) : (
            <div>
              {questions.map((q, i) => {
                const opts = q.type === 'yesno'
                  ? [{ label: 'Yes', key: 'yes' }, { label: 'No', key: 'no' }]
                  : parseOptions(q.options).map((label, idx) => ({ label, key: String(idx) }))
                const total = q.answerCount

                return (
                  <div key={q.id} style={{
                    padding: '20px 24px',
                    borderBottom: i < questions.length - 1 ? '1px solid #1e1e28' : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{
                            background: '#6C63FF22', color: '#6C63FF',
                            borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 600,
                            textTransform: 'uppercase',
                          }}>
                            {q.type === 'yesno' ? 'Yes/No' : 'Poll'}
                          </span>
                          <span style={{ color: '#444', fontSize: 12 }}>
                            {new Date(q.createdAt).toLocaleDateString()}
                          </span>
                          <span style={{ color: '#444', fontSize: 12 }}>
                            {total} {total === 1 ? 'vote' : 'votes'}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 12px', color: '#e0e0ea', fontSize: 16, fontWeight: 600 }}>
                          {q.text}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {opts.map(opt => {
                            const count = q.results[opt.key] ?? 0
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0
                            return (
                              <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: '#888', fontSize: 13, width: 80, flexShrink: 0 }}>{opt.label}</span>
                                <div style={{ flex: 1, background: '#0f0f13', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: '#6C63FF', borderRadius: 4 }} />
                                </div>
                                <span style={{ color: '#555', fontSize: 12, width: 40, textAlign: 'right' }}>{pct}%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        {deleteConfirm === q.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                            <span style={{ color: '#ff6b6b', fontSize: 12 }}>Delete this?</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                style={{ background: 'transparent', border: '1px solid #333', borderRadius: 6, padding: '4px 10px', color: '#888', fontSize: 12, cursor: 'pointer' }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => deleteQuestion(q.id)}
                                style={{ background: '#ff4444', border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(q.id)}
                            style={{ background: 'transparent', border: '1px solid #333', borderRadius: 6, padding: '6px 12px', color: '#666', fontSize: 13, cursor: 'pointer' }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
