# Phase 46 — Targeted User-Facing Bug Fixes

**Scope:** the three defects carried over from Phase 45. Product functionality only — no security audit, no redesign, no schema/migration/dependency changes.

**Environment used for reproduction and verification**

| Item | Value |
| --- | --- |
| Runtime | Node **v22.23.3** (repo-pinned runtime via `scripts/runtime/setup-node.mjs`, EXIT=0) |
| App server | `next dev -p 4046` (Next 15.5.27) |
| Database | **`/tmp/p46_preview.db`** — a byte copy of `prisma/dev.db`; the repo database was never written |
| Browser tooling | `playwright-core` + Chrome Headless Shell 156, installed under **`/tmp` only** (not in `package.json` / lockfile) |
| Evidence | `/home/user/evidence/p46/` (21 screenshots) |

Every defect below was **reproduced in the running app before any code was changed**. The Phase 45 write-ups were read first and their suggested implementations were treated as unverified — in two of the three cases the real cause was different from what a source-only reading would suggest.

---

## BUG-01 — `/teacher/results` had no search

### Reported behaviour
Teachers could filter results by group / assessment / result / date range but could not search for a student or an assessment by text.

### Reproduced (before)
Against the disposable DB with 30 assessment attempts seeded for the teacher's groups:

| Check | Result |
| --- | --- |
| Search inputs on the page | **0** |
| `?q=Mei` (known student) | 25 rows — **identical to unfiltered**, the parameter was ignored |
| Total / pagination | "Showing 1–25 of 30 · Page 1 of 2" |

Screenshots: `before-01-results-desktop.png`, `before-01-results-q-ignored.png`.

> **Important correction to Phase 45.** The seeded database contains **zero** `assessment_attempt` rows, so `/teacher/results` was *empty* for every teacher. Phase 45 recorded the empty state; that was a data condition, not a defect. Search could not be exercised at all until test-only attempts existed.

### Root cause
Not missing UI alone — the parameter did not exist anywhere in the pipeline:

* `src/app/(app)/teacher/results/page.tsx` declared `searchParams` as `group | assessment | result | from | to | page`; the `<form method="get">` had exactly those five controls, and the `qs()` helper rebuilt only those keys.
* `listResultsForStaff()` (`src/lib/assessment/queries.ts`) accepted `{groupId, assessmentId, result, from, to, page}` and had no text filter.

The page already loads **entirely server-side from the URL**, so search belongs in the WHERE clause — it is server-side search, verified by the fact that filtering survives a full page reload and works with JavaScript disabled. No client-side data store and no new dependency were needed.

### Fix
| File | Change |
| --- | --- |
| `src/lib/assessment/queries.ts` | `filters.q` — whitespace-split tokens, each token ANDed across `student.firstName`, `student.lastName`, `student.username`, `student.employeeCode` and `assessment.title`. Merge point chosen deliberately: the existing `where.student = studentWhere` permission scope stays intact and the search clause is an additional `where.AND`, so search can only **narrow** what the viewer may see — a top-level `OR` would have been ANDed against the scope and silently excluded rows. |
| `src/lib/assessment/queries.ts` | Out-of-range page guard: if a narrowed set leaves `page` past the end, re-run against the last real page. |
| `src/app/(app)/teacher/results/page.tsx` | `q` added to `searchParams`; `SearchInput` (existing component, debounced 350 ms, URL-driven) above the filter row; hidden `q` inside the filter `<form>`; `qs()` carries `q` and drops empty values; search-aware empty state with a **Clear search** action. |

Search semantics: every token must match the student **or** the assessment title, so `Mei` matches a first name, `Chen` a last name, `Mei Chen` the full name, and `Quiz 1` the assessment. SQLite `contains` is used bare — **no `mode: "insensitive"`**, which the provider does not support and which no other query in this codebase uses.

### After (measured)
| Case | Result |
| --- | --- |
| Search box present | 1 input (`#list-search`) |
| `q=Mei` / `q=Chen` / `q=carter` | 6 rows each |
| `q=Mei Chen` (token AND) | 6 rows — full name works |
| `q=Greetings` (assessment title) | 10 rows |
| `q=zzz-nomatch-zzz` | 0 rows + "No results match …" empty state |
| `q=Mei` + result=Passed | 2 rows, all Passed |
| `q=Quiz` + `page=9` | 20 rows (clamped, never an empty page) |
| Clear search | back to 25 rows / 30 total |
| Filter submit while searching | `?q=Omar&…&result=PASSED` — search preserved |
| Mobile 375 px | no horizontal overflow; card list filtered |

Screenshots: `after-01-results-desktop.png`, `after-01-results-no-match.png`, `after-01-results-search-pagination.png`, `after-01-results-typed.png`, `after-01-results-mobile375.png`.

Filters, sorting, pagination, permissions, styling and the responsive table/card split are unchanged — the search box is the only new element.

---

