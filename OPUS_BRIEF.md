# SurveyTok — Product / Design / Engineering Brief

_Written 2026-07-03 by a Claude portfolio review session. Audience: a future Opus
session. SurveyTok is live but dormant (a pivot spinoff of Do I Want To Know).
Recommendation: **keep it parked** unless the user decides to revive it — the
portfolio's active apps have better returns. If reviving, do the items below in
order. Verify current state first._

---

## 0. Status ledger (2026-07-05) + how to pick up

**Status: PARKED.** Live but dormant; nothing from this brief is built. Do not invest here unless the user explicitly revives it.
**If revived, in order** — first fold the Express API into the Next.js app on Vercel (§3 — the Render cold start breaks respondent flows), then §5 S4 statistical-honesty layer (cheap, improves everything), S1 question types, S2 branching micro-surveys ⭐ (the research-instrument unlock).
**One secret note** — `ADMIN_SECRET` currently does triple duty (admin pw + server key + cookie key); separate them on revival.

## 1. Product roadmap (PM) — only if revived

The core loop (scroll → tap → instant results) is strong but has no
distribution. Revival = give individual questions a life outside the feed.

1. **P1 — Shareable question links + OG cards.** `/q/[id]` pages with the
   question + live results and proper OpenGraph images (Vercel OG image
   generation). A poll shared into a group chat is the entire growth model.
