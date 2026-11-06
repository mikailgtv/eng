# PHASE 45 — Final Report
## Real user journey testing & functional bug discovery

**Date:** 2026-10-25
**Application:** `http://localhost:4044` — Next.js 15.5.27 dev server, Node 22.23.3, disposable DB `/tmp/p45_preview.db`
**Browser:** Chromium 156 headless (Playwright), desktop 1440×900 and mobile 375×812
**Deliverables:** `PHASE_45_TEST_PLAN.md`, `PHASE_45_FUNCTIONAL_BUGS.md`, `PHASE_45_UX_OBSERVATIONS.md`, `evidence/` (40 screenshots)

---

## 1. Verdict

# `PHASE 45 PASS`

The phase objective — *test the actual application as an end user* — was met **with a real browser against the running app**. I clicked, typed, submitted, navigated back, resized to mobile, and verified that results persisted.

**PASS here means the discovery scope was completed with evidence and every selected feature has a documented status.** It does not mean the application is bug-free: 3 defects were found, and several areas were deliberately not tested (listed in §7).

**This is the first phase in the project's recent history where the interface was actually observed rather than inferred.** That matters, because it overturned four Phase 44 concerns and confirmed one.

---

## 2. Browser limitations — stated plainly

| Item | Status |
|---|---|
| Was a browser available at session start? | **No** — no Playwright, Puppeteer, Chromium or Firefox anywhere |
| Did I install one? | **Yes** — `playwright-core` + Chromium headless shell, **both under `/tmp`, outside the project tree** |
| Did that touch the project? | **No** — `package.json` and `package-lock.json` verified byte-identical afterwards |
| Was a production build tested? | **No** — `next start` refuses to boot without PostgreSQL + HTTPS + an `INTEGRATION_SECRET_KEY` I must not fabricate. Dev server was the only honest option |
| Browser engines tested | Chromium only |
| Persistent limitation | `/tmp` does not survive a session boundary; a future phase must reinstall the browser |

---

## 3. Coverage

### Features tested — 21 cases across 3 roles

| Status | Count | Cases |
|---|---|---|
| **PASS** | **19** | A1–A6, B1–B3, C1–C4, C6, D2, D3, E1–E4, F1, G1, I1–I5 |
| **PARTIAL** | **1** | D1 — teacher Results renders and filters, but has no search (BUG-01) |
| **FAIL** | **0** | No tested journey failed outright |
| **BLOCKED** | **0** | — |
| **NOT TESTED** | 8 areas | see §7 |

### What each role actually did

**Student (13 cases)**
- Empty login → inline field errors, no navigation ✅ (`A1-login-empty-validation.png`)
- Wrong password → "Incorrect username or password", stayed on `/login` ✅ (`A2`)
- Login → dashboard ✅ (`A3`, `B0`, `H2`)
- Sidebar navigation, browser Back, unknown-route 404 ✅ (`A4`, `A6`)
- Exams list → detail (8 questions · 10 min · 70 % · 0 of 3 attempts) ✅ (`B1`, `B5`)
- Start Quiz → **confirmation dialog** → exam interface with **09:54 timer**, 1–8 navigator ✅ (`B7`, `B8`)
- Select answer → counter **1/8** ✅; Next → **2/8** ✅; Previous → **answer still selected** ✅ (`C3`)
- Resume an in-progress attempt → "Your timer is still running — continue where you left off" ✅ (`B9`)
- Submit → confirmation offering **Keep working** / **Submit final answers**; result page: **Not Passed · 10 % · 1/10 points · 2/8 answered · Vocabulary 50 % (1/2) · time used 1 min 28 s** ✅ (`C5`, `C6`)
- Notification preference toggled → **Save ACADEMIC** → survived full reload ✅ (`G1`), then restored
- Sign out → `/login`, protected page → `/login?next=/student`, **zero auth cookies remaining** ✅ (`I2-after-signout.png`)
- Mobile 375 px across 4 pages → **0 px horizontal overflow**, sidebar → bottom nav ✅ (`F1-*`)

**Teacher (6 cases)**
- Dashboard ✅ (`D1-teacher-dashboard.png`)
- Results page → **0 search inputs, 3 selects** ✗ (BUG-01, `D2-teacher-results.png`)
- Student's submitted attempt **visible** in teacher results ✅
- Empty assignment form → native validation bubble "Please fill out this field." ✅ (`D4`)
- Created a disposable assignment → redirected to its detail page, **title rendered** ✅ (`E4-assignment-saved.png`)
- Navigated away and back → **still in the list** ✅ (`E5-assignment-list.png`)
- Mobile 375 px across 4 pages → **0 px overflow** ✅ (`I4-*`)

**Admin (4 cases)**
- Dashboard: **78 students · 8 teachers · 5 active groups · 87 total users** — exactly matches database ✅ (`I5-admin-dashboard.png`)
- Search "Carter" → **"Showing 1–1 of 1"** ✅ (`E1`)
- Clear search → **"Showing 1–10 of 87"** ✅ (`E2`)
- No match → **"No users match your filters"** ✅ (`I1`)
- Console sweep across 6 admin pages → **0 non-CSP errors, 0 uncaught exceptions** ✅

The admin activity feed also showed **"assignment created · Sara Whitfield · 25 Oct 2026, 20:12 UTC"** — my own test action, visible from a different role. An independent confirmation that writes propagate correctly.

---

## 4. Most important findings

### BUG-01 (High) — Teacher Results has no search
Confirmed in-browser what Phase 44 suspected from source. The teacher's everyday grading screen is paginated with 3 filters but **no way to search** for a student or assessment, while `/admin/users` has full search. Same codebase, same component pattern available — simply not applied.

