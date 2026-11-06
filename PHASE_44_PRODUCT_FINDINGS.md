# PHASE 44 — Product Findings
## Prioritised usability and functional issues

**Date:** 2026-10-25
**Companion to:** `PHASE_44_FEATURE_INVENTORY.md`

Severity is about **user impact**, not fix difficulty.

> **Method caveat.** No browser was available. Every finding below is grounded in
> server-rendered HTML, HTTP status codes, live API responses, or source reading.
> Findings that could only be settled by *looking at the screen* are marked
> **OBSERVATION** and are explicitly **not** presented as confirmed defects.

---

## Summary

| Priority | Count | Meaning |
|---|---|---|
| **P0** | **0** | Nothing prevents the application starting or a core workflow completing |
| **P1** | **1** | One common workflow lacks the search it needs at its data volume |
| **P2** | **4** | Significant usability / correctness issues |
| **P3** | **5** | Low-impact polish and consistency |
| Observations | 4 | Preferences or unresolved questions — **not bugs** |

The headline: **there is no broken core.** Login, navigation, listing, pagination, exam start → question delivery → submit → grading, system health, and authorization gating all work against real data. The problems are concentrated in *findability* and *feedback consistency*, not in whether features function.

---

## P0 — none

The application starts, every one of 110 routes answers (108 × `200`, 3 × correct `307` login redirects, 1 × correct `404` for an unknown URL), and the primary workflows complete. No P0 exists.

---

## P1

### FIND-01 · Results page offers no way to find a specific record

**Page:** `/teacher/results`
**Reproduce:** sign in as `sara.whitfield` → Results.
**Expected:** with a class of students and a growing body of attempts, a teacher can locate one student's result — by name, group, assessment or date.
**Actual:** the page is **paginated but has no search input** (verified in source: `src/app/(app)/teacher/results/page.tsx` imports `Pagination` and matches none of the search patterns, unlike `users-page.tsx`). Filters are limited to whatever selects that page defines.
**Evidence:** `grep -l "ui/pagination"` returns 4 files; of those, only `teacher/results/page.tsx` and `admin/settings/page.tsx` lack a search input — and only the former is a high-cardinality record list.
**Impact:** a teacher looking for one submission pages through results manually. This is the everyday grading workflow; it is the single most likely daily friction point found.
**Recommendation:** add the same search + filter bar already built for `/admin/users` to `/teacher/results`. **Reuse, don't build** — `UsersPage` already implements search, three selects and pagination in one component.
**Next phase:** Phase 45, first item.

---

## P2

### FIND-02 · Missing records return HTTP 200 instead of 404 (soft 404)

**Pages:** `/admin/users/[id]`, `/teacher/classes/[id]` (and plausibly every detail route that renders an inline "not found" state).
**Reproduce:** sign in as `admin` → visit `/admin/users/cmuno000000000000000000000`.
**Expected:** `404` — the resource does not exist.
**Actual:** **HTTP 200** with a well-written empty state: *"User not found. This account may have been removed or the link is incorrect. Back to users."*
The same pattern appears on `/teacher/classes/<invalid>` — `200`, where a genuinely unknown URL (`/p44-no-such-page`) correctly returns `404`.
**Evidence:** status codes captured directly by `curl -w '%{http_code}'`; the rendered body text confirms the empty state is shown.
**Impact:** monitoring and link-checkers cannot detect broken links to deleted users or classes; the app's own 404 analytics are wrong; search engines may index not-found pages. Low user-facing harm, real operational harm.
**Note:** the *user experience is correct* — the empty state is clear and offers a way back. Only the status code is wrong. That distinction matters: this is a contract bug, not a UX bug.
**Recommendation:** call Next's `notFound()` in the detail routes when the record is absent, so the existing custom `not-found.tsx` renders with a real `404`.
**Next phase:** Phase 45.

### FIND-03 · Every route transition shows the same full-page spinner

**Page:** all 110 routes.
**Expected:** navigating between pages either keeps the previous content visible while the next loads, or shows a layout-shaped skeleton so the page does not jump.
**Actual:** there is exactly **one** `loading.tsx` (`src/app/(app)/loading.tsx`) rendering `PageLoader` — a centred spinner with "Loading…". Every route in the application shares it.
**Evidence:** filesystem count — 1 `loading.tsx` for 110 `page.tsx`. The component is `src/components/ui/loading.tsx:13`, and a `Skeleton` primitive exists but is used as a list placeholder, not as a route fallback.
**Impact:** on a slower connection the entire viewport blanks to a spinner on every navigation, then reflows when content arrives. This is the most *visible* quality gap in the product. I could not measure how long the spinner actually shows without a browser — see the report's untested list.
**Recommendation:** add route-level `loading.tsx` files for the highest-traffic areas (student home, learning, exams; teacher assignments/results) using the existing `Skeleton` primitive so the shell stays put.
**Next phase:** Phase 45.

### FIND-04 · Search and pagination coverage is thin relative to data volume

**Pages:** most list screens.
**Evidence:** 7 files across `src/app` + `src/components` contain a search input; 4 components use the `Pagination` primitive; 110 page routes exist. `/admin/users` is the gold standard (search + 3 selects + pagination + per-row actions). `/teacher/results` is the weakest (FIND-01).
**Impact:** pages that render full result sets will degrade as data grows. With 87 users and 4 courses this is invisible today; it becomes a performance and usability problem at academy scale.
**Recommendation:** treat `UsersPage` as the pattern and apply it progressively where the record count can grow (results, questions, certificates, audit). Do not add search to static/config pages.
**Next phase:** Phase 45–46.

