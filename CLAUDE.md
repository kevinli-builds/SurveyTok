# SurveyTok — Claude Context

## Notes & handoff — READ FIRST when told to "go through your notes"
**`OPUS_BRIEF.md`** (repo root) is the forward roadmap of record: PM/design/security
audits (sections 1-3), delight ideas (4), first-visit cold opens (5, shipped), wave-2 (6),
Fable design notes (7), mobile/web scan (8), and the depth roadmap (9) — plus a **status
ledger at the very top** marking what has shipped vs. what is next. When asked to pick up
the next enhancement: (1) read the brief; (2) run `git log --oneline -20` + `git status` —
a dirty working tree means another agent is mid-flight, so choose a different area or write
specs rather than edit the same files; (3) confirm the item is not already built; (4) build
it with the house conventions (tests, then commit + push).

## Concept
TikTok-style anonymous poll platform.

Anyone can post a yes/no or multiple-choice question. Other users see it in
their feed, tap an answer, and instantly see live aggregate results — no account
needed, no followers, just pure crowd opinion. Think "Twitter polls meets TikTok
swipe" but completely anonymous.

The user is **snowwarrior1-alt** (GitHub handle). All work has been done in
Claude Code sessions — no external team.

---

## Current Status & Build Summary

**As of the latest session, SurveyTok is fully deployed and live on free infrastructure.**

### What's live

| Piece | Where | Status |
|---|---|---|
| **Backend API** | Render web service `surveytok-backend` → `https://surveytok-backend.onrender.com` | ✅ Live (`/health` → `{ok:true}`) |
| **Database** | Neon Postgres project `surveytok` (us-east-1), direct/non-pooled connection | ✅ Migrated |
| **Web app** | Vercel project `survey-tok-nouc` → `https://survey-tok-nouc.vercel.app` (root dir `web`, auto-deploys on push to `main`) | ✅ Live |
| **Mobile app** | Expo (`app/`) — run locally via Expo Go | ⏸ Not yet pointed at prod URL |

### What was built (chronological)

1. **Web app (`web/`)** — Next.js 15 / App Router, deployed to Vercel:
   - `/` participant feed (TikTok-style scroll-snap, tap to vote, live results)
   - `/admin` password-gated moderation dashboard (stats, all questions, delete)
2. **Backend deployment** — Render free web service (manual, **not** a Blueprint —
   Blueprints now require a credit card). Neon Postgres created for the DB.
3. **Surveyor accounts (`/surveyor`)** — handle + passphrase sign-up/in; create
   questions; per-question results; KPI dashboard; close/reopen/delete own questions.
   Surveyor questions flow into the public feed. New `Surveyor` model; `Question`
   gained nullable `authorId` + `surveyorId`.
4. **Security hardening** (after a full review) — rate limiting, `Secure` cookies,
   CORS allowlist, async-error handling, optional secret separation, stronger
   passphrase floor. See the **Security Hardening** section below.

### Key facts to remember

- **Default branch is `main`** (renamed from `master`).
- **Render has NO auto-deploy** (public-repo deploy) → after pushing backend changes,
  trigger **Manual Deploy → Deploy latest commit** in the Render dashboard. The build
  runs `prisma migrate deploy`, so new migrations apply on deploy.
- **Vercel auto-deploys** the web app on every push to `main`.
- **One secret to rule them all**: `ADMIN_SECRET` is set on **both** Render and Vercel
  and must match. It's the admin password, the server-to-server key, and the
  cookie-signing key (the latter two are optionally separable — see env var docs).
- Free Render instance **cold-starts (~50s)** after inactivity.

### Pending / next ideas

- Point the Expo app's `extra.apiUrl` at the Render URL and test on a device.
- (Optional) categories/tags, trending sort, GitHub-connected auto-deploy on Render.

---

## Origin

SurveyTok was originally built as part of the **"Do I Want To Know"** project
during a period when that project pivoted from a Gmail analytics app to a survey
platform. When "Do I Want To Know" pivoted back to Gmail, the survey platform
code was copied out into this standalone repo (`C:\Users\snoww\SurveyTok`) and
rebranded as SurveyTok.

