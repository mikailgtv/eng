# Phase 46 — Regression Tests and Evidence

Everything below was **actually executed** in this session. Commands are quoted with their real exit statuses. Nothing is inferred from configuration or from the presence of code.

**Verdict summary:** 46/46 browser checks passed · 10/10 repository regression tests passed · full release verification exited 0.

---

## 1. Test inventory

| Layer | What | Count | How |
| --- | --- | --- | --- |
| Browser (end-to-end) | Real Chromium sessions against a running dev server | **46 checks** | Playwright under `/tmp` (not in the repo) |
| Repository suite | Real Prisma queries on a disposable DB copy + source guards | **10 tests** | `scripts/test-phase46-regressions.ts`, wired into `npm test` |
| Existing suites | Full project test chain | 5 suites | `npm test` via `release:verify` |
| Static | Type check + lint + production build | 1 build | `npm run release:verify` |

Browser scripts live in `/tmp/pwt/` (`repro.mjs`, `repro2.mjs`, `repro3.mjs`, `verify.mjs`) and are intentionally **outside the project**.

Verified precisely rather than asserted loosely:
* `grep -ci "playwright\|puppeteer" package.json` → **0**.
* `grep -ci "playwright\|puppeteer" package-lock.json` → **2**, both inside a single existing package entry as an **optional peer dependency** (`"@playwright/test": "^1.51.1"` under `peerDependencies` / `peerDependenciesMeta … optional: true`). Nothing is installed: `ls node_modules | grep playwright` → **no match**.
* `package-lock.json` SHA-256 is byte-identical to the pre-phase baseline, so **this phase added no browser package and changed no dependency graph**.

---

## 2. Browser cases and real outcomes

Server: `next dev -p 4046`, `DATABASE_URL=file:/tmp/p46_preview.db` (disposable copy of `prisma/dev.db`).
Login was performed through the JSON API and the session cookie injected into a **fresh context per role** (the Phase 45 lesson about stale sessions leaking across contexts).

### BUG-01 — `/teacher/results` (18/18 passed)

| # | Case | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 1 | Search box rendered | 1 input | `inputs=1` | PASS |
| 2 | Baseline page 1 | 25 of 30 rows | `rows=25` | PASS |
| 3 | `?q=Mei` (first name) | 6 | `rows=6` | PASS |
| 4 | `?q=Chen` (last name) | 6 | `rows=6` | PASS |
| 5 | `?q=Mei Chen` (full name) | 6 | `rows=6` | PASS |
| 6 | `?q=Greetings` (assessment title) | 10 | `rows=10` | PASS |
| 7 | `?q=carter` (case-insensitive) | 6 | `rows=6` | PASS |
| 8 | `?q=zzz-nomatch-zzz` | 0 + empty state | `rows=0`, "No results match…" | PASS |
| 9 | `q=Mei` + `result=PASSED` | only Passed | `rows=2 allPassed=true` | PASS |
| 10 | `q=Mei` + `group=<id>` | filter combines | `rows=6` | PASS |
| 11 | Paginated search keeps `q` | pagination shows | `Page 1 of 1` | PASS |
| 12 | Pagination links carry `q` | every href has `q=` | `?q=Quiz&page=1` | PASS |
| 13 | `q=Quiz&page=9` (out of range) | not empty | `rows=20` (clamped) | PASS |
| 14 | Clear search | restores 30 | `rows=25`, URL `/teacher/results` | PASS |
| 15 | Typing filters (client path) | 6 rows | `rows=6`, `?q=Omar` | PASS |
| 16 | Filter submit keeps search | `q` in URL | `?q=Omar&…&result=PASSED` | PASS |
| 17 | Mobile 375 px overflow | none | `scrollWidth=375` | PASS |
| 18 | Mobile card list filtered | >0 cards | `cards=11` | PASS |

### BUG-02 — missing-record status (11/11 passed)

| # | Case | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 19 | `/admin/users/<missing>` | 404 | HTTP 404 | PASS |
| 20 | 404 keeps in-shell empty state | shell + "User not found." | `shell=true copy=true` | PASS |
| 21 | `/admin/users/<valid>` | 200 | HTTP 200 | PASS |
| 22 | `/teacher/classes/<missing>` | 404 | HTTP 404 | PASS |
| 23 | `/teacher/classes/<valid>` | 200 | HTTP 200 | PASS |
| 24 | `/teacher/groups/<missing>` | 404 | HTTP 404 | PASS |
| 25 | `/teacher/students/<missing>` | 404 | HTTP 404 | PASS |
| 26 | unknown route | 404 | HTTP 404 | PASS |
| 27 | STUDENT on admin page | redirect, **not** 404 | 307 → `/unauthorized` | PASS |
| 28 | anonymous on admin page | redirect, **not** 404 | 307 → `/login?next=…` | PASS |
| 29 | missing exam | clean 404, no 500 | HTTP 404 | PASS |