### FIND-05 · Data tables are bespoke markup, with no shared table primitive

**Evidence:** only **6** `<table>` elements across `src/app`; `src/components/ui` has 13 primitives and none is a table. `/admin/users` renders a table, but other list screens use `divide-y` card rows or custom grids.
**Impact:** column alignment, responsive behaviour, sorting and sticky headers are re-implemented (or not implemented) per page, so list screens feel different from one another. This is the root cause of the visual inconsistency a user would notice first.
**Recommendation:** introduce one `DataTable` primitive (head, row, cell, empty state, responsive collapse) and migrate list screens incrementally. Pin it with a small test so future pages reuse it.
**Next phase:** Phase 46 — this is a refactor, deliberately **not** attempted now.

---

## P3

### FIND-06 · Demo database contains unexplained non-demo artifacts

**Evidence:** `/admin/backups` renders a real record: *"Latest 10/25/2026, 1:24:57 PM · Status VERIFIED · Total 5"*. The `dev.db` also contains student accounts named `alex.sync.1791047306531_fd65` and similar — integration-test residue.
**Impact:** a demo database that shows a `VERIFIED` backup the team did not knowingly create is a trust problem for anyone demoing the product. The `alex.sync.*` accounts pollute every student list and count.
**What I did not do:** I did not delete them — that is data mutation outside this phase's scope, and the backup record may be meaningful evidence from an earlier phase.
**Recommendation:** decide provenance deliberately; exclude sync/test rows from seeded demo data; make the seed idempotent and self-describing.
**Next phase:** data-hygiene pass.

### FIND-07 · Date-windowed views look broken on first load

**Page:** `/teacher/classes` (and any "Today / Week / Month" view).
**Evidence:** the page renders *"Nothing is scheduled in this range"* while the database holds **15 class sessions** — they fall outside the default window.
**Impact:** the correct behaviour produces a first impression of "the schedule is empty". A new user cannot tell the difference between "nothing scheduled" and "nothing loaded".
**Recommendation:** keep the default window but state it explicitly ("Nothing scheduled today · Next class 12 Nov · View month") so the empty state carries information.
**Next phase:** Phase 45 polish.

### FIND-08 · Admin navigation leaves the `/admin` namespace

**Evidence:** the admin sidebar's *Assessments* and *Question Bank* link to `/teacher/exams` and `/teacher/questions`. These work (`requirePageUser(["TEACHER","ADMIN"])` → `200` for admin), but the sidebar switches to the teacher layout.
**Impact:** an administrator loses their admin navigation mid-task and must notice the context change to get back.
**Recommendation:** either add `/admin/exams` routes that reuse the teacher components, or mark these entries visually as "opens teacher tools".
**Next phase:** Phase 46.

### FIND-09 · Login page exposes working credentials

**Evidence:** `/login` renders *"Development demo accounts — This is a development build seeded with demo data. Remove demo seeding before production"* with three account/password pairs and a **Use** button for each. Gated by `NEXT_PUBLIC_DEMO_HINTS`.
**Impact:** none while the flag is off in production; catastrophic if it ships on. The banner is honest and self-describing, which is exactly right.
**Recommendation:** no code change needed. Add a release check that fails if `NEXT_PUBLIC_DEMO_HINTS` is truthy when `NODE_ENV=production` — cheap insurance.
**Next phase:** fold into the release gate.

### FIND-10 · Student dashboard offers several "Start" buttons with no context

**Evidence:** `/student` renders up to three `Start` links pointing at exam detail pages.
**Impact:** identical labels for different exams; a student cannot tell which to begin or how long each takes. (Which exams appear is determined server-side and looked correct for the seeded student.)
**Recommendation:** label with the assessment name and duration ("Start · Vocabulary Check · 10 min").
**Next phase:** Phase 45 polish.

---

## Observations — explicitly **not** defects

| # | Observation | Why it is not a finding |
|---|---|---|
| OBS-1 | Client-rendered pages ship `Loading…` in the HTML | With streaming SSR the fallback legitimately precedes hydration. Without a browser I cannot tell a normal 200 ms flash from a stuck spinner, so I will not claim either |
| OBS-2 | `/teacher/classes` needs a *session* id, not a group id | Route naming (`classes`) is ambiguous vs `ClassSession`, but behaviour is correct. Renaming is cosmetic |
| OBS-3 | Demo sessions predate the default date window | Correct behaviour; only the *empty state copy* is a problem (FIND-07) |
| OBS-4 | Certificate verification returns `200` for an unknown code | Intentional: it is a lookup that reports `Status: NOT_FOUND` inline. Returning 404 would be worse UX for a verification tool |

---

## What should happen next, in order

1. **FIND-01** — add search/filter to `/teacher/results` (reuse `UsersPage`). *Highest daily-user impact, smallest change.*
2. **FIND-03** — route-level skeletons for the five busiest screens.
3. **FIND-02** — correct the soft-404 status codes.
4. **Browser pass** — resolve every `NOT_VERIFIED` in the inventory (exam-taking UI, lesson player, content builder, speaking/tutor interaction, responsive layout). This is the single biggest blind spot and **cannot** be closed without a real browser.
5. **FIND-05** — one shared `DataTable`, then migrate.
6. **FIND-07 / FIND-10 / FIND-08** — copy and navigation polish.

**Not recommended:** any broad redesign. The information architecture is coherent, the three portals are clearly separated, terminology is consistent, and the visual system (13 primitives, shared tokens) is already applied. The product needs *finishing*, not rethinking.
