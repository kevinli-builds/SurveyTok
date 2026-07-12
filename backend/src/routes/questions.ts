import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { tally } from '../lib/tally'
import { writeLimiter } from '../lib/rateLimit'
import { validateQuestionInput, validateAnswerValue } from '../lib/questionInput'
import { safeSecretEqual } from '../lib/secrets'

const router = Router()

// Questions this user hasn't answered yet (excludes their own)
router.get('/feed', async (req, res) => {
  const { userId } = req.query as { userId: string }
  if (!userId) return void res.status(400).json({ error: 'userId required' })

  const answered = await prisma.answer.findMany({
    where: { userId },
    select: { questionId: true },
  })
  const answeredIds = answered.map(a => a.questionId)

  const questions = await prisma.question.findMany({
    where: {
      status: 'active',
      // include surveyor questions (authorId null) and other users' questions,
      // but exclude the requesting user's own device-authored questions
      OR: [
        { authorId: null },
        { authorId: { not: userId } },
      ],
      ...(answeredIds.length > 0 && { id: { notIn: answeredIds } }),
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  res.json(questions)
})

// Questions created by this user, with live results
router.get('/mine', async (req, res) => {
  const { userId } = req.query as { userId: string }
  if (!userId) return void res.status(400).json({ error: 'userId required' })

  const questions = await prisma.question.findMany({
    where: { authorId: userId },
    include: { answers: true },
    orderBy: { createdAt: 'desc' },
  })

  const result = questions.map(q => ({
    ...q,
    answers: undefined,
    answerCount: q.answers.length,
    results: tally(q.type, q.options, q.answers.map(a => a.value)),
  }))

  res.json(result)
})

// Post a new question
router.post('/', writeLimiter, async (req, res) => {
  const { authorId } = req.body
  if (!authorId) return void res.status(400).json({ error: 'authorId required' })

  // Same validation as the surveyor path — text/options are bounded so the public
  // feed can't be flooded with oversized or malformed questions.
  const v = validateQuestionInput(req.body)
  if (!v.ok) return void res.status(400).json({ error: v.error })

  const question = await prisma.question.create({
    data: {
      text: v.text,
      type: v.type,
      options: v.options ? JSON.stringify(v.options) : null,
      authorId,
    },
  })
  res.json(question)
})

// Submit an answer; returns aggregate results immediately
router.post('/:id/answer', writeLimiter, async (req, res) => {
  const { userId } = req.body
  const { id } = req.params
  if (!userId) return void res.status(400).json({ error: 'userId required' })
  const av = validateAnswerValue(req.body?.value)
  if (!av.ok) return void res.status(400).json({ error: av.error })

  try {
    await prisma.answer.create({ data: { questionId: id, userId, value: av.value } })
  } catch (e: any) {
    if (e.code === 'P2002') return void res.status(409).json({ error: 'Already answered' })
    throw e
  }

  const question = await prisma.question.findUnique({
    where: { id },
    include: { answers: true },
  })
  if (!question) return void res.status(404).json({ error: 'Not found' })

  const results = tally(question.type, question.options, question.answers.map(a => a.value))
  res.json({ results, total: question.answers.length })
})

// Get results for a question
router.get('/:id/results', async (req, res) => {
  const question = await prisma.question.findUnique({
    where: { id: req.params.id },
    include: { answers: true },
  })
  if (!question) return void res.status(404).json({ error: 'Not found' })

  const results = tally(question.type, question.options, question.answers.map(a => a.value))
  res.json({ results, total: question.answers.length })
})

// Admin: all questions with tallied results
router.get('/admin/all', async (req, res) => {
  if (!safeSecretEqual(req.headers['x-admin-secret'], process.env.ADMIN_SECRET))
    return void res.status(401).json({ error: 'Unauthorized' })

  const questions = await prisma.question.findMany({
    include: { answers: true },
    orderBy: { createdAt: 'desc' },
  })

  const result = questions.map(q => ({
    id: q.id,
    text: q.text,
    type: q.type,
    options: q.options,
    authorId: q.authorId,
    status: q.status,
    createdAt: q.createdAt,
    answerCount: q.answers.length,
    results: tally(q.type, q.options, q.answers.map(a => a.value)),
  }))

  res.json(result)
})

// Admin: delete a question
router.delete('/admin/:id', async (req, res) => {
  if (!safeSecretEqual(req.headers['x-admin-secret'], process.env.ADMIN_SECRET))
    return void res.status(401).json({ error: 'Unauthorized' })

  await prisma.answer.deleteMany({ where: { questionId: req.params.id } })
  await prisma.question.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// Admin: site-wide stats
router.get('/admin/stats', async (req, res) => {
  const secret = req.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_SECRET)
    return void res.status(401).json({ error: 'Unauthorized' })

  const [totalQuestions, totalAnswers, totalUsers] = await Promise.all([
    prisma.question.count(),
    prisma.answer.count(),
    prisma.user.count(),
  ])

  res.json({ totalQuestions, totalAnswers, totalUsers })
})

export { router as questionsRouter }
