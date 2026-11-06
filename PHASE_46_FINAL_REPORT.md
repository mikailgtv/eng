# PHASE 46 — FINAL REPORT

**Verdict: `PASS`**

All three defects were reproduced in the running application, root-caused, fixed with narrow changes, and re-verified with browser evidence, a new repository regression suite, and the full release verification command.

| Gate | Result |
| --- | --- |
| Defects reproduced before fixing | **3 / 3** |
| Defects fixed | **3 / 3** |
| Browser checks executed | **46 / 46 passed** |
| Repository regression tests | **10 / 10 passed** (mutation-checked) |
| `npm run release:verify` | **EXIT 0** (typecheck + full test chain + production build) |
| `prisma/dev.db` | **UNCHANGED** (`e9b4eac1…fb02`) |
| `package-lock.json` | **UNCHANGED** (`035df9a3…6b48`) |
| New dependencies | **none** |

---

## 1. What was fixed

### BUG-01 — `/teacher/results` search — **FIXED**
**Before:** 0 search inputs; `?q=Mei` returned the identical unfiltered list (25 of 30 rows).
**Cause:** `q` did not exist in the page's `searchParams`, in the filter form, in the URL builder, or in `listResultsForStaff()`.
**Fix:** server-side token search across student name / username / employee code / assessment title, ANDed with — never replacing — the existing permission scope and filters; existing `SearchInput` component reused; `q` carried through filters and pagination; page clamped when results narrow; search-aware empty state with Clear search.
**After:** 18/18 browser checks, desktop and 375 px.

### BUG-02 — missing records returned HTTP 200 — **FIXED**
**Before:** `/admin/users/<missing>`, `/teacher/classes/<missing>`, `/teacher/groups/<missing>`, `/teacher/students/<missing>` all returned **200**.
**Cause:** `src/app/(app)/loading.tsx` — one Suspense boundary above every authenticated page; the shell (and the 200) is flushed before `notFound()` runs. `src/app/(app)/admin/users/[id]/page.tsx` additionally rendered an in-page EmptyState instead of calling `notFound()`.
**Fix:** removed the route-group `loading.tsx`; admin page now calls `notFound()` after its authorization check; added a segment `not-found.tsx` so the 404 keeps the exact "User not found." copy inside the app shell.
**After:** **13/13** missing-id routes return 404 (all pages that call `notFound()`); 6/6 valid detail pages still 200; unknown routes still 404; STUDENT → 307 `/unauthorized`; anonymous → 307 `/login` — **authorization and unknown-route behaviour are unchanged and were explicitly tested.**

### TASK 2 — Settings save usability — **FIXED** (reproducible, and not for the reason originally hypothesised)
**Before:** 14 category forms; quiet-hour inputs **outside every form**; the "saved" confirmation rendered at **y=3208** for a button at **y=517** on a 900 px viewport, so a save looked like a no-op; a quiet-hours-only edit was **silently lost** on navigation; any category save **also overwrote** the stored quiet hours.
**Fix:** quiet hours got their own form, their own `Save quiet hours` button and feedback beside it; each category form has local saving/saved state next to its own button; category saves no longer transmit quiet fields (new `saveQuietHours()` + a category-less path on the existing endpoint with `HH:MM` validation).
**After:** 12/12 browser checks. Unrelated controls, stored values, the forced `inApp` behaviour for ADMIN/CERTIFICATE/EXAM, and the visual identity are unchanged.

---

## 2. Not fixed / not reproducible

Neither category was used as an excuse to skip work, but nothing was invented either.

| Item | Status | Reason |
| --- | --- | --- |
| 403 masked as 404 in `teacher/classes/[id]` and `teacher/groups/[id]` (`.catch(() => null)`) | **Not fixed — deliberate** | Reporting "does not exist" rather than "forbidden" is the safer anti-enumeration posture and is pre-existing. Changing it would produce a 500 because those pages have no forbidden UI. Recorded for an explicit decision. |
| Route-level "Loading…" spinner | **Removed, disclosed** | It is the mechanism that forced HTTP 200 for every `notFound()` page. Keeping it and returning real 404s is not possible in Next 15 without relocating every detail route. |
| Phase 45's framing of Task 2 as "14 buttons" | **Corrected** | The button count was never the defect; the defect was invisible feedback plus a missing save boundary. Verified by measurement, not by reading. |
| Phase 45's note that `/teacher/results` was empty | **Corrected** | The seed database contains **zero** attempts — a data condition, not a bug. Search could only be exercised after test-only records were added to the disposable copy. |

Nothing in this phase was found unreproducible.

---

## 3. Regression results

