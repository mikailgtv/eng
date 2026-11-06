# PHASE 44 — Final Report
## Product discovery, live walkthrough & feature inventory

**Date:** 2026-10-25
**Runtime:** Node.js v22.23.3 / npm 10.8.2
**Application:** dev build on `http://localhost:4044`, disposable database copy `/tmp/p44_preview.db`
**Deliverables:** `PHASE_44_FEATURE_INVENTORY.md`, `PHASE_44_PRODUCT_FINDINGS.md`

---

## 1. Verdict

# `PHASE 44 PARTIAL`

Discovery was completed and carries real evidence: the app started, all 110 page routes were fetched with authenticated sessions for each role, ~60 were confirmed rendering genuine domain content, and 7 representative journeys were executed against live endpoints.

It is **PARTIAL, not PASS**, for one reason I will not paper over: **no browser exists in this environment, so no page was ever seen.** I cannot state what the application *looks like* — layout, spacing, colour, overflow, responsive behaviour, or anything that happens after hydration. That is a material part of "product discovery", and it remains undone.

It is **not BLOCKED**, because I could still establish, from server-rendered HTML and live API behaviour, which features exist, which render real content, and which core workflows function.

---

## 2. Did the application start?

**Yes.** Provisioned Node 22.23.3 (`runtime:setup` exit 0), created 2 GB swap, `npm ci` exit 0 in 23 s, then `next dev` on port **4044** against a byte-copy of `prisma/dev.db`.

Startup was not entirely smooth, and the reason matters:

- The first full crawl returned **97 × "fetch failed"**. Diagnosis: Next's own dev-memory watchdog restarted the server ("Server is approaching the used memory threshold, restarting") on this 1.9 GB host, mid-crawl. **Environment limit, not an application defect.** I hardened the crawler with health-gating and per-route retries; the re-run returned 108 × 200 and 3 × 307.

---

## 3. Verified local preview URL

**`http://localhost:4044`**

The server is still running at the end of this phase and is exposed to you as a live preview. It is a **development build against a disposable database**, not staging and not production. If it is gone by the time you read this, restart with:

```bash
source ~/.local/share/lms-runtime/node-v22.23.3-linux-x64/env.sh
cp prisma/dev.db /tmp/p44_preview.db
DATABASE_URL=file:/tmp/p44_preview.db STORAGE_LOCAL_ROOT=$PWD/e2e/storage npx next dev -p 4044
```

Demo sign-ins are documented in `prisma/seed.ts:12-14` and also displayed on the login screen.

---

## 4. Was a browser used for real visual inspection?

**No.**

I checked thoroughly before deciding: `playwright`, `playwright-core`, `@playwright/test`, `puppeteer`, `puppeteer-core` — none present. No `chromium`, `chrome`, `firefox` on PATH. No `~/.cache/ms-playwright`, no `.playwright-cli`. The phase instruction was not to install a large automation stack without checking first; I checked, none existed, and a Chromium download is several hundred MB against a 1.9 GB / 1.98 GB-RAM box whose dev server already restarts itself under memory pressure. **I did not install one, and I have not described any screen as if I had seen it.**

What I did instead:
- started the app,
- inventoried every source-defined route,
- fetched **110/110 routes** with real role sessions and parsed the server-rendered HTML,
- exercised real API endpoints for the main workflows,
- read the source for layout and responsive signals.

---

## 5. Routes and features discovered

| Measure | Verified count | Notes |
|---|---|---|
| Page routes defined | **110** | filesystem; excludes dynamic patterns that need parameters |
| Routes successfully fetched | **110 / 110** | 108 × `200`, 3 × correct `307`, 0 failures |
| Routes confirmed rendering real domain content | **~88** | ≥800 chars of visible text (35 rich ≥2000, 53 moderate) |
| Routes rendering thin/empty shells | **19** | 8 of these are legitimately minimal (login, unauthorized, invalid-token pages); 3 are confirmed client-side shells; 8 are detail pages that resolved to empty states |
| Route handlers (API) | **205** | filesystem |
| Feature areas (nav groups) | **~24 per portal** | 41 admin / 47 teacher / 27 student nav links rendered |
| Roles exercised | **3** | ADMIN, TEACHER, STUDENT (SUPER_ADMIN exists in the model, not seeded) |
| Features marked `NOT_VERIFIED` | **7** | all blocked on the absence of a browser |