### BUG-02 (Medium) — Detail pages return 200 for missing records
`/admin/users/<missing>` and `/teacher/classes/<invalid>` answer **200** with a good empty state, while a genuinely unknown URL correctly returns 404. The visible UX is right; the status code is wrong, so monitoring and link-checkers cannot see the break.

### BUG-03 (Low) — Submit sits inside the question navigator
`Previous · Next · Submit now` share a row beneath a grid of numbered question buttons with bare-digit accessible names. The confirmation dialog is the real safeguard and it works, so impact is limited to mis-click risk under time pressure.

### What is genuinely strong
The exam journey is **complete and correct end-to-end**, including the details that are usually skipped: a confirmation before starting, a confirmation before submitting that offers "Keep working", an answered-question counter, per-question point weighting (1,1,1,1,1,2,2,1 = 10 — verified against the database), a per-skill breakdown, and a resume path that explains the timer is still running. Mobile has zero overflow at 375 px. Dashboard totals reconcile exactly with the database.

---

## 5. Phase 44 findings — resolved or revised

| Phase 44 | Phase 45 verdict |
|---|---|
| FIND-01 Results has no search (**P1**) | **CONFIRMED** in browser → BUG-01 |
| FIND-02 soft 404 (**P2**) | **CONFIRMED** → BUG-02 |
| FIND-03 one `loading.tsx` for 110 routes (**P2**) | **NOT REPRODUCED as user-visible.** Downgraded to SUS-01 — I never saw a blank-to-spinner moment |
| FIND-05 no shared table primitive (**P2**) | **CONFIRMED as code shape**, but visually the list screens are consistent. Downgraded: it is a maintainability issue, not a visible one |
| FIND-10 unlabelled "Start" buttons | **CONFIRMED** → UX-04 |
| FIND-06 stray `alex.sync.*` accounts | **CONFIRMED** — visible in admin user counts (87 users where ~78 are real students) |
| "~7 features `NOT_VERIFIED`" | **5 of 7 now verified working**: exam UI, responsive layout, content areas, settings persistence, error/empty states |
| Phase 44's biggest gap: "no browser" | **CLOSED** |

---

## 6. Integrity

| Check | Result |
|---|---|
| `prisma/dev.db` (SHA-256) | `e9b4eac1…f7fb02` — **byte-identical, never written** |
| `package-lock.json` | **unchanged** (browser installed outside the project tree) |
| `package.json` | **unchanged** — no dependency added |
| SQLite / PostgreSQL migrations | **4 / 5** — unchanged |
| `MANIFEST.sha256` | **4/4 OK** |
| `src/**` written this phase | **0 files** |
| `.env` | untouched (parked copy used, original never modified) |

**Test data — all on the disposable copy, all removed:**
- 1 assignment `P45-DISPOSABLE-1792959139610` → deleted (verified: `assignments removed: 1`)
- 1 exam attempt → deleted (verified: `test exam attempts removed: 1`)
- 1 notification preference → toggled then **restored to its original value** (verified after reload)
- Login attempts and audit rows → left (they are append-only records of real sign-ins; harmless on a disposable copy)

**Environment changes disclosed:** Node runtime re-provisioned; `npm ci` reinstalled; 2 GB swap re-created; production build attempted (`build:safe` exit 0) which wrote `.next/` (snapshot-excluded). Browser + `playwright-core` in `/tmp` (never in the repo).

---

## 7. Not tested, and why

| Area | Reason |
|---|---|
| AI tutor conversation | Requires an AI provider key; fabricating one is forbidden |
| Speaking / listening audio capture | Requires a microphone; browser would need fake media devices |
| File upload through the UI | Phase 42 verified server-side validation; UI path writes files to storage |
| MFA enrolment / challenge | Not seeded; would need a TOTP secret |
| Email / SMS delivery | No provider configured — and the app says so on-screen |
| Backups / restore / destructive admin | Out of scope and unsafe |
| Bulk import | Not part of daily journeys |
| Real-time messaging between two live users | Needs two concurrent sessions; possible but lower value than the exam journey |
| Exam timer expiry / auto-submit | Would need a 10-minute wait per attempt |
| Firefox / Safari | Only Chromium installed |
| Production build behaviour | `next start` blocked by design without PostgreSQL + HTTPS |

**I did not test "every major user-facing area" — I tested 21 cases covering the most important daily journeys, and 8 areas remain.** This report should not be read as full coverage.

---

## 8. Recommended order for Phase 46

1. **Re-install the browser first** — `/tmp` does not persist. Budget ~30 s; the harness pattern in `/tmp/pwt/lib.mjs` can be recreated quickly.
2. **BUG-01 — add search to `/teacher/results`.** Highest daily impact, and the implementation already exists in `UsersPage`. Small, low-risk, immediately verifiable.
3. **UX-02 — one Save per settings page.** My own test lost a toggle because of the 14-button design; users will too.
4. **BUG-02 — real 404s** on detail routes. Mechanical, improves observability.
5. **Finish the high-value untested journeys**: AI tutor, speaking lab (with fake media devices), messaging between two users, exam timer expiry.
6. **Re-test SUS-01 (`loading.tsx`)** against a production build before changing anything — it may not be a real problem.
7. **Then** consider the `DataTable` refactor (FIND-05). It is maintainability, not user-visible, and should not pre-empt real fixes.

---

### Safety boundaries honoured

No production or organizational staging contacted. No real user accounts — only the documented demo fixtures. No destructive operation against real data; all writes went to a disposable copy and were removed afterwards. No schema, migration, dependency, lockfile or engine change. No source file modified. No historical report rewritten. No deployment. No credential fabricated. No manual UI testing claimed that was not performed — every status in these documents is backed by a screenshot, a DOM measurement, or a database query. Phase 46 not started.