The sister project (Do I Want To Know / Gmail Wrapped) lives at:
`https://github.com/snowwarrior1-alt/Do-I-Want-to-Know`

---

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile app | React Native + Expo SDK 51 |
| Language | TypeScript throughout |
| Backend | Node.js + Express |
| ORM | Prisma v5 |
| Database | PostgreSQL (Neon.tech free tier) |
| Hosting | Render.com (free web service) |
| Secrets | `.env` file (never committed — gitignored) |

---

## Repository Structure

```
SurveyTok/
├── app/                            React Native / Expo app
│   ├── App.tsx                     4-tab navigator: Feed, Ask, My Questions, Profile
│   ├── app.json                    Expo config (slug: surveytok, bundleId: com.surveytok.app)
│   ├── package.json
│   └── src/
│       ├── api/client.ts           Axios instance + all API call functions + type defs
│       ├── lib/userId.ts           Generates/persists device UUID (expo-secure-store + expo-crypto)
│       ├── components/
│       │   ├── QuestionCard.tsx    Swipeable answer card — renders yes/no or MC buttons, then results
│       │   └── ResultBar.tsx       Animated percentage bar for results display
│       └── screens/
│           ├── FeedScreen.tsx      Unanswered questions feed (excludes user's own)
│           ├── AskScreen.tsx       Post a new question (yes/no or up to 4 MC options)
│           ├── MyQuestionsScreen.tsx  Your posted questions with live vote tallies
│           └── ProfileScreen.tsx   Stats: answered count, asked count, responses received
├── backend/
│   ├── src/
│   │   ├── index.ts                Express app, route mounting
│   │   ├── lib/prisma.ts           Prisma client singleton
│   │   └── routes/
│   │       ├── users.ts            POST /users (upsert), GET /users/:id/stats
│   │       └── questions.ts        Feed, mine, post, answer, results endpoints
│   ├── prisma/
│   │   ├── schema.prisma           Models: User, Question, Answer
│   │   └── migrations/
│   │       └── 20260526013950_init/  PostgreSQL migration
│   └── package.json                Deps: @prisma/client, express, cors, dotenv, prisma
├── render.yaml                     Render deployment config (service: surveytok-backend)
├── PRIVACY_POLICY.md
└── .gitignore
```

---

## How the App Works

1. **App launch** → `getUserId()` reads or creates a UUID in `expo-secure-store`
2. **POST /users** → upserts the user row silently in the background
3. **Feed tab**: `GET /questions/feed?userId=` — returns up to 20 active questions the user hasn't answered yet (excludes their own)
4. User taps an answer on a `QuestionCard` → `POST /questions/:id/answer { userId, value }` → returns live results immediately
5. **Ask tab**: user types a question, picks yes/no or multiple choice (up to 4 options), submits → `POST /questions`
6. **My Questions tab**: `GET /questions/mine?userId=` — shows user's questions with vote counts and result bars
7. **Profile tab**: `GET /users/:id/stats` — shows answered count, asked count, total responses received

---

## Database Schema

```prisma
model User {
  id        String     @id          // device UUID (anonymous)
  createdAt DateTime   @default(now())
  questions Question[]
  answers   Answer[]
}

model Question {
  id         String    @id @default(cuid())
  text       String
  type       String    // "yesno" | "multiplechoice"
  options    String?   // JSON-encoded string[] for MC options
  authorId   String?   // device User (app); null for surveyor questions
  author     User?     @relation(fields: [authorId], references: [id])
  surveyorId String?   // Surveyor (web dashboard); null for app questions
  surveyor   Surveyor? @relation(fields: [surveyorId], references: [id])
  createdAt  DateTime  @default(now())
  status     String    @default("active") // "active" | "closed"
  answers    Answer[]
}

model Answer {
  id         String   @id @default(cuid())
  questionId String
  question   Question @relation(fields: [questionId], references: [id])
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  value      String   // "yes"/"no" for yesno; "0"/"1"/"2"/"3" (index) for MC
  createdAt  DateTime @default(now())
  @@unique([questionId, userId])  // one answer per user per question
}

model Surveyor {
  id           String     @id @default(cuid())
  handle       String     @unique   // lowercased, [a-z0-9_]{3,30}
  passwordHash String                // scrypt "salt:hash"
  createdAt    DateTime   @default(now())
  questions    Question[]
}
```