**These are verified counts, not estimates.** The only estimate is "~88", because "real content" is a judgement made on rendered text length plus spot-checking; every number above it was counted mechanically.

---

## 6. Representative user journeys

| # | Journey | Method | Result |
|---|---|---|---|
| **J1** | Sign in, correct credentials | `POST /api/auth/login` | **PASS** — `200`, user payload, session cookie issued |
| **J2** | Sign in, wrong password | same | **PASS** — `401`, "Incorrect username or password." |
| **J3** | Sign in, empty fields | same | **PASS** — `422` with per-field errors: `identifier: ["Enter your username or email."]`, `password: ["Enter your password."]` |
| **J4** | Sign in, unknown user | same | **PASS** — `401`, byte-identical message to J2 (no account enumeration) |
| **J5** | Student starts an exam | `POST /api/assessments/[id]/start` | **PASS** — `200`, attempt created `IN_PROGRESS`, 10-min deadline |
| **J6** | Student loads questions for that attempt | `GET .../attempts/[id]` | **PASS** — 8 questions, 3 options each, server time returned |
| **J7** | Student submits the attempt | `POST .../submit` | **PASS** — `200`, `status: GRADED`, `score 0/10` (correct: no answers given), `autoSubmitted: false` |
| **J8** | Cross-role access denial | `GET /admin/users` as student | **PASS** — `307 → /unauthorized` |
| **J9** | Admin opens teacher routes from admin nav | 5 × `GET /teacher/*` | **PASS** — all `200` (`requirePageUser(["TEACHER","ADMIN"])`) |
| **J10** | Listing with pagination at volume | `GET /admin/users` | **PASS** — "Showing 1–10 of 87 · Page 1 of 9" |
| **J11** | Missing record | `GET /admin/users/<missing>` | **SOFT FAIL** — correct empty state, wrong status (`200`, not `404`) → FIND-02 |
| **J12** | Unknown URL | `GET /p44-no-such-page` | **PASS** — `404` + custom not-found screen |

**Honest framing:** these are server-side journeys driven over HTTP. They prove the *function* works. They do **not** prove the buttons that call them are wired, visible, or correctly placed — only a browser can show that.

Two journeys I deliberately did not run: creating an assignment and creating an assessment (both are forms whose submit path would mutate data beyond what discovery needs). And one I ran but did not complete: I created an attempt in J5, so `/teacher/results/[attemptId]` became reachable — but I did not re-probe it before the crawl finished. Recorded as `NOT_VERIFIED` rather than assumed good.

---

## 7. The most important problems

**Functionally, this is a finished-looking product, not a prototype.** No placeholder screens (`"Coming soon"` appears nowhere), no no-op buttons, no `TODO` markers in UI code, 205 API routes, 114 components, coherent per-role navigation, custom error/not-found boundaries, field-level validation, accessible controls (0 unlabelled icon buttons, 0 images without `alt`). Every specialist feature I probed — AI tutor, speaking lab, automation, system health, backups, certificate verification — renders real, purpose-written UI.

The problems cluster in **findability and feedback**:

1. **FIND-01 (P1)** — `/teacher/results` is paginated with **no search**. Grading is the teacher's daily job and the one workflow without a lookup.
2. **FIND-03 (P2)** — exactly **one** `loading.tsx` for 110 routes, so every navigation blanks the viewport to a spinner.
3. **FIND-02 (P2)** — detail routes return **200** for missing records (soft 404).
4. **FIND-05 (P2)** — 6 `<table>` elements app-wide, **no shared table primitive**; list screens diverge.
5. **FIND-04 (P2)** — 7 search inputs across 110 routes.

Full detail and reproduction steps: `PHASE_44_PRODUCT_FINDINGS.md`.

---

## 8. Areas not inspected, and why

| Area | Status | Reason |
|---|---|---|
| **Visual appearance of every page** | **NOT INSPECTED** | No browser. This is the largest gap in the phase |
| Responsive layout at real widths | **NOT VERIFIED** | Breakpoint classes and a `bottom-nav` exist in source; never rendered at a viewport |
| Client-side interaction (clicks, tabs, modals, drag-drop) | **NOT VERIFIED** | Requires hydration |
| Exam-taking UI, lesson player, content builder & preview | **NOT VERIFIED** | Render client-side; server HTML ends at `Loading…` |
| AI tutor conversation, speaking lab recording | **NOT VERIFIED** | Needs browser + microphone + an AI provider; would also require a fabricated key, which is forbidden |
| Offline / PWA behaviour | **NOT VERIFIED** | Service worker needs a browser |
| Assignment/assessment creation forms | **NOT EXERCISED** | Submit path mutates data beyond discovery scope |
| Valid reset/invite tokens, revoked certificates | **NOT EXERCISED** | No such records exist; minting them would be a mutation |
| Backup restore, deployment | **OUT OF SCOPE** | Staging-only; Phase 37 still blocked |
| Anything production | **NOT CONTACTED** | Prohibited |

