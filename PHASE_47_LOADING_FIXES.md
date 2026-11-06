# Phase 47 — Restoring Loading Feedback Without Regressing 404s

**Scope:** restore a route-level loading state for three list pages after Phase 46 removed the global `src/app/(app)/loading.tsx`, without changing any HTTP status the app returns.

The central question was not "is this a list page?" but **"what else lives under this segment?"** — a `loading.tsx` is a Suspense boundary over the whole subtree, and Phase 46 established that any boundary above a `notFound()` flushes the response as HTTP 200. Two of the three obvious placements turned out to be unsafe, and it was measured, not assumed.

| Item | Value |
| --- | --- |
| Runtime | Node **v22.23.3** (repo-pinned runtime) |
| Server | `next dev -p 4047` (Next 15.5.27) |
| Database | **`/tmp/p47_preview.db`** — byte copy of `prisma/dev.db` + 30 test-only attempts |
| Browser | `playwright-core` + Chrome Headless Shell 156, under `/tmp` only |
| Evidence | `/home/user/evidence/p47/` (12 screenshots) |

---

## 1. Route inspection (actual tree, not the report)

`src/app/(app)/loading.tsx` — **absent**, confirmed before any change. The only not-found handlers were `src/app/not-found.tsx` and `src/app/(app)/admin/users/[id]/not-found.tsx`.

| Candidate | Complete subtree | Detail route beneath? | `notFound()` beneath? |
| --- | --- | --- | --- |
| `/admin/users` | `page.tsx`, `[id]/page.tsx`, `[id]/not-found.tsx` | **yes** — `/admin/users/[id]` | **yes** — `if (!student) notFound();` |
| `/teacher/results` | `page.tsx`, `[attemptId]/page.tsx` | **yes** — `/teacher/results/[attemptId]` | imports `notFound` but **never calls it** (dead import) |
| `/student/notifications` | `page.tsx`, `preferences/page.tsx` | no dynamic segment | none |

Two findings that changed the plan:

1. `teacher/results/[attemptId]/page.tsx` **imports `notFound` but never calls it** — the Phase 46 grep for `notFound()` correctly listed 13 routes, but a source-level "does this file mention notFound" check would have been misleading in the other direction. Its missing-record path throws from `getResultForStaff` and answers **HTTP 500** (measured baseline).
2. A 500 can be masked by a boundary just as a 404 can. That made `/teacher/results` as risky as `/admin/users`, for a different reason.

---

## 2. Measured safety test — segment-level placement

Before writing any real UI, a temporary `loading.tsx` was placed at each candidate's segment root and every status was re-measured against the baseline.

| Path | Baseline | With `loading.tsx` at segment root | Verdict |
| --- | --- | --- | --- |
| `/admin/users` | 200 | 200 | ok |
| **`/admin/users/<missing>`** | **404** | **200** | **REGRESSION — rejected** |
| `/admin/users/<valid>` | 200 | 200 | ok |
| `/teacher/results` (anon) | 307 | 307 | ok |
| **`/teacher/results/<missing>`** | **500** | **200** | **REGRESSION — rejected** |
| `/student/notifications` (anon) | 307 | 307 | ok |

So a boundary at `admin/users/` or `teacher/results/` silently reintroduces exactly the defect Phase 46 removed — for the detail routes this time.

## 3. Selected placement — `(list)` route groups

Each list page was moved into a `(list)` route group (URL-transparent) and the `loading.tsx` placed **inside** that group, so the boundary wraps one page and nothing else:

```
src/app/(app)/admin/users/
  (list)/page.tsx        ← was admin/users/page.tsx   (URL unchanged: /admin/users)
  (list)/loading.tsx     ← NEW, boundary covers only this page
  [id]/page.tsx          ← untouched, outside the group → 404 preserved
  [id]/not-found.tsx     ← untouched

src/app/(app)/teacher/results/
  (list)/page.tsx        ← was teacher/results/page.tsx
  (list)/loading.tsx     ← NEW
  [attemptId]/page.tsx   ← untouched → its 500 is preserved

src/app/(app)/student/notifications/
  (list)/page.tsx        ← was student/notifications/page.tsx
  (list)/loading.tsx     ← NEW
  preferences/page.tsx   ← untouched
```

The page files were **moved with `mv`; their contents were not edited**. URLs did not change — the production build's route table still lists `/admin/users`, `/teacher/results` and `/student/notifications` at their original paths.

### Why each boundary is safe — and how it was proven

Two independent pieces of evidence per route:

**(a) Status evidence** — after the change, every previously measured status is byte-for-byte the same as baseline:

