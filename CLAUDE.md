# SurveyTok — Claude Context

## Concept
TikTok-style anonymous poll platform.

Anyone can post a yes/no or multiple-choice question. Other users see it in
their feed, tap an answer, and instantly see live aggregate results — no account
needed, no followers, just pure crowd opinion. Think "Twitter polls meets TikTok
swipe" but completely anonymous.

The user is **snowwarrior1-alt** (GitHub handle). All work has been done in
Claude Code sessions — no external team.

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
  id        String   @id @default(cuid())
  text      String
  type      String   // "yesno" | "multiplechoice"
  options   String?  // JSON-encoded string[] for MC options
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  createdAt DateTime @default(now())
  status    String   @default("active")
  answers   Answer[]
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
```

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

---

## Question Types

- **yesno**: two options, values are the strings `"yes"` and `"no"`
- **multiplechoice**: 2–4 options stored as JSON array in `Question.options`; answer values are `"0"`, `"1"`, `"2"`, `"3"` (index)

The `tally()` function in `questions.ts` handles both types and uses `safeParseOptions()` to guard against malformed stored JSON.

---

## Environment Variables

### Backend (`.env` in `backend/`)
```
DATABASE_URL=postgresql://...    # Neon.tech connection string
NODE_ENV=production              # Set by Render automatically
PORT=3000                        # Optional, defaults to 3000
```

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

- **Database**: Neon.tech (free PostgreSQL) — separate Neon project from DIWTKN
- **Backend**: Render.com free web service — connect this GitHub repo, uses `render.yaml`
  - Set env var: `DATABASE_URL` (from Neon)
  - `start:prod` script runs `prisma migrate deploy` before server start
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

## Pending / Next Steps

- [ ] Deploy backend to Render with a fresh Neon database
- [ ] Update `app/app.json` `extra.apiUrl` to the Render URL
- [ ] Test on a real device via Expo Go
- [ ] (Optional) Add question categories / tags
- [ ] (Optional) Add "trending" sort to feed
- [ ] (Optional) Add question expiry / closing after N answers
- [ ] (Optional) Build a web version

---

## Important Notes

- Use `npm.cmd` instead of `npm` in PowerShell (avoids `.ps1` execution policy errors)
- Use `npm install --ignore-scripts` (avoids native build failures with Expo Go)
- `prisma` package is in `dependencies` (not devDependencies) because `start:prod` invokes it at runtime
- Git branch: `master` (initialized locally — rename to `main` if preferred)
- Git user: `snowwarrior1-alt` / `snowwarrior1-alt@users.noreply.github.com`