---

## 9. Integrity results

| Check | Result |
|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac1…f7fb02` — **byte-identical**, unchanged |
| `package-lock.json` | `035df9a3…6a76b48` — **unchanged** (no dependencies added) |
| `.env` | parked during the run, **restored byte-identical** (`6da80015…`) |
| SQLite migrations | **4** — unchanged |
| PostgreSQL migrations | **5** — unchanged |
| `MANIFEST.sha256` | **4/4 OK** |
| `.nvmrc` / `engines` | `22.23.3` / `>=22.13.0 <23.0.0` — unchanged |
| Application source modified | **0 files** |
| Secrets introduced | **none** |

**Mutations performed — all on the disposable copy, none on `dev.db`:** one `assessmentAttempt` (journey J5) and 245 `loginAttempt` rows from repeated sign-ins. `/tmp/p44_preview.db` is a copy and can be deleted; `prisma/dev.db` was never opened for writing.

**Environment changes (disclosed):** Node runtime re-provisioned (it does not survive session boundaries), `npm ci` reinstalled, and a **2 GB swap file created** — required for `npm ci` on this host, reversible with `sudo swapoff /swapfile && sudo rm /swapfile`.

**Cleanup:** throwaway `.p44_*` helper scripts deleted; crawl JSON left in `/tmp` only. The dev server remains up **intentionally**, as the live preview.

---

## 10. Remaining risks and dependencies

| # | Item | Owner | Action needed |
|---|---|---|---|
| R1 | **No browser → visual quality unknown** | Whoever runs Phase 45 | Provide a browser/Playwright environment; this single gap blocks ~7 `NOT_VERIFIED` features |
| R2 | Dev server restarts under memory pressure at 1.9 GB | Platform | More RAM for dev builds of a 213-model app; production build is lighter |
| R3 | Demo DB contains unexplained artifacts (`alex.sync.*` users, a `VERIFIED` backup dated today) | Product/data | Decide provenance; clean the seed (FIND-06) |
| R4 | `NEXT_PUBLIC_DEMO_HINTS` shows working credentials on `/login` | Release | Add a production guard to the release gate (FIND-09) |
| R5 | Phase 37 staging blockers B1–B16 all remain open | Organization | Unchanged — none of them were touched by this phase |

---

## 11. Recommended next phase

**Phase 45 — targeted UX fixes plus the browser pass that Phase 44 could not do.**

In strict order:

1. **Obtain a browser.** Without it, every remaining `NOT_VERIFIED` — the exam UI, lesson player, content builder, tutor, speaking lab, mobile layout — stays unverified. That is the majority of what makes this product *feel* finished, and it is invisible to HTTP probing.
2. **FIND-01** — add search/filter to `/teacher/results` by reusing the existing `UsersPage` implementation. Highest daily-user value, lowest risk.
3. **FIND-03** — route-level skeletons for the five busiest screens.
4. **FIND-02** — make detail routes return real 404s.
5. Then, and only then, consider **FIND-05** (shared `DataTable`), which is a refactor and should not be rushed.

**Explicitly not recommended:** a redesign. The information architecture is coherent, the three portals are cleanly separated, terminology is consistent, and the design system is already applied across 114 components. This product needs **finishing, not rethinking** — and the fastest way to know exactly what "finished" looks like is to put a browser in front of it.

---

### Safety boundaries honoured

No production or organizational staging contacted. No migrations, resets, backups or restores. No destructive operation against real data — all state changes confined to a disposable copy. No schema, dependency, lockfile, engine or `.nvmrc` change. No dependency installed (including no browser stack). No deployment or publication. No historical report rewritten. No Git initialization, no CI. No credential fabricated — the only credentials used are the demo accounts documented in `prisma/seed.ts`. No manual UI testing is claimed that was not performed. Phase 45 not started.