## BUG-02 — missing records answered HTTP 200

### Reported behaviour
`/admin/users/<missing>` and `/teacher/classes/<invalid>` returned HTTP 200.

### Reproduced (before)
| Route (missing id) | Status | Not-found UI |
| --- | --- | --- |
| `/admin/users/cmuno…` | **200** | "User not found." inside the app shell |
| `/teacher/classes/cmuno…` | **200** | root "Page not found" page |
| `/teacher/groups/cmuno…` | **200** | root "Page not found" page |
| `/teacher/students/cmuno…` | **200** | root "Page not found" page |
| `/teacher/exams/cmuno…` | **200** | no not-found UI at all |
| `/p46-no-such-route` (control) | 404 | correct |

Screenshots: `before-03_*.png`.

### Root cause (two independent defects)
**1. `src/app/(app)/loading.tsx` — the real cause, app-wide.** That one file puts a Suspense boundary above *every* authenticated page. Next.js streams the shell — and commits the `200` status line — as soon as the fallback renders, before the page's data resolves. A `notFound()` thrown afterwards can only swap in the UI; it cannot retract a status already on the wire. This is documented Next.js behaviour, not an app bug in the usual sense.

Proved by a controlled experiment on a live server: with `loading.tsx` temporarily moved aside, `/teacher/classes/<missing>` went **200 → 404** with no other change; restoring it returned the file to 200. Adding `notFound()` inside `generateMetadata` did **not** help (still 200) — the boundary flushes first regardless.

**2. `/admin/users/[id]` had its own defect.** It never called `notFound()`; it rendered an in-page `EmptyState` "User not found." That is why it stayed 200 even after the boundary was removed, and why it renders the empty state inside the shell.

**Blast radius:** 13 pages call `notFound()`. All of them were affected by defect 1.

### Fix
| File | Change |
| --- | --- |
| `src/app/(app)/loading.tsx` | **Removed.** Removing the ancestor Suspense boundary is the only framework-level way to let `notFound()` run before streaming starts. One file, zero logic. |
| `src/app/(app)/admin/users/[id]/page.tsx` | `if (!student) notFound();` replaces the inline `EmptyState`; unused imports dropped. `requirePageUser(["ADMIN"])` still runs **first**, so authorization failures can never become 404s. |
| `src/app/(app)/admin/users/[id]/not-found.tsx` | **New.** Renders the same Card + "User not found." + "Back to users" inside the app shell, so the 404 keeps the exact copy users saw before. |

`/teacher/classes/[id]` needed **no code change** — its `notFound()` was already correct; it only appeared broken because of the boundary.

### After (measured)
| Route | Missing id | Valid id |
| --- | --- | --- |
| `/admin/users/<id>` | **404** (in-shell "User not found.") | 200 |
| `/teacher/classes/<id>` | **404** | 200 |
| `/teacher/groups/<id>` | **404** | 200 |
| `/teacher/students/<id>` | **404** | 200 |
| `/teacher/exams/<id>` | **404** (was 200 with no UI) | 200 |
| `/teacher/assignments`, `/teacher/questions`, `/teacher/courses/lessons`, `/teacher/content/{builder,course,preview}` | **404** (all 5) | — |
| `/student/{assignments,exams,learn}/<id>` | **404** (all 3) | `/student/exams/<valid>` 200 |
| Unknown route | 404 (unchanged) | — |

**13/13 missing-id routes return 404.** Authorization and unknown-route behaviour are untouched:

* STUDENT requesting an admin page → **307 → `/unauthorized`** (not 404)
* anonymous request → **307 → `/login?next=…`** (not 404)
* unknown route → **404** (unchanged)

Screenshot: `after-03-admin-users-404.png`.

### Trade-off (disclosed)
Removing `(app)/loading.tsx` also removes the generic full-page "Loading…" spinner during in-app navigation. Nothing else used it. Keeping it and getting real 404s is not possible in Next 15 without moving each detail route out of the route group, which would be a large restructure. This is the documented recommendation for this exact problem.

---

## TASK 2 — Settings save usability (`/student/notifications/preferences`)

### Reproduced (before)
| Observation | Measurement |
| --- | --- |
| Category forms | 14, each with its own `Save <CATEGORY>` button |
| Quiet-hour inputs | **outside every `<form>`** (`insideForm: false` for both) |
| Click "Save ACADEMIC" at y=517 → feedback | rendered at **y=3208**, viewport height 900 → **not visible** |
| Quiet-hours-only edit (21:05) → navigate away → return | reverted to 23:15 → **change lost** |
| Quiet hours after a *category* save | silently written (23:15) — the two settings shared one save |

Screenshots: `before-02-prefs-top.png`, `before-02-prefs-after-save.png`.

