# PHASE 51 — Assessment Flow Audit (end-to-end, runtime)

**Scope:** the student assessment journey (list → open → run → save → submit → result) and the teacher review journey, with not-found handling, error honesty, mobile usability and the audio-question player.
**Not in scope:** security audit, schema/migration work, redesign, unrelated modules.

**Verdict for this audit: PARTIAL** — the journey works end-to-end on real data; **2 confirmed defects** remain open (1 MEDIUM, 1 LOW). No source file was modified in this phase (see `PHASE_51_FINAL_REPORT.md` §"Why nothing was changed yet").

---

## 1. Method and evidence base

| Item | Value |
|---|---|
| Runtime | `/home/user/.local/share/lms-runtime/node-v22.23.3-linux-x64` (node v22.23.3) |
| Server | `npx next dev -p 4051 -H 0.0.0.0` (dev server; `next start` unusable in this workspace) |
| Database | **disposable copy** `/tmp/p51_run1.db` (`cp prisma/dev.db …`, SHA-256 identical at copy time) |
| Data | **real fixtures only** — 3 `OPEN` quizzes, 1 `SCHEDULED` exam, 0 seeded attempts; `james.carter` (student, group *Firefighter Shift A*), `sara.whitfield` (lead teacher of that group), `admin` |
| Invented data | none. No rows were fabricated, no fields invented, no validation bypassed |
| Browser | real Chromium (`chromium_headless_shell-1248`), Playwright from `/tmp/pwt` (no project dependency added) |
| Viewports | desktop 1280×900 and mobile 375×812 (`deviceScaleFactor 2`, touch) |
| Prior evidence | `PHASE_44_FEATURE_INVENTORY.md` (STU-07…STU-10, TCH-11…TCH-20), `PHASE_45_FUNCTIONAL_BUGS.md` (BUG-01…03), `PHASE_46_BUG_FIXES.md`, `PHASE_49_*`, `PHASE_50_*` |
| Limitations | no git repo (`git rev-parse` → "not a git repository"), so worktree state cannot be diffed; `prisma/dev.db` is read-only for this phase |

Audit-specific prior findings re-checked here:

- Phase 45 **BUG-01** (`/teacher/results` had no search) — **still fixed**: `#list-search` exists and is applied server-side in `src/lib/assessment/queries.ts` (`filters.q`, ANDed after the permission scope). Verified in N1.
- Phase 45 **BUG-02** (detail pages returned 200 for missing records) — **partially regressed in a different form**: `/teacher/results/[attemptId]` now returns **500** instead of 404 (defect P51-D1). The student routes behave correctly.
- Phase 45 **BUG-03** (duplicate/competing submit controls in the runner) — **not reproduced as a double-submit risk**: `Submit now` and the dialog's `Submit final answers` both route through one `submittingRef`-guarded path; double activation produced exactly **1** `POST …/submit` (F8).
- Phase 44 **STU-10 / TCH-20** were `NOT_VERIFIED` for lack of an attempt in demo data — **now verified for the first time** in this phase (F9/F10, N2).

---

## 2. Journey map — every required step

Legend: **IMPLEMENTED** (works, runtime-proven) · **PARTIAL** · **NOT IMPLEMENTED** · **BLOCKED** (runtime evidence unobtainable).