Extended sweep (curl, all 13 routes that call `notFound()`, one missing id each) — **13/13 returned 404**:
`teacher/assignments`, `teacher/classes`, `teacher/content/builder`, `teacher/content/course`, `teacher/content/preview`, `teacher/courses/lessons`, `teacher/exams`, `teacher/groups`, `teacher/questions`, `teacher/students`, `student/assignments`, `student/exams`, `student/learn`.

Valid-id control (curl): `teacher/groups`, `teacher/students`, `teacher/assignments`, `teacher/exams`, `student/exams`, `admin/users` → **6/6 HTTP 200**.

### TASK-2 — settings save (12/12 passed)

| # | Case | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| 30 | Quiet inputs inside their own form | `[true,true]` | `[true,true]` | PASS |
| 31 | "Save quiet hours" exists | label present | `Save quiet hours` | PASS |
| 32 | Quiet save feedback | "Quiet hours saved." | exact match | PASS |
| 33 | Feedback near button | within 120 px | button y=349, feedback y=401 | PASS |
| 34 | Quiet hours persist after reload | 20:30–06:00 | `"20:30"–"06:00"` | PASS |
| 35 | Category feedback | "MESSAGE saved." | exact match | PASS |
| 36 | Category feedback near its button | within 80 px | button y=762, feedback y=774 | PASS |
| 37 | Category save leaves quiet hours alone | unchanged | `"20:30"–"06:00"` | PASS |
| 38 | Category change persists | toggled value kept | `email=false` | PASS |
| 39 | Unrelated category untouched | unchanged | ACADEMIC unchanged | PASS |
| 40 | Invalid time rejected | visible message, no write | "Use 24-hour times like 22:00…", stored 20:30 | PASS |
| 41 | Reload discards unsaved edit | 20:30 | `value="20:30"` | PASS |

### No-regression smoke (5/5 passed)

| # | Route | Result |
| --- | --- | --- |
| 42 | `/admin` | 200 |
| 43 | `/admin/users` | 200 |
| 44 | `/teacher/results` | 200 |
| 45 | `/student/notifications/preferences` | 200 |
| 46 | `/admin/notifications` | 200 |

---

## 3. Repository regression suite

`scripts/test-phase46-regressions.ts` (new), run as `npm run test:phase46`, and appended to the `npm test` chain.

```
✓ BUG-02: the route-group loading.tsx that forced HTTP 200 is gone
✓ BUG-02: missing admin user calls notFound() instead of rendering an EmptyState
✓ BUG-02: the admin 404 keeps the in-shell empty state
✓ BUG-02: teacher detail routes keep their notFound() calls
✓ TASK-2: quiet hours have their own form and save control
✓ TASK-2: a category save no longer rewrites quiet hours
✓ TASK-2: the preferences endpoint accepts a quiet-hours-only save
✓ TASK-2: quiet hours are stored on their own row helper
✓ BUG-01: search narrows by student, assessment and combination
✓ integrity: the repository database was not modified

=== Phase 46 regressions: 10 passed, 0 failed ===
```

**The search test is behavioural, not a source guard.** It copies `prisma/dev.db` to a temp directory, points `DATABASE_URL` at the copy, inserts 30 attempts across 5 students × 3 assessments, and asserts against real `listResultsForStaff()` results: first/last/full-name matching, assessment-title matching, nonexistent term, AND-combination with the result filter, pagination clamping, and — importantly — that a teacher who owns none of the groups gets **0 rows** even for a term matching every row, proving search cannot widen the permission scope.

**Mutation check (the test can fail):** with the search clause replaced by an empty token list, the suite reported `9 passed, 1 failed` (`✗ BUG-01: search narrows by student, assessment and combination`). Restoring the code returned `10 passed, 0 failed`. The test is therefore sensitive to the defect it claims to cover.

The 7 guards for BUG-02 / TASK-2 are source-level because HTTP status codes and on-screen feedback cannot be observed without a running server; those are covered by the 46 browser checks above. This split is stated so the repo suite is not over-claimed.

---

## 4. Commands and real exit statuses

| Command | Exit | Notes |
| --- | --- | --- |
| `node scripts/runtime/setup-node.mjs` | **0** | Node v22.23.3 provisioned |
| `npm ci` | **0** | Lockfile untouched |
| `npm run typecheck` | **0** | `tsc --noEmit`, clean |
| `npx eslint <7 changed files>` | **0** | 0 errors, 2 **pre-existing** warnings (`PAGE_SIZE`, `smsProvider`) |
| `npm run test:phase46` | **0** | 10/10 |
| `npm run test:phase46` (mutated code) | **1** | 9/10 — deliberate, then reverted |
| `npm run release:verify` | **0** | typecheck + full `npm test` + `build:safe` |
| Browser runs (`node verify.mjs`) | **0** | 46/46 checks |