* **Browser:** 46 checks — 18 (search) + 11 (status codes) + 12 (settings) + 5 (smoke) — all passed, plus a curl sweep confirming 13/13 missing-id routes → 404 and 6/6 valid detail pages → 200.
* **Repository suite:** `scripts/test-phase46-regressions.ts`, 10 tests, wired into `npm test` as `test:phase46`. The search test runs **real Prisma queries** against a throwaway copy of the database; the other seven are source guards for invariants that need a live server to observe (covered by the browser run instead).
* **Mutation check:** disabling the search clause makes the suite fail (9/10); restoring it returns 10/10. The test detects the defect it covers.
* **Existing suites:** all green inside `release:verify` — 32 + 23 + 27 + 13 + 10 tests, `next build` succeeded.
* **Static:** `typecheck` EXIT 0; ESLint on the 7 changed files EXIT 0 (0 errors, 2 pre-existing warnings).

Full case-by-case detail, commands and exit statuses: **`PHASE_46_REGRESSION_TESTS.md`**. Per-defect root cause and before/after behaviour: **`PHASE_46_BUG_FIXES.md`**.

---

## 4. Change surface

10 files — 8 application changes, 1 new test, 1 script entry:

`src/lib/assessment/queries.ts` · `src/app/(app)/teacher/results/page.tsx` · `src/app/(app)/admin/users/[id]/page.tsx` · `src/app/(app)/admin/users/[id]/not-found.tsx` (new) · `src/app/(app)/loading.tsx` (deleted) · `src/components/communication/actions.tsx` · `src/lib/communication/hub.ts` · `src/app/api/communication/preferences/route.ts` · `scripts/test-phase46-regressions.ts` (new) · `package.json`.

No schema change, no migration, no new dependency, no lockfile change, no shared-component refactor, no unrelated page touched. `SearchInput`, `Pagination`, `EmptyState`, `Button` and `Card` were reused as-is.

---

## 5. Data and dependency integrity

| Item | Status |
| --- | --- |
| `prisma/dev.db` | **UNCHANGED** — `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`, re-hashed after build and after the regression suite |
| `package-lock.json` | **UNCHANGED** — `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` |
| `.env` | **restored and UNCHANGED** — `6da80015…33cb` (it had been left parked by Phase 45; that oversight is corrected and the file is in place at close) |
| Browser/test data | **only in `/tmp/p46_preview.db`**, a disposable copy; 30 test-only attempts, nothing written to the repo database |
| `package.json` browser packages | **0** — and no Playwright package installed; the lockfile's only mention (`@playwright/test`) is a pre-existing optional peer dependency inside another package's entry, in a byte-identical lockfile |
| Phase 45 evidence (40 PNGs) | untouched |

Disclosed sandbox change: 2 GB `/swapfile` created and activated for `next build` (host has 1.9 GB RAM). Nothing in the repo depends on it.

---

## 6. Limitations

* All browser evidence comes from **`next dev`**. `next start` remains unusable in this sandbox (production guards reject SQLite/localhost without `INTEGRATION_SECRET_KEY`) — a pre-existing condition, not worked around, and **no production-mode claim is made**.
* Search was exercised on 30 rows. No index was added, so performance at production scale is **unmeasured**.
* Quiet-hours *storage* is verified; its effect on real email/SMS delivery is **NOT TESTED** (no providers configured).
* AI tutor, microphone/speaking, uploads, MFA, backups and destructive admin actions remain **NOT TESTED** from Phase 45 — coverage across the app is representative, not exhaustive (46 checks against 110 pages).
* Concurrency (two tabs saving the same category) was not exercised.

---

## 7. Recommended next user-facing task

**Restore the in-app loading affordance without re-breaking 404s.** Removing `src/app/(app)/loading.tsx` was the surgical fix for the status-code defect, but it also removed the only streaming placeholder in the product — in-app navigation now shows the previous page until the next one renders. The narrow, evidence-backed follow-up is to add `loading.tsx` to **leaf list segments that contain no `notFound()` detail route below them** (for example `admin/users`, `teacher/results`, `student/notifications`) so skeletons return where they cannot reintroduce soft 404s, then re-run the 13-route status sweep to prove it. That work should re-verify each segment's subtree before adding a file, because a single misplaced boundary silently restores the 200-for-missing-record behaviour this phase removed.

Second candidate, lower risk: extend the now-proven URL-driven search pattern to other staff list pages that lack it.

---

## 8. Phase boundary

**Phase 46 is complete.** No Phase 47 work was started, and nothing outside the three scoped defects was changed. Production and staging were not accessed at any point.
