import 'dotenv/config'
import 'express-async-errors' // routes async throws to the error handler instead of hanging
import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { questionsRouter } from './routes/questions'
import { usersRouter } from './routes/users'
import { surveyorsRouter } from './routes/surveyors'
import { retirementGuard, SERVICE_RETIRED } from './lib/retirement'

const app = express()

// Render runs behind a single proxy; trust it so req.ip reflects the real client
// (required for correct per-IP rate limiting).
app.set('trust proxy', 1)

// Security headers. This is a JSON API plus one self-served HTML page (/privacy),
// so the CSP allows that page's inline <style> + data: images and otherwise locks
// things down (no framing, no object embeds). CORP is cross-origin because the API
// is consumed by the Vercel web app + Expo app from other origins.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

// CORS: allow our web app (and Vercel preview deploys) plus non-browser clients
// (the Expo app and server-to-server calls send no Origin header).
const WEB_ORIGINS = (process.env.WEB_ORIGIN || 'https://survey-tok-nouc.vercel.app')
  .split(',').map(s => s.trim()).filter(Boolean)
const isProd = process.env.NODE_ENV === 'production'
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    try {
      const host = new URL(origin).hostname
      const isLocalhost = host === 'localhost' || host === '127.0.0.1'
      if (
        WEB_ORIGINS.includes(origin) ||
        host.endsWith('.vercel.app') ||
        (!isProd && isLocalhost)
      ) return cb(null, true)
    } catch { /* fall through */ }
    cb(new Error('Not allowed by CORS'))
  },
}))

// Questions/answers are tiny; cap the body so a giant payload can't exhaust memory.
app.use(express.json({ limit: '16kb' }))

// Retirement kill-switch (ST1): when SERVICE_RETIRED is set, close the auth + write
// surface (503) for everything except /health and /privacy. No-op by default.
app.use(retirementGuard(SERVICE_RETIRED))

app.use('/questions', questionsRouter)
app.use('/users', usersRouter)
app.use('/surveyors', surveyorsRouter)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.get('/privacy', (_req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — SurveyTok</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a2e; background: #fafafa; padding: 0 16px 60px; }
    .wrap { max-width: 680px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 800; margin: 48px 0 4px; }
    .meta { color: #888; font-size: 14px; margin-bottom: 40px; }
    h2 { font-size: 17px; font-weight: 700; margin: 36px 0 10px; color: #1a1a2e; }
    p, li { font-size: 15px; line-height: 1.7; color: #444; }
    ul { padding-left: 20px; margin-top: 8px; }
    li { margin-bottom: 4px; }
    hr { border: none; border-top: 1px solid #e8e8e8; margin: 32px 0; }
    a { color: #6C63FF; }
    .pill { display: inline-block; background: #f0eeff; color: #6C63FF; border-radius: 100px; padding: 4px 14px; font-size: 13px; font-weight: 600; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Privacy Policy</h1>
    <p class="meta">SurveyTok &nbsp;·&nbsp; Last updated: May 2026</p>

    <h2>What this app is</h2>
    <p>SurveyTok is an anonymous poll platform. You can post questions, answer questions posted by others, and see aggregated results. The app is designed to work without requiring any personal information.</p>

    <hr />

    <h2>What we collect</h2>
    <p><strong>What we do collect</strong></p>
    <ul>
      <li><strong>A random device ID</strong> — when you first open the app, a random identifier (UUID) is generated on your device and stored locally. It contains no personal information.</li>
      <li><strong>Questions you post</strong> — the text, answer type, and options.</li>
      <li><strong>Answers you submit</strong> — your selected answer to questions in the feed.</li>
      <li><strong>Timestamps</strong> — when questions were posted and answers submitted.</li>
    </ul>
    <br />
    <p><strong>What we do NOT collect</strong></p>
    <ul>
      <li>Your name, email address, or phone number</li>
      <li>Your location</li>
      <li>Your contacts or address book</li>
      <li>Any information from other apps</li>
      <li>Photos, camera, or microphone access</li>
    </ul>

    <hr />

    <h2>How we use your data</h2>
    <ul>
      <li>To show your questions to other users in the feed</li>
      <li>To record your answers so you are not shown the same question twice</li>
      <li>To calculate and display aggregate results</li>
      <li>To show you the questions you have posted and their results</li>
    </ul>
    <p style="margin-top:10px">We do not use your data for advertising, profiling, or any purpose beyond operating the app.</p>

    <hr />

    <h2>Who we share data with</h2>
    <p>We do not sell, rent, or share your data with third parties for commercial purposes. Aggregate, anonymised results may be visible to any user who answers a question.</p>

    <hr />

    <h2>Data retention &amp; deletion</h2>
    <p>Questions and answers are retained for as long as the app is operational. To request deletion of your data, contact us with your device ID and we will remove it within 30 days.</p>

    <hr />

    <h2>Children</h2>
    <p>This app is not directed at children under 13. We do not knowingly collect data from children under 13.</p>

    <hr />

    <h2>Changes</h2>
    <p>If we make material changes to this policy we will update the date above and notify users through the app where appropriate.</p>

    <hr />

    <h2>Contact</h2>
    <p>Questions? Email us at <a href="mailto:snowwarrior1+surveytok@gmail.com">snowwarrior1+surveytok@gmail.com</a></p>
  </div>
</body>
</html>`)
})

// Centralized error handler — async route rejections land here (via
// express-async-errors) and get a clean 500 instead of hanging the request.
// Never leaks internals to the client.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  if (res.headersSent) return
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => console.log(`Survey backend running on http://localhost:${PORT}`))