> Migration `20260530214500_add_surveyors` adds `Surveyor`, makes `Question.authorId`
> nullable, and adds `Question.surveyorId`. A question is authored by **either** a
> device `User` (app) **or** a `Surveyor` (web dashboard).

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/users` | Upsert user by device UUID |
| GET | `/users/:id/stats` | Return answered/asked/responsesReceived counts |
| GET | `/questions/feed?userId=` | Unanswered questions for this user |
| GET | `/questions/mine?userId=` | User's questions with vote tallies |
| POST | `/questions` | `{authorId, text, type, options?}` — create a question |
| POST | `/questions/:id/answer` | `{userId, value}` — submit answer, returns live results |
| GET | `/questions/:id/results` | Aggregate results for a question |
| GET | `/health` | `{ok: true}` |
| GET | `/privacy` | HTML privacy policy page |

### Surveyor endpoints (server-to-server only — require `x-admin-secret`)

The web app's Next.js routes are the only caller; they hold `ADMIN_SECRET` and pass
the surveyor id from a signed session cookie. Never called directly from a browser.

| Method | Path | Description |
|---|---|---|
| POST | `/surveyors/register` | `{handle, password}` — create surveyor (scrypt hash) |
| POST | `/surveyors/login` | `{handle, password}` — verify, returns `{id, handle}` |
| POST | `/surveyors/questions` | `{surveyorId, text, type, options?}` — create a question |
| GET | `/surveyors/:id/questions` | Surveyor's questions with tallied results |
| GET | `/surveyors/:id/stats` | KPIs: totals, avg/question, active, last-7-days |
| PATCH | `/surveyors/:surveyorId/questions/:id` | `{status}` — close/reopen (scoped) |
| DELETE | `/surveyors/:surveyorId/questions/:id` | Delete (scoped to owner) |

---

## Question Types

- **yesno**: two options, values are the strings `"yes"` and `"no"`
- **multiplechoice**: 2–4 options stored as JSON array in `Question.options`; answer values are `"0"`, `"1"`, `"2"`, `"3"` (index)

The `tally()` function in `backend/src/lib/tally.ts` (shared by `questions.ts` and
`surveyors.ts`) handles both types and uses `safeParseOptions()` to guard against
malformed stored JSON.

---

## Environment Variables

### Backend (`.env` in `backend/`)
```
DATABASE_URL=postgresql://...    # Neon.tech connection string
NODE_ENV=production              # Set by Render automatically
PORT=3000                        # Optional, defaults to 3000
ADMIN_SECRET=your_secret_here    # Admin password + default internal/server-to-server secret
WEB_ORIGIN=https://...           # Optional: comma-separated allowed CORS origins
                                 #   (defaults to the prod Vercel URL; *.vercel.app always allowed)
INTERNAL_API_SECRET=...          # Optional: dedicated server-to-server secret for /surveyors
                                 #   (falls back to ADMIN_SECRET). Must match Vercel if set.
SERVICE_RETIRED=1                # Optional kill-switch (ST1). Set to 1/true to close the
                                 #   auth + write surface: every route except /health and
                                 #   /privacy returns 503. Unset/anything-else = normal.
```

### Web (`web/.env.local`)
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
ADMIN_SECRET=your_secret_here    # Same value as backend — server-side only on Vercel
INTERNAL_API_SECRET=...          # Optional: must equal the backend's if set
SESSION_SECRET=...               # Optional: dedicated surveyor-cookie signing key
                                 #   (falls back to ADMIN_SECRET)
```