### Root cause (three parts, none of which is "too many buttons")
1. **Feedback was 2,700 px away.** One shared `message` was rendered at the very bottom of a 14-form page. Clicking *any* Save looked like a no-op: the button appeared to do nothing while the confirmation appeared far below the fold.
2. **Quiet hours had no save control of their own.** The two inputs sat outside every form. Their values were smuggled along by whichever category Save happened to be clicked — and if none was clicked, the edit was lost on navigation.
3. **A category save rewrote quiet hours.** Each category form posted `quietStart`/`quietEnd` from component state, and `savePreference()` writes `quietStart || null`. Clear the field and save any category and the stored quiet hours are erased — an unrelated control destroying a different setting.

### Fix
| File | Change |
| --- | --- |
| `src/components/communication/actions.tsx` | Quiet hours moved into their **own `<form>`** with a `Save quiet hours` button and feedback rendered next to it. Each category form became `PreferenceCategoryForm` with its own local `saving`/`message` state, so the confirmation appears beside the button that was pressed and buttons show "Saving…" while in flight. |
| `src/components/communication/actions.tsx` | Category saves now send **only** their four channel flags — no quiet fields. |
| `src/lib/communication/hub.ts` | New `saveQuietHours(userId, {quietStart, quietEnd})` writing only `communicationPreference`; empty string clears a boundary, `undefined` leaves it alone. |
| `src/app/api/communication/preferences/route.ts` | Accepts a category-less quiet-hours save; `category` is still required when no quiet field is present (previous 400 preserved). `HH:MM` values are validated with a clear error message. |

Deliberately unchanged: existing values, the persistence mechanism, `savePreference`'s behaviour for API callers, the forced `inApp: true` for ADMIN / CERTIFICATE / EXAM, and every unrelated control. No visual-identity change — same `Button`, same card borders, same spacing rhythm.

### After (measured)
| Check | Result |
| --- | --- |
| Quiet-hour inputs inside their own form | `[true, true]` |
| "Save quiet hours" present | yes |
| Feedback after quiet save | "Quiet hours saved." at y=401 for a button at y=349 → **on screen** |
| Quiet hours after reload | 20:30–06:00 persisted |
| Category save feedback | "MESSAGE saved." at y=774 for a button at y=762 → **next to the button** |
| Category save vs quiet hours | quiet hours untouched (20:30–06:00), channel change persisted |
| Unrelated category (ACADEMIC) | unchanged |
| Invalid time `25:99` | rejected, "Use 24-hour times like 22:00…", stored value unchanged |
| Unsaved edit + reload | discarded (predictable boundary) |

Screenshots: `after-02-prefs-top.png`, `after-02-prefs-quiet-saved.png`, `after-02-prefs-category-saved.png`, `after-02-prefs-invalid.png`, `after-02-prefs-full.png`.

---

## Files changed

| # | File | Type |
| --- | --- | --- |
| 1 | `src/lib/assessment/queries.ts` | modified — search clause + page clamp |
| 2 | `src/app/(app)/teacher/results/page.tsx` | modified — search UI, `q` plumbing, empty state |
| 3 | `src/app/(app)/admin/users/[id]/page.tsx` | modified — `notFound()` |
| 4 | `src/app/(app)/admin/users/[id]/not-found.tsx` | **new** — preserved 404 copy |
| 5 | `src/app/(app)/loading.tsx` | **deleted** — root cause of soft 404s |
| 6 | `src/components/communication/actions.tsx` | modified — save boundaries + inline feedback |
| 7 | `src/lib/communication/hub.ts` | modified — `saveQuietHours()` |
| 8 | `src/app/api/communication/preferences/route.ts` | modified — quiet-hours-only save |
| 9 | `scripts/test-phase46-regressions.ts` | **new** — regression suite |
| 10 | `package.json` | modified — `test:phase46`, added to `test` chain |

No schema, migration, dependency or lockfile change. No shared component was refactored; `SearchInput`, `Pagination`, `EmptyState`, `Button` and `Card` are reused as-is.

---

## Found but intentionally NOT fixed

| Item | Why left alone |
| --- | --- |
| `/teacher/classes/[id]` and `/teacher/groups/[id]` use `.catch(() => null)`, so a **403 is reported as 404**. | Reporting "does not exist" instead of "forbidden" is the safer anti-enumeration posture and is pre-existing. Changing it would surface a 500 because no forbidden UI exists for these pages. Recorded for a deliberate decision, not silently altered. |
| `PAGE_SIZE` constant unused in the results page; `smsProvider` unused in `hub.ts`. | Pre-existing lint warnings, unrelated to this phase. |

## Behaviour changes a reviewer should know about

1. Route-level "Loading…" spinner is gone (consequence of the BUG-02 fix).
2. All 13 `notFound()` routes now return 404 instead of 200 — intended, and the point of the fix.
3. Saving a notification category no longer writes quiet hours (intentional decoupling).
4. Quiet hours are validated as `HH:MM`; empty clears the boundary. No existing row had quiet hours stored, so no stored value can be rejected.
