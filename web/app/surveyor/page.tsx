'use client'

import { useEffect, useState } from 'react'

type SurveyorQuestion = {
  id: string
  text: string
  type: string
  options: string | null
  status: string
  createdAt: string
  answerCount: number
  results: Record<string, number>
}

type Stats = {
  totalQuestions: number
  totalResponses: number
  activeQuestions: number
  avgResponses: number
  recentResponses: number
}

const ACCENT = '#6C63FF'
const BG = '#0f0f13'
const CARD = '#1a1a24'

function parseOptions(optionsJson: string | null): string[] {
  if (!optionsJson) return []
  try {
    const parsed = JSON.parse(optionsJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function SurveyorPage() {
  const [authed, setAuthed] = useState(false)
  const [handle, setHandle] = useState('')
  const [booting, setBooting] = useState(true)

  // restore session on mount
  useEffect(() => {
    fetch('/api/surveyor/me')
      .then(r => r.json())
      .then(d => {
        if (d.authed) {
          setAuthed(true)
          setHandle(d.handle)
        }
      })
      .catch(() => {})
      .finally(() => setBooting(false))
  }, [])

  if (booting) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (!authed) {
    return <AuthForm onAuthed={h => { setAuthed(true); setHandle(h) }} />
  }

  return <Dashboard handle={handle} onLogout={() => { setAuthed(false); setHandle('') }} />
}

function AuthForm({ onAuthed }: { onAuthed: (handle: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/surveyor/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, handle, password }),
      })
      const data = await res.json()
      if (res.ok) {
        onAuthed(data.handle)
      } else {
        setError(data.error || 'Something went wrong.')
      }
    } catch {
      setError('Connection error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, padding: 24 }}>
      <form onSubmit={submit} style={{
        background: CARD, borderRadius: 20, padding: '40px 32px',
        width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 20,
        boxShadow: '0 8px 40px rgba(108,99,255,0.15)',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#f0f0f5' }}>
            Surveyor {mode === 'login' ? 'sign in' : 'sign up'}
          </h1>
          <p style={{ margin: '6px 0 0', color: '#666', fontSize: 14 }}>
            Create questions and track responses on SurveyTok.
          </p>
        </div>

        {/* mode toggle */}
        <div style={{ display: 'flex', background: BG, borderRadius: 10, padding: 4 }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError('') }}
              style={{
                flex: 1, border: 'none', borderRadius: 8, padding: '8px',
                background: mode === m ? ACCENT : 'transparent',
                color: mode === m ? '#fff' : '#888',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ color: '#aaa', fontSize: 13, fontWeight: 600 }}>Handle</label>
          <input
            value={handle}
            onChange={e => setHandle(e.target.value)}
            placeholder="e.g. acme_research"
            autoCapitalize="none"
            required
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ color: '#aaa', fontSize: 13, fontWeight: 600 }}>Passphrase</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'At least 6 characters' : 'Your passphrase'}
            required
            style={inputStyle}
          />
        </div>

        {error && <p style={{ margin: 0, color: '#ff6b6b', fontSize: 14 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: ACCENT, border: 'none', borderRadius: 10,
            padding: '13px', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <a href="/" style={{ color: '#555', fontSize: 13, textAlign: 'center', textDecoration: 'none' }}>
          ← Back to the feed
        </a>
      </form>
    </div>
  )
}

function Dashboard({ handle, onLogout }: { handle: string; onLogout: () => void }) {
  const [questions, setQuestions] = useState<SurveyorQuestion[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function refresh() {
    const [qs, st] = await Promise.all([
      fetch('/api/surveyor/questions').then(r => r.json()),
      fetch('/api/surveyor/stats').then(r => r.json()),
    ])
    setQuestions(Array.isArray(qs) ? qs : [])
    setStats(st && st.totalQuestions !== undefined ? st : null)
  }

  useEffect(() => {
    refresh().catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function logout() {
    await fetch('/api/surveyor/auth', { method: 'DELETE' })
    onLogout()
  }

  async function toggleStatus(q: SurveyorQuestion) {
    const next = q.status === 'active' ? 'closed' : 'active'
    await fetch(`/api/surveyor/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, status: next } : x))
    refresh().catch(() => {})
  }

  async function remove(id: string) {
    await fetch(`/api/surveyor/questions/${id}`, { method: 'DELETE' })
    setQuestions(prev => prev.filter(q => q.id !== id))
    setConfirmDelete(null)
    refresh().catch(() => {})
  }

  const kpis = stats ? [
    { label: 'Questions', value: stats.totalQuestions },
    { label: 'Total Responses', value: stats.totalResponses },
    { label: 'Avg / Question', value: stats.avgResponses },
    { label: 'Active', value: stats.activeQuestions },
    { label: 'Last 7 Days', value: stats.recentResponses },
  ] : []

  return (
    <div style={{ minHeight: '100dvh', background: BG, padding: '32px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#f0f0f5' }}>Surveyor Dashboard</h1>
            <p style={{ margin: '4px 0 0', color: '#555', fontSize: 14 }}>
              Signed in as <span style={{ color: ACCENT, fontWeight: 600 }}>@{handle}</span>
            </p>
          </div>
          <button onClick={logout} style={{
            background: 'transparent', border: '1.5px solid #333', borderRadius: 8,
            padding: '8px 16px', color: '#888', fontSize: 13, cursor: 'pointer',
          }}>
            Sign out
          </button>
        </div>

        {/* KPIs */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
            {kpis.map(k => (
              <div key={k.label} style={{
                background: CARD, borderRadius: 14, padding: '20px 22px',
                boxShadow: '0 4px 20px rgba(108,99,255,0.08)',
              }}>
                <p style={{ margin: 0, color: '#888', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {k.label}
                </p>
                <p style={{ margin: '8px 0 0', color: '#f0f0f5', fontSize: 30, fontWeight: 800 }}>
                  {k.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Create question */}
        <CreateQuestion onCreated={() => refresh().catch(() => {})} />

        {/* Questions list */}
        <div style={{ background: CARD, borderRadius: 16, overflow: 'hidden', marginTop: 24 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a35' }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f0f0f5' }}>
              Your Questions
              {questions.length > 0 && (
                <span style={{ marginLeft: 10, color: '#555', fontSize: 14, fontWeight: 400 }}>({questions.length})</span>
              )}
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#555' }}>Loading…</div>
          ) : questions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#555' }}>
              No questions yet — create your first one above.
            </div>
          ) : (
            <div>
              {questions.map((q, i) => {
                const opts = q.type === 'yesno'
                  ? [{ label: 'Yes', key: 'yes' }, { label: 'No', key: 'no' }]
                  : parseOptions(q.options).map((label, idx) => ({ label, key: String(idx) }))
                const total = q.answerCount

                return (
                  <div key={q.id} style={{ padding: '20px 24px', borderBottom: i < questions.length - 1 ? '1px solid #1e1e28' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ background: '#6C63FF22', color: ACCENT, borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                            {q.type === 'yesno' ? 'Yes/No' : 'Poll'}
                          </span>
                          <span style={{
                            background: q.status === 'active' ? '#2ecc7122' : '#88888822',
                            color: q.status === 'active' ? '#2ecc71' : '#888',
                            borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                          }}>
                            {q.status}
                          </span>
                          <span style={{ color: '#444', fontSize: 12 }}>{new Date(q.createdAt).toLocaleDateString()}</span>
                          <span style={{ color: '#444', fontSize: 12 }}>{total} {total === 1 ? 'response' : 'responses'}</span>
                        </div>
                        <p style={{ margin: '0 0 12px', color: '#e0e0ea', fontSize: 16, fontWeight: 600 }}>{q.text}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {opts.map(opt => {
                            const count = q.results[opt.key] ?? 0
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0
                            return (
                              <div key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ color: '#888', fontSize: 13, width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                                <div style={{ flex: 1, background: BG, borderRadius: 4, height: 8, overflow: 'hidden' }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: ACCENT, borderRadius: 4 }} />
                                </div>
                                <span style={{ color: '#666', fontSize: 12, width: 56, textAlign: 'right' }}>{count} · {pct}%</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        <button onClick={() => toggleStatus(q)} style={smallBtn}>
                          {q.status === 'active' ? 'Close' : 'Reopen'}
                        </button>
                        {confirmDelete === q.id ? (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setConfirmDelete(null)} style={smallBtn}>Cancel</button>
                            <button onClick={() => remove(q.id)} style={{ ...smallBtn, background: '#ff4444', borderColor: '#ff4444', color: '#fff', fontWeight: 600 }}>Delete</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(q.id)} style={smallBtn}>Delete</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <a href="/" style={{ display: 'inline-block', marginTop: 24, color: '#555', fontSize: 13, textDecoration: 'none' }}>
          ← Back to the feed
        </a>
      </div>
    </div>
  )
}

function CreateQuestion({ onCreated }: { onCreated: () => void }) {
  const [text, setText] = useState('')
  const [type, setType] = useState<'yesno' | 'multiplechoice'>('yesno')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function setOption(i: number, val: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? val : o))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!text.trim()) { setError('Enter a question.'); return }

    let payload: { text: string; type: string; options?: string[] }
    if (type === 'multiplechoice') {
      const cleaned = options.map(o => o.trim()).filter(Boolean)
      if (cleaned.length < 2) { setError('Add at least 2 options.'); return }
      payload = { text: text.trim(), type, options: cleaned }
    } else {
      payload = { text: text.trim(), type }
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/surveyor/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (res.ok) {
        setText('')
        setType('yesno')
        setOptions(['', ''])
        onCreated()
      } else {
        setError(data.error || 'Could not create the question.')
      }
    } catch {
      setError('Connection error.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ background: CARD, borderRadius: 16, padding: '24px' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#f0f0f5' }}>Create a question</h2>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What do you want to ask?"
        maxLength={280}
        rows={2}
        style={{ ...inputStyle, width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
      />

      <div style={{ display: 'flex', gap: 10, margin: '14px 0' }}>
        {(['yesno', 'multiplechoice'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            style={{
              flex: 1, borderRadius: 10, padding: '10px',
              border: `1.5px solid ${type === t ? ACCENT : '#333'}`,
              background: type === t ? '#6C63FF18' : 'transparent',
              color: type === t ? '#f0f0f5' : '#888',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t === 'yesno' ? 'Yes / No' : 'Multiple choice'}
          </button>
        ))}
      </div>

      {type === 'multiplechoice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8 }}>
              <input
                value={opt}
                onChange={e => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                style={{ ...inputStyle, flex: 1 }}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => setOptions(prev => prev.filter((_, idx) => idx !== i))} style={smallBtn}>✕</button>
              )}
            </div>
          ))}
          {options.length < 4 && (
            <button type="button" onClick={() => setOptions(prev => [...prev, ''])} style={{ ...smallBtn, alignSelf: 'flex-start' }}>
              + Add option
            </button>
          )}
        </div>
      )}

      {error && <p style={{ margin: '0 0 12px', color: '#ff6b6b', fontSize: 14 }}>{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: ACCENT, border: 'none', borderRadius: 10, padding: '12px 24px',
          color: '#fff', fontSize: 15, fontWeight: 700,
          cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? 'Posting…' : 'Post question'}
      </button>
    </form>
  )
}

const inputStyle: React.CSSProperties = {
  background: BG, border: '1.5px solid #333', borderRadius: 10,
  padding: '12px 14px', color: '#f0f0f5', fontSize: 15, outline: 'none',
}

const smallBtn: React.CSSProperties = {
  background: 'transparent', border: '1px solid #333', borderRadius: 6,
  padding: '6px 12px', color: '#888', fontSize: 13, cursor: 'pointer',
}