> The three secrets all default to `ADMIN_SECRET` when unset, so the app works with
> just `ADMIN_SECRET` configured. Setting `INTERNAL_API_SECRET` / `SESSION_SECRET`
> later lets you separate the admin password, the server-to-server key, and the
> cookie-signing key — but `INTERNAL_API_SECRET` must match on **both** Render and Vercel.

### App (`app/app.json` → `extra.apiUrl`)
Change `"apiUrl": "http://localhost:3000"` to your Render URL after deploying.
The value is read in `app/src/api/client.ts` via `Constants.expoConfig.extra.apiUrl`.

---

## Running Locally

```bash
# Backend
cd backend
npm install --ignore-scripts
# create backend/.env with DATABASE_URL
npm run dev

# App (separate terminal)
cd app
npm install --ignore-scripts
# Update app.json extra.apiUrl to http://<your-local-ip>:3000
npm start
# Scan QR with Expo Go on your phone (same Wi-Fi network)
```

---

## Deployment

- **Database**: Neon.tech (free PostgreSQL) — separate Neon project `surveytok`
  (project id `late-shadow-55947917`, region AWS us-east-1, Postgres 17).
  - `DATABASE_URL` uses the **direct (non-pooled)** endpoint — pooled/PgBouncer is
    unreliable for `prisma migrate deploy`, which runs on every boot.
- **Backend**: ✅ **LIVE** at `https://surveytok-backend.onrender.com`
  - Deployed as a **manual free Web Service** (NOT a Blueprint). Render now requires a
    credit card on file to apply a `render.yaml` Blueprint; a manual free Web Service
    does not, so we configured it by hand. `render.yaml` is kept for reference only.
  - Source: **public Git repo URL** (no GitHub OAuth), branch `main`, Root Directory `backend`, region Oregon.
  - Build command: `npm install --include=dev && npm run db:generate && npm run build`
    (the `--include=dev` is required: `NODE_ENV=production` would otherwise make npm
    skip TypeScript, breaking `tsc`).
  - Start command: `npm run start:prod` (runs `prisma migrate deploy` then the server).
  - Env vars set in the Render dashboard: `DATABASE_URL`, `ADMIN_SECRET`, `NODE_ENV=production`.
  - Free instance spins down after inactivity → first request can take ~50s (cold start).
  - Note: public-repo deploys have **no auto-deploy**; redeploy via "Manual Deploy" in Render
    (or connect the GitHub account later to enable push-to-deploy).
- **App**: Run locally via Expo Go; update `extra.apiUrl` in `app.json` to the Render URL

---

## Key Implementation Decisions

- **Anonymous identity**: device UUID via `expo-crypto.randomUUID()` + `expo-secure-store`, no login required
- **`uuid` package avoided**: it calls `crypto.getRandomValues()` which isn't available in the React Native JS runtime — `expo-crypto` works correctly
- **Live results on answer**: the answer endpoint returns aggregate results immediately so users see the crowd's opinion right after voting
- **Feed deduplication**: feed query excludes questions the user has already answered AND their own questions
- **Options stored as JSON string**: Prisma/PostgreSQL doesn't have a native array type at this schema level; `options` is a `String?` containing `JSON.stringify(string[])`, always handled via `safeParseOptions()`
- **`return void res.json()`**: TypeScript strict mode pattern for Express async handlers — prevents type errors from returned Response objects

---

## Security Hardening

A security review was run on the full stack; these mitigations are in place:

- **Password hashing**: scrypt + per-user salt + `timingSafeEqual` (`lib/password.ts`)
- **Session integrity**: surveyor cookie is HMAC-signed (`lib/surveyorSession.ts`),
  `httpOnly`, `SameSite=Strict`, and `Secure` in production
- **Rate limiting** (`backend/src/lib/rateLimit.ts`, needs `app.set('trust proxy', 1)`):
  - surveyor `/login` — 10 **failed** attempts per handle / 15 min
  - surveyor `/register` — 30 / hour
  - public `POST /questions` and `/answer` — 40 / min per client IP