2. **P1 — Categories/tags + trending sort** (already in the repo's own "next
   ideas"). Trending = votes-per-hour decay score, computed in the feed query.
3. **P2 — Embed widget** — an iframe/script snippet so a poll can sit in a blog
   post. Same `/q/[id]` surface, `frame-ancestors` allowlist opened for it.
4. **P2 — Point the Expo app at prod** (documented pending item) or delete the
   `app/` folder and commit to web-only — carrying a dead client has cost.

## 2. Design audit — one note
The scroll-snap feed is the identity; keep it. Before any revival, refresh the
results reveal (animate the bars; show vote counts after voting only) — the
"instant results" moment is the product's dopamine hit and should feel great.

## 3. Engineering audit
- Hardening already done (rate limiting, Secure cookies, CORS allowlist,
  passphrase floor). Two flags:
  1. **`ADMIN_SECRET` triple duty** (admin password + server-to-server key +
     cookie-signing key) — documented as separable; separate them if reviving.
  2. **Render free tier cold start (~50s)** kills the "instant" feel — first
     interaction of a session hits it. If reviving, move the API into the
     Next.js app on Vercel (the DB is tiny; no long-running work like DIWTK's
     sync) and retire the Render service entirely — simpler and faster.
- Render has **no auto-deploy** (manual "Deploy latest commit") — a recurring
  operational trap noted in CLAUDE.md; folding the API into Vercel removes it.

## 4. Surprise & delight (only if revived)

### D1 — Prediction mode ⭐
Before your vote is counted, guess what the majority said; after voting, reveal
whether you read the room. Track a running "Hive Mind score" (% correct,
localStorage) with a streak. This is the single mechanic that would make the
feed addictive — every poll becomes two questions: *what do I think* and *do I
know what everyone else thinks*.

### D2 — Hot-take detector
After voting, if you're in a small minority (<20%), a badge: "🌶️ Hot take —
you and 12% of voters." People screenshot being contrarian. Pure presentation
over existing aggregates.

### D3 — Daily poll streak
One featured "Question of the day" (admin-pinned or top-trending); answering
it maintains a visible streak. Cheap ritual mechanic that pairs with D1's
score.

## 5. Depth roadmap — surveyor control & analytics (2026-07-05)

_Direction change from the user: rather than reviving SurveyTok for scale,
deepen it for the SURVEYOR — make it a lightweight question-research tool.
These change the revival calculus in section 1: with these, the product is
"ask real questions, get honest reads," not a feed._

### S1 — Question types (M) ⭐
Beyond yes/no + multiple choice: **slider (0-100)**, **ranked choice**
(drag to order; report first-choice + Borda), **image A/B**. Schema:
`Question.type` + JSON options/answers columns; the feed renderer switches
per type. Each type unlocks a class of questions the current binary cannot
ask.

### S2 — Micro-survey chains with branching (L) ⭐ (the flexible-study ask)
2-5 chained questions with branch-on-answer ("if No → ask why"). Model:
`Survey` (ordered question ids + branch rules JSON), one swipe-flow for
respondents, per-step funnel for the surveyor. This is the biggest lift and
the biggest unlock — SurveyTok becomes a micro-research instrument.

### S3 — Response-quality controls (M)
Per-question: open/close schedule, quota cap (auto-close at n), private
link-only mode (off-feed), duplicate-vote hardening beyond cookies
(localStorage token + IP hash best-effort — document honestly that
anonymous polling cannot be fully Sybil-proof).

### S4 — Statistical honesty layer (S)
On every result: n, Wilson 95% interval on each proportion ("64% ± 9"),
and a "too early to call" badge when intervals overlap. Small pure module +
tests; it is also the surveyor education feature.

### S5 — Wording A/B (M, the sleeper feature)
Duplicate a question with variant wording; respondents randomly get one;
results compare distributions side by side with the S4 intervals. Question-
wording effects are the most famous survey phenomenon — letting amateurs
SEE them is genuinely novel for a free tool.

### S6 — Anonymous audience slices (M, tentative — privacy-careful)
Optional one-time self-declared coarse attributes (age band / region),
stored client-side, attached to votes as non-identifying dimensions;
results filterable by slice with minimum-cell-size suppression (hide any
slice with n<10). No accounts, no PII, suppression non-negotiable.

### S7 — Surveyor analytics + export (S)
Votes-over-time sparkline, completion funnel (S2), CSV export per question
(formula-injection-guarded, BookTracker pattern).

### Sequencing: S4 first (cheap, improves everything), S1, S3+S7, then S2;
S5/S6 after the core proves out. Fold the API into Vercel (section 3)
before any of this — cold starts break respondent flows.

---

## Security & code-quality audit (2026-07-12, Fable portfolio pass)

_The finding was operational; the sensitive part lives in the private doc
`C:\Users\snoww\PORTFOLIO_SECURITY_AUDIT.md`._

**DECISION (2026-07-12): keep SurveyTok LIVE and usable** (owner's call — not
decommissioning). ST1's residual risk is now managed by hardening rather than teardown.
Because it's a maintained live service, treat it like the other live apps: watch deps,
keep `ADMIN_SECRET` strong, and don't let it rot.

**ST1 reinforcement — ✅ SHIPPED (2026-07-12).** Hardened the live backend:
- **helmet** security headers (HSTS, `X-Content-Type-Options`, `frame-ancestors 'none'`,
  `Referrer-Policy`, a CSP that still permits the `/privacy` page's inline styles);
  CORP `cross-origin` for the Vercel + Expo clients. Verified live via header inspection.
- **`express.json` capped at 16kb** (was unbounded → memory-DoS vector).
- **Shared `validateQuestionInput`/`validateAnswerValue`** (`lib/questionInput.ts`): the
  public app path used to store `text`/`options` raw + unbounded while the surveyor path
  validated — now both enforce one rule set (type allow-list, 280-char text, 2–4 options,
  per-option + answer-value caps).
- **Constant-time `x-admin-secret` compare** (`lib/secrets.ts`) replacing plain `!==`.
- **`npm audit` = 0 vulns** (backend) — no dep bumps needed this pass.
- Fixed the stale `/privacy` page (was branded "Do I Want To Know" / `diwtkn.com`).
  ⚠️ **Contact email is a placeholder** (`privacy@surveytok.app`) — point it at a real
  inbox you monitor (or your preferred address).
- **First backend tests** (vitest, 15) for the new pure logic + the retirement guard.
- Deploy: **Render Manual Deploy** (public-repo repo has no auto-deploy). No DB migration.

**Still available if you change your mind:** the `SERVICE_RETIRED=1` kill-switch
(`lib/retirement.ts`) closes the surface (503 everything but `/health`+`/privacy`)
without deleting anything; and a full decommission runbook is in git history / the
private audit doc. Neither is active — the app stays fully live per the decision above.

**Related housekeeping (still open):** DIWTK's OWN `/privacy` is stale SurveyTok-era
text — tracked in the DIWTK brief, unaffected by this.
