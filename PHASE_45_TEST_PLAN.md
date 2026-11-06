# PHASE 45 — Test Plan
## Real user journey testing · EnglishBridge LMS

**Date:** 2026-10-25
**Application under test:** `http://localhost:4044` — Next.js 15.5.27 **dev server**, disposable database `/tmp/p45_preview.db` (byte-copy of `prisma/dev.db`)
**Browser:** Chromium 156.0.8078.4 (Playwright headless shell), 1440×900 desktop and 375×812 mobile viewports
**Screenshots:** `/home/user/evidence/` (40 PNGs)

---

## 1. How this phase differs from Phase 44

Phase 44 could not see the application. It probed 110 routes over HTTP and read the rendered HTML. This phase **drives the real interface in a real browser**: clicking, typing, submitting, navigating back, resizing, and reading what appears on screen.

The difference is not cosmetic. Several Phase 44 conclusions changed:

| Phase 44 said | Phase 45 found |
|---|---|
| Exam-taking UI `NOT_VERIFIED` | **Fully working** — timer, question navigator, answer persistence, submit → graded result |
| Responsive layout `NOT_VERIFIED` | **Working** — zero horizontal overflow at 375 px across 8 pages, sidebar replaced by bottom nav |
| `loading.tsx` concern (FIND-03) | Not reproducible as a user-visible problem in this environment (see limitations) |
| Sub-questions about `Loading…` | Confirmed as the client-hydration placeholder; page becomes fully interactive |
| Preferences persistence unknown | **Working** — each section has its own Save, and state survives reload |

---

## 2. Browser acquisition (disclosed)

No browser existed in the environment. Phase 44's report named obtaining one as step 1, and the Phase 45 objective is real interaction, so I installed one:

1. `playwright-core` installed to **`/tmp/pwt`** — *outside the project tree*, so `package.json` and `package-lock.json` were never touched (verified unchanged).
2. Chromium headless shell downloaded to **`/tmp/pw-browsers`** (681 MB, outside the repo — deliberately, because the workspace snapshot cap is ~128 MB).
3. System libraries: `playwright install --with-deps` reported success but `ldconfig` still shows libnss3 etc. missing — the headless shell is statically linked enough to run regardless. Verified by launching and reading real DOM content.

The browser lives in `/tmp` and will not survive a session boundary. No production or staging system was contacted.

---

## 3. Features selected and why

Selection was driven by Phase 44's inventory and by what a user does **daily**:

| Area | Why selected | Phase 44 status |
|---|---|---|
| Login / validation / errors | Gate to everything | working (server-side) |
| Student exam journey | Highest-stakes workflow; Phase 44's biggest `NOT_VERIFIED` | not verified |
| Teacher assignment creation | Core daily teacher task | form renders only |
| Admin user search & pagination | Highest-volume data surface | working |
| Notification preferences | Only "change a setting and verify persistence" candidate | unknown |
| Logout / session clearing | Security-adjacent, pure UI | unknown |
| Mobile layouts | Phase 44's largest blind spot | not verified |
| Empty states | Explicitly requested category | partially known |
| Console / network errors | Only visible in a browser | never observed |

**Deliberately excluded:** payment, AI tutor conversation (needs a provider key I must not fabricate), speaking/audio capture (needs a microphone), file upload (Phase 42 already verified server-side validation; the UI path would write files), destructive admin actions (backups/restore, user deletion, role changes) — none are safe or necessary for journey testing.

---

## 4. Test cases executed

### Batch A — Authentication & navigation
| ID | Case |
|---|---|
| A1 | Submit empty login form → inline field validation, no navigation |
| A2 | Wrong password → error message, stays on `/login` |
| A3 | Correct credentials → lands on role dashboard |
| A4 | Sidebar link navigation → correct page loads |
| A5 | Browser Back → returns to previous page |
| A6 | Unknown route → custom not-found screen |

### Batch B/C — Student exam journey (8 questions, 10 min, 70 % pass)
| ID | Case |
|---|---|
| B1 | Exams list renders with course data |
| B2 | Exam detail page shows title, 8 questions, 10 min, 70 %, attempts used |
| B3 | Start Quiz → confirmation dialog → exam interface loads |
| C1 | Selecting an option increments the "Answered n/8" counter |
| C2 | Next advances to question 2 |
| C3 | Previous returns to question 1 **with the answer still selected** |
| C4 | "Resume quiz" appears for an in-progress attempt and resumes it |
| C5 | Submit now → confirmation with destructive-action safeguard |
| C6 | Submit → graded result page with score, pass/fail, skill breakdown |

### Batch D/E — Teacher & admin
| ID | Case |
|---|---|
| D1 | `/teacher/results` — is there a search input? (Phase 44 FIND-01) |
| D2 | Student's submitted attempt visible to the teacher |
| D3 | Empty assignment form → validation |
| E1 | Admin user search narrows the list |
| E2 | Clearing search restores the full list |
| E3 | Create an assignment (disposable, `P45-DISPOSABLE-` prefix) |
| E4 | New assignment persists in the list after navigating away |

### Batch F/I — Layout, settings, states
| ID | Case |
|---|---|
| F1 | 375 px viewport — horizontal overflow on 4 student pages |
| I4 | 375 px viewport — horizontal overflow on 4 teacher pages |
| F2 | Mobile nav structure (bottom bar vs sidebar) |
| G1 | Toggle a notification preference, press its section Save, reload, verify persistence |
| I1 | Search with no matches → empty-state copy |
| I2/I3 | Sign out → returns to `/login`; protected page blocked; cookies cleared |
| I5 | Console error sweep across 6 admin pages |
| — | Admin dashboard figures vs database counts |

---

## 5. Testing limitations — read before interpreting results

1. **The application runs on `next dev`, not `next start`.** I attempted a production build (`build:safe` exit 0) and tried to serve it; it **refuses to start** because production mode demands PostgreSQL, HTTPS, `INTEGRATION_SECRET_KEY` and `NEXT_PUBLIC_DEMO_HINTS=false` (`src/lib/server-env.ts:68-77`). Inventing those values is forbidden, so dev mode was the only honest option. Consequences:
   - route transitions are slower than production;
   - a **Next.js dev overlay** element intercepts pointer events (worked around, does not exist in production);
   - **dev-only CSP `unsafe-eval` violations** appear in the console (the CSP is report-only and dev tooling uses `eval`); these are **not** production findings.

2. **The dev server restarted twice** during the session ("Server is approaching the used memory threshold") on this 1.9 GB host. One test run aborted mid-flight and was re-run. Recorded as an environment limit, not a defect.

3. **Single browser engine** (Chromium). Firefox/Safari behaviour untested.

4. **Seeded demo data only.** No real user data was touched. All writes went to the disposable copy.

5. **Not tested at all:** payment, AI tutor conversation, microphone/speaking, file upload UI, email/SMS delivery, MFA enrolment, backups/restore, bulk imports, real-time messaging between two live users.

6. **Timing-sensitive behaviour** (the exam timer counting down, session expiry) was observed as a value (09:54) but not watched to expiry.