| # | Journey step | Status | Evidence (measured) |
|---|---|---|---|
| 1 | Assessment list loads with correct states | **IMPLEMENTED** | `/student/exams` renders 3 "Open now" quizzes (8/9/9 questions, 10 min, pass 70%, 3 attempts), 1 "Upcoming" exam ("Opens 5 Oct 2026, 08:00 UTC · Details"), and the empty state "My results — No attempts yet." (E1, E1b) |
| 2 | Opening a valid assessment | **IMPLEMENTED** | Overview shows title, description, fact grid (`Questions 9`, `Time 10 min`, `Passing score 70%`, `Attempts 0 of 3 used`) and the "This is a formal assessment — your score is saved to your record…" notice (probe `probe51c/d`) |
| 3 | Instructions / questions render | **IMPLEMENTED** | Runner header `Quiz 3: Verb to be · Quiz · Attempt 1 · Answered 0/9` + live countdown `09:23→09:21`; question meta `QUESTION 1 OF 9 · 1 POINT`; navigator buttons 1–9 with descriptive labels (`Question 1, not answered, current`) (G1) |
| 4 | Answer controls per type | **IMPLEMENTED** | FILL_BLANK text input (G2/G3); `radiogroup` labels for MULTIPLE_CHOICE/TRUE_FALSE (F3); `textarea` for WRITING; token buttons for WORD_ORDER; matching grid — all present in `exam-runner.tsx` and exercised where the fixture allowed |
| 5 | Previous / Next navigation | **IMPLEMENTED** | `Next` → `QUESTION 2 OF 9`, `Previous` → `QUESTION 1 OF 9` with the same value (G3); `allowNavigation` honoured |
| 6 | Answers survive navigation and re-renders | **IMPLEMENTED** | After `Next`→`Previous` the field still read `is` (G3); after a full reload the radio/field state was identical (F5) |
| 7 | Required-answer validation | **IMPLEMENTED (as a warning, not a block)** | Dialog: `Answered: 1 / 9 · Unanswered: 8 · "Unanswered questions are marked incorrect. You can go back before submitting."` — submission is still allowed. This is a deliberate product contract, not a bug (F7) |
| 8 | Single submission with loading/error feedback | **IMPLEMENTED** | Two rapid activations of `Submit final answers` → exactly **1** `POST …/submit` (200) (F8); button switches to `Submitting…`; failure path shows `role="alert"` (G5) |
| 9 | Results persisted and retrievable after reload | **IMPLEMENTED** | UI `10%` / `✗ Not Passed` matched DB `percentage=10, passed=false, status=GRADED`, and was unchanged after reload (G6, G7) |
| 10 | Learner sees the correct result/status | **IMPLEMENTED** | Result page shows outcome icon+text, `10%`, `1 / 10 points · Passing score: 70%`, time used, `Answered 1/9`, per-question review with the learner's answer (F9, G6) |
| 11 | Teacher finds the attempt and reviews it | **IMPLEMENTED** | `#list-search` = `carter` → row for *James Carter · Quiz 3* (10%); detail page shows `James Carter · Firefighter Shift A · Quiz · Attempt 1`, `✗ Not Passed`, `10%`, `1 / 10 points`, `Time used 52s`, `Answered 1 / 9`, `Correct 1`, `Submitted 26 Oct 2026, 08:03 UTC`, per-skill breakdown (N1, N2b) |
| 12 | Not-found states for missing assessments/attempts | **PARTIAL — defect P51-D1** | Student: missing assessment → **404**; `take?attempt=<bogus>` → **307** back to the overview; `result?attempt=<bogus>` → falls back to the student's own latest result (no cross-user leak). Teacher: `/teacher/results/<missing>` → **HTTP 500** with "Something went wrong… Result not found." (F12, N3, probe51i) |
| 13 | Audio questions use the Phase 50 shared player | **IMPLEMENTED** | Question 8 of Quiz 2 renders `AudioPlayer` with `/audio/numbers-1.mp3`, `duration=3.39`, `readyState=4`, seek `max=3.39` — the Phase 50 duration fix holds in the client-mounted runner (E1/E2) |

