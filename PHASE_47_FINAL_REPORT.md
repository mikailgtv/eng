# PHASE 47 — FINAL REPORT

**Verdict: `PASS`**

Loading feedback is restored for all three requested list pages, via boundaries that were proven — by measurement, not assumption — not to intercept any 404, 500 or redirect. The global boundary remains absent and every Phase 46 status behaviour is intact.

| Gate | Result |
| --- | --- |
| Candidate routes evaluated | **3 / 3** |
| Routes with loading feedback restored | **3 / 3** |
| Unsafe placements caught and rejected before shipping | **2** (`admin/users/`, `teacher/results/`) |
| Browser checks executed | **44 / 44 passed** (30 loading + 14 functionality) |
| HTTP status checks | **20 / 20** (13 missing → 404, 6 valid → 200, unknown → 404) |
| Redirect/anonymous probes | **11 / 11** identical to baseline |
| New placement guards | **6 / 6** (mutation-checked) |
| Phase 46 suite | **10 / 10** still green |
| `npm run release:verify` | **EXIT 0** |
| `prisma/dev.db` / lockfile | **UNCHANGED** |

---

## 1. Before and after

**Before (start of Phase 47):** no `loading.tsx` anywhere in the app. Navigating between pages kept the previous screen until the next one rendered — no feedback that anything was happening.

**After:** `/admin/users`, `/teacher/results` and `/student/notifications` each render a layout-matched skeleton inside the app shell while their data loads, then the real content. Every other route behaves exactly as it did.

### Why two attempts were rejected before shipping

The obvious implementation — a `loading.tsx` at the segment root — was built and measured first:

| Path | Baseline | With naive `loading.tsx` | Outcome |
| --- | --- | --- | --- |
| `/admin/users/<missing>` | **404** | **200** | would have silently re-created the Phase 46 bug |
| `/teacher/results/<missing>` | **500** | **200** | would have disguised a server error as success |

Both were discarded. Each list page was instead moved into a `(list)` route group so the boundary wraps **one page and no detail route**. After that:

```
/admin/users (missing user)        404 → 404   ✔ preserved
/teacher/results (missing attempt) 500 → 500   ✔ preserved (not masked)
all 13 missing-record routes       404 → 404   ✔
all 6 valid detail pages           200 → 200   ✔
anonymous / unauthorized           307 → 307   ✔
```

Boundary reach was also verified structurally: the `aria-busy` marker appears **once** in each list page's HTML and **zero** times on `/admin/users/[id]`, `/teacher/results/[attemptId]` and `/student/notifications/preferences`.

---

## 2. Routes selected and rejected

| Route | Decision | Reason |
| --- | --- | --- |
| `/admin/users` | **Selected** — boundary at `admin/users/(list)/` | Segment root rejected: wraps `[id]`, 404 → 200 (measured) |
| `/teacher/results` | **Selected** — boundary at `teacher/results/(list)/` | Segment root rejected: wraps `[attemptId]`, 500 → 200 (measured) |
| `/student/notifications` | **Selected** — boundary at `student/notifications/(list)/` | Status-safe at segment root, but would also paint a notifications skeleton over the differently-shaped `preferences` page |
| `src/app/(app)/loading.tsx` | **Rejected** | Forbidden by the task; it is the Phase 46 root cause |

Detail: `PHASE_47_LOADING_FIXES.md`.

---

## 3. Files changed

8 files — 3 page files **moved** with `mv` (no content edits), 3 new `loading.tsx`, 1 new test, 1 script entry.

```
src/app/(app)/admin/users/(list)/page.tsx            (moved)
src/app/(app)/admin/users/(list)/loading.tsx         (new)
src/app/(app)/teacher/results/(list)/page.tsx        (moved)
src/app/(app)/teacher/results/(list)/loading.tsx     (new)
src/app/(app)/student/notifications/(list)/page.tsx  (moved)
src/app/(app)/student/notifications/(list)/loading.tsx (new)
scripts/test-phase47-loading-boundaries.ts           (new)
package.json                                         (test:phase47 + chain)
```

No schema, migration, dependency or lockfile change. No data-fetching code, forms, search, pagination, filters, permissions or styling altered. URLs unchanged (confirmed in the production route table).

---

## 4. Evidence

12 screenshots in `/home/user/evidence/p47/` — `{desktop,mobile375}-{admin-users,teacher-results,student-notifications}-{loading,loaded}.png`.

The loading shots were captured through a **test-only slow-streaming proxy** in `/tmp` that holds the streamed remainder for 1.5 s after the shell, so the server's own first flush is what the browser paints. No production delay was added. An earlier attempt (holding the client-side RSC request) did not surface the fallback in `next dev` and is recorded as a negative result rather than used.

Case-by-case results, commands and exit statuses: `PHASE_47_REGRESSION_TESTS.md`.

---

## 5. Known limitations

* **Dev-mode only.** `next start` remains unusable in this sandbox (production guards reject SQLite/localhost without `INTEGRATION_SECRET_KEY`) — pre-existing, not worked around, and no production-mode claim is made.
* **Client-side navigation to an unfetched route** did not show the fallback in `next dev` when the RSC payload was held. That path was not verified and is **not claimed**; the verified path is the streamed initial render.
* **Only these three pages** have loading feedback. Other list pages still show nothing while loading; each needs its own subtree check first.
* The skeletons simulate slow streaming, not a slow data layer — layout under a genuinely slow query was not observed.
* `aria-busy` and the hidden label are verified in the DOM; no assistive-technology session was run.
* One operational note: moving a route file leaves `.next/types` stale and makes `npm run typecheck` fail with `TS2307` until `.next` is regenerated. Not a source defect; documented so it is not misdiagnosed.

---

## 6. Recommended next user-facing task

**Extend the verified pattern to the remaining high-traffic list pages.** `/teacher/assignments`, `/teacher/students`, `/teacher/exams`, `/admin/groups` and `/student/assignments` are all list pages that currently give no feedback while loading, and the recipe is now proven and cheap: check the subtree for any `notFound()` page, move the page into a `(list)` group, add a layout-matched skeleton, then re-run the status sweep. The new `test:phase47` guard makes a mistake here fail a test rather than ship silently.

Second candidate, unchanged from Phase 46: extend the URL-driven search pattern to other staff list pages that lack it.

---

## 7. Phase boundary

**Phase 47 is complete.** No Phase 48 work was started. Production and organizational staging were not accessed; the repo database, lockfile and schema are untouched; the global loading boundary remains absent.
