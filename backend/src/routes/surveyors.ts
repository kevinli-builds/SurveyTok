import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { hashPassword, verifyPassword } from '../lib/password'
import { tally } from '../lib/tally'
import { loginLimiter, registerLimiter } from '../lib/rateLimit'
import { validateQuestionInput } from '../lib/questionInput'
import { safeSecretEqual } from '../lib/secrets'

const router = Router()

// Server-to-server secret shared with the Vercel web app. Falls back to
// ADMIN_SECRET so deployments that haven't set a dedicated key keep working.
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || process.env.ADMIN_SECRET

// All surveyor endpoints are server-to-server only: the Vercel web app proxies
// to them with the shared secret. Per-surveyor scoping is enforced below using
// the surveyorId, which the web layer derives from a signed session cookie.
router.use((req, res, next) => {
  if (!safeSecretEqual(req.headers['x-admin-secret'], INTERNAL_SECRET))
    return void res.status(401).json({ error: 'Unauthorized' })
  next()
})

// Register a new surveyor
router.post('/register', registerLimiter, async (req, res) => {
  const { handle, password } = req.body
  if (!handle || !password)
    return void res.status(400).json({ error: 'Handle and passphrase required' })
  const normalized = String(handle).trim().toLowerCase()
  if (!/^[a-z0-9_]{3,30}$/.test(normalized))
    return void res.status(400).json({ error: 'Handle must be 3–30 chars: letters, numbers, underscore' })
  if (String(password).length < 8)
    return void res.status(400).json({ error: 'Passphrase must be at least 8 characters' })

  const existing = await prisma.surveyor.findUnique({ where: { handle: normalized } })
  if (existing) return void res.status(409).json({ error: 'That handle is already taken' })

  const surveyor = await prisma.surveyor.create({
    data: { handle: normalized, passwordHash: hashPassword(password) },
  })
  res.json({ id: surveyor.id, handle: surveyor.handle })
})

// Log in an existing surveyor
router.post('/login', loginLimiter, async (req, res) => {
  const { handle, password } = req.body
  if (!handle || !password)
    return void res.status(400).json({ error: 'Handle and passphrase required' })
  const normalized = String(handle).trim().toLowerCase()
  const surveyor = await prisma.surveyor.findUnique({ where: { handle: normalized } })
  if (!surveyor || !verifyPassword(password, surveyor.passwordHash))
    return void res.status(401).json({ error: 'Invalid handle or passphrase' })
  res.json({ id: surveyor.id, handle: surveyor.handle })
})

// Create a question owned by a surveyor
router.post('/questions', async (req, res) => {
  const { surveyorId } = req.body
  if (!surveyorId) return void res.status(400).json({ error: 'surveyorId required' })

  const v = validateQuestionInput(req.body)
  if (!v.ok) return void res.status(400).json({ error: v.error })

  const surveyor = await prisma.surveyor.findUnique({ where: { id: surveyorId } })
  if (!surveyor) return void res.status(404).json({ error: 'Surveyor not found' })

  const question = await prisma.question.create({
    data: {
      text: v.text,
      type: v.type,
      options: v.options ? JSON.stringify(v.options) : null,
      surveyorId,
    },
  })
  res.json(question)
})

// List a surveyor's questions with live results
router.get('/:id/questions', async (req, res) => {
  const questions = await prisma.question.findMany({
    where: { surveyorId: req.params.id },
    include: { answers: true },
    orderBy: { createdAt: 'desc' },
  })

  const result = questions.map(q => ({
    id: q.id,
    text: q.text,
    type: q.type,
    options: q.options,
    status: q.status,
    createdAt: q.createdAt,
    answerCount: q.answers.length,
    results: tally(q.type, q.options, q.answers.map(a => a.value)),
  }))

  res.json(result)
})

// KPIs for a surveyor's questions
router.get('/:id/stats', async (req, res) => {
  const surveyorId = req.params.id

  const questions = await prisma.question.findMany({
    where: { surveyorId },
    include: { _count: { select: { answers: true } } },
  })

  const totalQuestions = questions.length
  const totalResponses = questions.reduce((sum, q) => sum + q._count.answers, 0)
  const activeQuestions = questions.filter(q => q.status === 'active').length
  const avgResponses = totalQuestions > 0
    ? Math.round((totalResponses / totalQuestions) * 10) / 10
    : 0

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentResponses = await prisma.answer.count({
    where: { question: { surveyorId }, createdAt: { gte: since } },
  })

  res.json({ totalQuestions, totalResponses, activeQuestions, avgResponses, recentResponses })
})

// Update a question's status (e.g. close it) — scoped to the owning surveyor
router.patch('/:surveyorId/questions/:id', async (req, res) => {
  const { surveyorId, id } = req.params
  const { status } = req.body
  if (status !== 'active' && status !== 'closed')
    return void res.status(400).json({ error: 'Invalid status' })

  const q = await prisma.question.findUnique({ where: { id } })
  if (!q || q.surveyorId !== surveyorId)
    return void res.status(404).json({ error: 'Question not found' })

  const updated = await prisma.question.update({ where: { id }, data: { status } })
  res.json({ id: updated.id, status: updated.status })
})

// Delete a question — scoped to the owning surveyor
router.delete('/:surveyorId/questions/:id', async (req, res) => {
  const { surveyorId, id } = req.params
  const q = await prisma.question.findUnique({ where: { id } })
  if (!q || q.surveyorId !== surveyorId)
    return void res.status(404).json({ error: 'Question not found' })

  await prisma.answer.deleteMany({ where: { questionId: id } })
  await prisma.question.delete({ where: { id } })
  res.json({ ok: true })
})

export { router as surveyorsRouter }