| Path | Before | After |
| --- | --- | --- |
| `/admin/users` | 200 | 200 |
| `/admin/users/<missing>` | 404 | **404** |
| `/admin/users/<valid>` | 200 | 200 |
| `/teacher/results` | 200 | 200 |
| `/teacher/results/<missing>` | 500 | **500** |
| `/student/notifications` | 200 | 200 |
| `/student/notifications/preferences` | 200 | 200 |
| `/admin/users` as STUDENT | 307 | 307 |
| `/admin/users` anonymous | 307 | 307 |
| `/teacher/results` anonymous | 307 | 307 |
| `/student/notifications` anonymous | 307 | 307 |

**(b) Boundary-scope evidence** — the marker `aria-busy="true"` exists only in the three new loading files (verified: no other file in `src/` contains it). Counting it in the streamed HTML gives the boundary's real reach:

| Route | `aria-busy` in response |
| --- | --- |
| `/admin/users` | 1 |
| `/teacher/results` | 1 |
| `/student/notifications` | 1 |
| `/admin/users/<valid>` (detail) | **0** |
| `/teacher/results/<attempt>` (detail) | **0** |
| `/student/notifications/preferences` | **0** |

The boundary demonstrably covers the list page and demonstrably does not cover the sibling routes.

### Rejected options

| Option | Why rejected |
| --- | --- |
| `src/app/(app)/loading.tsx` (restore the global boundary) | Explicitly forbidden, and it is the Phase 46 root cause — it would re-break all 13 `notFound()` routes at once. |
| `admin/users/loading.tsx` | Measured: turns `/admin/users/<missing>` from 404 into 200. |
| `teacher/results/loading.tsx` | Measured: turns `/teacher/results/<missing>` from 500 into 200 (masks a real error). |
| `student/notifications/loading.tsx` | Status-safe in measurement, but it would also render a notifications-shaped skeleton on `/student/notifications/preferences`, which has a different layout. Scoped to `(list)` instead. |
| In-page `<Suspense>` around the list | Would work, but requires restructuring each page's data fetching; the route group achieves the same result with a file move and no code change. |

---

## 4. The loading UI

Three standalone `loading.tsx` files (~30 lines each), built from the existing `Skeleton` primitive in `src/components/ui/loading.tsx`. No new component, no shared abstraction, no dependency.

Design rules applied:

* **Geometry matches the real page** so content does not jump — admin users: header + toolbar + 8 table rows; teacher results: header + search box + six-cell filter grid + 6 rows; notifications: title + summary + two chip rows + 4 notice cards.
* **Inside the app shell** — the nav, header and bottom bar keep rendering, so only the content area changes.
* **Unobtrusive** — the app's existing `animate-pulse` `Skeleton`, no spinner overlay, no colour change.
* **Accessible** — `aria-busy="true"` plus a visually hidden `Loading users… / Loading assessment results… / Loading notifications…` label. The real page replaces the region entirely, so nothing can be left "busy".

---

## 5. Files changed

| # | File | Change |
| --- | --- | --- |
| 1 | `src/app/(app)/admin/users/(list)/page.tsx` | moved (content unchanged) from `admin/users/page.tsx` |
| 2 | `src/app/(app)/admin/users/(list)/loading.tsx` | **new** |
| 3 | `src/app/(app)/teacher/results/(list)/page.tsx` | moved (content unchanged) from `teacher/results/page.tsx` |
| 4 | `src/app/(app)/teacher/results/(list)/loading.tsx` | **new** |
| 5 | `src/app/(app)/student/notifications/(list)/page.tsx` | moved (content unchanged) from `student/notifications/page.tsx` |
| 6 | `src/app/(app)/student/notifications/(list)/loading.tsx` | **new** |
| 7 | `scripts/test-phase47-loading-boundaries.ts` | **new** — placement guards |
| 8 | `package.json` | `test:phase47` script, added to the `test` chain |

No schema, migration, dependency or lockfile change. No data-fetching code touched. No forms, search, pagination, filters, permissions or styling altered. The global `(app)/loading.tsx` remains absent.

---

## 6. Known side effect: stale `.next/types` after moving route files

Renaming/moving a `page.tsx` leaves `.next/types/**` pointing at the old path, and `tsconfig.json` includes `.next/types/**/*.ts`, so `npm run typecheck` fails with `TS2307: Cannot find module '../../../../src/app/(app)/.../page.js'` until the generated directory is regenerated.

Recorded so nobody misreads it as a source error: removing `.next` (a generated directory, not source) and re-running gives `TYPECHECK_EXIT=0`. A clean checkout or `npm run build` regenerates it automatically.