Full-chain result inside `release:verify`:

```
=== db-tls / backup-connection unit tests: 32 passed, 0 failed ===
=== request-trust & origin policy: 23 passed, 0 failed ===
=== staging readiness gate — contract tests: 27 passed, 0 failed ===
=== release safety contracts: 13 passed, 0 failed ===
=== Phase 46 regressions: 10 passed, 0 failed ===
```

`next build` completed successfully (all 110 pages + 205 route handlers compiled; `/teacher/results` 1.84 kB).

---

## 5. Data and dependency integrity

| Item | Baseline | After | Status |
| --- | --- | --- | --- |
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` | identical | **UNCHANGED** |
| `package-lock.json` SHA-256 | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` | identical | **UNCHANGED** |
| `.env` SHA-256 | `6da800151ba6962c32e7e3d66eb82a7223ea5d5e3cf2df40e6053102b8bd33cb` | identical | **UNCHANGED** |
| Browser packages in `package.json` | 0 | 0 | **NONE ADDED** |
| Playwright installed in `node_modules` | absent | absent | **NOT INSTALLED** (lockfile mention is a pre-existing optional peer dependency) |
| `prisma/migrations.postgresql/MANIFEST.sha256` | 4/4 OK | not touched | **UNCHANGED** |

**Where test data lived:** all test-only records (30 assessment attempts + one transient outsider teacher account, which the suite deletes) exist only in the disposable copy `/tmp/p46_preview.db`, created with `cp prisma/dev.db`. The repository database was read once to make that copy and never written — asserted by the `integrity` test that re-hashes it at the end of every run.

**Fixture directory:** `STORAGE_LOCAL_ROOT` pointed at the pre-existing `e2e/storage` fixture path (used by `scripts/test-idor-live.mjs`). This phase performed no uploads, so no fixture file was written by these tests.

**Environment change disclosed:** a 2 GB `/swapfile` was created and activated in this sandbox (same practice as Phase 45) because the host has 1.9 GB RAM and `next build` needs it. Sandbox-only; nothing in the repo depends on it.

---

## 6. Evidence (21 screenshots, 4.6 MB, `/home/user/evidence/p46/`)

**Before** — `before-01-results-desktop.png` (no search box), `before-01-results-q-ignored.png` (`?q=Mei` returning the unfiltered list), `before-01-results-mobile375.png`, `before-02-prefs-top.png`, `before-02-prefs-after-save.png` (feedback far below the click), `before-03_admin_users_…png`, `before-03_teacher_classes_…png`, `before-03_teacher_groups_…png`, `before-03_teacher_students_…png`, `before-03_teacher_exams_…png`.

**After** — `after-01-results-desktop.png` (search box above unchanged filters), `after-01-results-no-match.png` (empty state + Clear search), `after-01-results-search-pagination.png`, `after-01-results-typed.png`, `after-01-results-mobile375.png`, `after-02-prefs-top.png`, `after-02-prefs-quiet-saved.png`, `after-02-prefs-category-saved.png`, `after-02-prefs-invalid.png`, `after-02-prefs-full.png`, `after-03-admin-users-404.png`.

One screenshot from the first aborted run (`before-01-results-qparam-ignored.png`) was deleted: it was captured **before** the test data existed and showed an empty table, which would misrepresent the baseline. The 30-row baseline is the one cited above.

Phase 45's `evidence/` (40 PNGs) was left untouched.

---

## 7. Not tested — and why

| Not tested | Reason |
| --- | --- |
| Production-mode rendering (`next start`) | **Unusable in this sandbox** — the app's production guards reject SQLite/localhost without `INTEGRATION_SECRET_KEY`. Pre-existing, unchanged, not worked around. All browser evidence is from `next dev`. |
| All 110 pages after removing `(app)/loading.tsx` | 5 pages smoke-tested + all routes compiled in the build. A full re-crawl was out of scope; the risk is limited to the loading affordance, not data. |
| Real email / push / SMS delivery of quiet-hours behaviour | No providers configured in this environment; quiet-hours *storage* was verified, not its effect on delivery. |
| Search with production-scale data | 30 rows in a disposable copy. No index was added (explicitly out of scope), so `contains` performance at scale is **unmeasured**. |
| AI tutor, microphone/speaking, uploads, MFA, backups, destructive admin actions | Outside this phase's scope, still **NOT TESTED** from Phase 45. |
| Concurrency (two tabs saving the same category) | Not exercised. |