**Duplicate prevention (requirement #6) — IMPLEMENTED:** with an attempt in progress the overview offers **Resume**, not a second Start (F1); `POST /api/assessments/{id}/start` called twice returned the *same* attempt id and the DB held exactly **1** row (G4).

---

## 3. Confirmed defects

### P51-D1 — Teacher attempt-detail route returns HTTP 500 for a missing attempt (MEDIUM)

**Repro**
1. Sign in as `sara.whitfield`.
2. Request `/teacher/results/does-not-exist-51` (e.g. a stale bookmark or a deleted attempt link).

**Expected** — a 404 / "not found" page, consistent with every other detail route and with Phase 46's fix.
**Actual** — `HTTP 500`; body renders the generic crash screen plus the raw API message:

```
Something went wrong  An unexpected error occurred. The issue has been logged — please try again.
Go home  Try again  Result not found.
```

**Evidence** — `evidence/p51/p51-N3-teacher-missing-500.png`; direct request `status=500` (probe51i), reproduced twice.

**Root cause** — `src/app/(app)/teacher/results/[attemptId]/page.tsx` calls `getResultForStaff(viewer, attemptId)`, which throws `ApiError(404, "Result not found.")` (`src/lib/assessment/queries.ts`). A thrown `ApiError` inside a **page** (not an API route) is not converted to `notFound()`, so Next renders the error boundary with status 500. The student page avoids this by never throwing: it resolves the attempt itself and renders a "No results yet" state.

**Smallest fix (not applied yet)** — in that page, wrap the lookup:

```ts
let result;
try { result = await getResultForStaff(viewer, attemptId); }
catch (e) { if (e instanceof ApiError && e.status === 404) notFound(); throw e; }
```

`notFound()` before streaming begins yields a real 404 (`not-found.tsx` already exists at the app root — Phase 46). Owner-only `403` must keep propagating as an error, not become a 404 — the check must be `status === 404`.

**Product decision to confirm:** whether a teacher opening *another teacher's* student attempt should see 403 or 404. Today: 403 ("This student is not in your groups."). Leave as is unless the product owner says otherwise; do **not** silently convert 403 into 404.

---

### P51-D2 — "Submit now" is a 21 px tap target on mobile (LOW)

**Repro** — open any quiz runner at 375×812; measure the `Submit now` link above the action bar.
**Expected** — the app's other controls are ≥44 px (`min-h-11` / `h-12`).
**Actual** — `height = 21px`, full-width text link; the runner is otherwise free of overflow (`scrollWidth = clientWidth = 375`).
**Evidence** — run `G8` (`small=[{"t":"Submit now","h":21}]`), screenshot `evidence/p51/p51-G8-runner-mobile.png`.
**Root cause** — `src/components/assessment/exam-runner.tsx` renders it as `text-[13px] font-medium` inside a `div.mt-4.text-center`, with no padding.
**Smallest fix (not applied yet)** — add `inline-flex min-h-11 items-center justify-center px-3` to that button (visual identity unchanged). No dependency, no layout redesign.

---

## 4. Observations (not defects — reported, not changed)

| ID | Observation | Why it is not a defect here |
|---|---|---|
| O-1 | Starting a quiz creates the attempt **before** the client navigates (`POST /start` → `router.push('/take?attempt=…')`). On a cold dev server the compile of `/take` can take >9 s, during which the student still sees the overview and `Attempts 0 of 3 used`. | Dev-mode compile latency, not production behaviour; the attempt is created correctly and Resume appears on the next load. Worth a spinner on the confirm button in a future UX pass (the button does show `busy`), but no false state is persisted. |
| O-2 | The lesson/listen-and-type `AudioPlayer` (server-rendered `preload="metadata"`) shows `0:00 / 0:00` and `seek max=0` while `audio.duration = 1.022`; the **same component client-mounted in the exam runner is correct** (`3.39`). | Phase 49/50 scope (audio), not the assessment flow. Recorded here because exam audio is item #13. This contrast is a much sharper repro for that future fix: it is a hydration/initial-mount timing issue, not a decode issue. |
| O-3 | Grading is all-or-nothing per question; a 1-point answer out of 10 total points scores `10%`. | Documented contract (`src/lib/assessment/grading.ts` header); not a bug. |
| O-4 | `result?attempt=<bogus>` silently falls back to the student's latest finished attempt. | Deliberate design in the page ("Resolve which attempt to show: explicit, else the latest finished one"), and it never leaks another student's data. Could confuse a user following a stale link — a candidate product decision, not a defect. |
| O-5 | `POST /submit` during a simulated network failure keeps the attempt `IN_PROGRESS` and shows `Some answers are not saved yet — check your connection. Your answers are kept and will retry…` | Correct, honest behaviour (G5). |
| O-6 | `/icon.svg` is both a `public/` file and a `src/app/` file → every page load logs `A conflicting public file and page file was found for path /icon.svg` and returns 500 for the icon request. | Pre-existing, unrelated to the assessment flow (favicon request only). Flag for a future housekeeping phase. |

---

## 5. Not-found / ownership matrix (runtime)

| Route | Missing record | Result |
|---|---|---|
| `/student/exams/<missing>` | assessment | **404** ✅ |
| `/student/exams/<id>/take?attempt=<bogus>` | attempt | **307** → overview ✅ (no crash, no new attempt) |
| `/student/exams/<id>/result?attempt=<bogus>` | attempt | 200, own latest result ✅ (no leak) |
| `/student/exams/<id>/result` (never attempted) | — | 200 + "No results yet" ✅ |
| `/teacher/results/<missing>` | attempt | **500** ❌ (P51-D1) |
| `POST /api/assessments/<id>/start` ×2 while in progress | — | same attempt id, 1 DB row ✅ |
| double `POST …/submit` | — | 1 request, 1 submission ✅ |

Ownership: `getResultForStudent` filters by `studentId`; `getResultForStaff` restricts `TEACHER` to `visibleGroupIds` (403 otherwise). Both were exercised indirectly (james sees only his own attempts; sara sees her group's).

---

## 6. What this audit does **not** claim

- Not a security review: only ownership/404 behaviour of the routes touched above was exercised.
- No production, staging or shared database was used; all writes went to `/tmp/p51_run1.db`.
- Representative coverage only: 3 of 3 open quizzes were used but not all 26 questions were answered; WORD_ORDER/MATCHING/SPEAKING answer controls were inspected in source and partially exercised, not scored end-to-end.
- No teacher *authoring* flow (create/edit assessment, rubrics, blueprints) was tested.
- No timed auto-submit was exercised (the 10-minute countdown was never allowed to expire).