- **CORS allowlist**: `WEB_ORIGIN` + `*.vercel.app` + no-origin clients (Expo app,
  server-to-server); everything else rejected
- **Secret separation** (optional, all fall back to `ADMIN_SECRET`): `INTERNAL_API_SECRET`
  (server-to-server) and `SESSION_SECRET` (cookie signing)
- **Robustness**: `express-async-errors` + a centralized error handler so async route
  throws return a clean 500 instead of hanging; internals never leaked to clients
- **Known/accepted**: anonymous voting is spoofable by generating device IDs (inherent
  to the no-account feed — rate limiting caps volume); handle enumeration on register

Inherently safe by stack: Prisma parameterizes all queries (no SQLi); React escapes
output (no XSS — no `dangerouslySetInnerHTML`); secrets are server-side only.

---

## Pending / Next Steps

- [x] Deploy backend to Render with a fresh Neon database — **live at `https://surveytok-backend.onrender.com`**
- [x] Surveyor accounts + dashboard (`/surveyor`) — backend + web built (needs deploy)
- [ ] **Redeploy backend on Render** ("Manual Deploy") so the `add_surveyors` migration
      runs and the `/surveyors` routes go live
- [ ] Deploy `web/` to Vercel (Root Directory `web`; set `NEXT_PUBLIC_API_URL=https://surveytok-backend.onrender.com` + `ADMIN_SECRET` matching Render)
- [ ] Update `app/app.json` `extra.apiUrl` to `https://surveytok-backend.onrender.com`
- [ ] Test on a real device via Expo Go
- [ ] (Optional) Add question categories / tags
- [ ] (Optional) Add "trending" sort to feed

## Web App (`web/`)

Next.js 15 app with App Router. Three surfaces:
- `/` — participant feed: scroll-snap TikTok-style cards, tap to vote, live results.
  A fixed "Sign in as Surveyor →" link (top-right) routes to `/surveyor`.
- `/admin` — password-gated dashboard: stats, all questions with vote tallies, delete
- `/surveyor` — surveyor accounts: sign in / sign up (handle + passphrase), create
  questions, view per-question results, KPIs, and close/delete their own questions

### Auth design
Admin password entered in browser → POST `/api/admin/auth` → checked server-side against `ADMIN_SECRET` env var → httpOnly cookie set. Subsequent admin data fetches go through Next.js API routes that read the cookie and inject the real `ADMIN_SECRET` into backend calls. The secret never touches the browser.

### Surveyor accounts
- Each surveyor has a unique `handle` + scrypt-hashed passphrase (stored in `Surveyor`).
- Login/register POST to `/api/surveyor/auth`, which proxies to the backend (with
  `x-admin-secret`). On success it sets an **HMAC-signed** httpOnly cookie
  (`surveyor_session`) carrying `{id, handle}` — signed with `ADMIN_SECRET` via
  `web/lib/surveyorSession.ts` so it can't be forged. 7-day expiry.
- All `/api/surveyor/*` data routes verify the signed cookie, extract the surveyor id,
  and call the backend with `x-admin-secret`, scoping every query to that surveyor.
- Security model: client↔Vercel = signed cookie; Vercel↔backend = shared `ADMIN_SECRET`;
  backend scopes data by surveyorId. `ADMIN_SECRET` doubles as the cookie-signing key
  (no extra env var to manage).

### Deploying to Vercel
1. Connect the `SurveyTok` GitHub repo in Vercel
2. Set **Root Directory** to `web`
3. Add env vars: `NEXT_PUBLIC_API_URL` (Render URL) and `ADMIN_SECRET` (same value as backend)

---

## Important Notes

- Use `npm.cmd` instead of `npm` in PowerShell (avoids `.ps1` execution policy errors)
- Use `npm install --ignore-scripts` (avoids native build failures with Expo Go)
- `prisma` package is in `dependencies` (not devDependencies) because `start:prod` invokes it at runtime
- Git branch: `main` (default branch on GitHub)
- Git user: `snowwarrior1-alt` / `snowwarrior1-alt@users.noreply.github.com`
