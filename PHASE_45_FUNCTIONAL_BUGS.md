# PHASE 45 — Functional Bugs
## Confirmed defects, reproduced in a real browser

**Date:** 2026-10-25 · **Browser:** Chromium 156 headless · **App:** `http://localhost:4044` (dev, disposable DB)

> **Scope note.** Two earlier "suspicions" are recorded here as **NOT bugs** because verification disproved them (see §4). One Phase 44 finding is now **confirmed** in a browser. One is **downgraded** on UX grounds. Nothing in this file is inferred from source alone.

---

## Confirmed bugs

### BUG-01 · Teacher Results page has no search — grading workflow cannot target a record

| Field | Value |
|---|---|
| **ID** | BUG-01 |
| **Feature / page** | Teacher → Results (`/teacher/results`) |
| **Severity** | **High** |
| **Reproduced** | Yes — 1 browser run + corroborated by Phase 44 source scan |
| **Screenshot** | `evidence/D2-teacher-results.png` |

**Reproduction**
1. Sign in as `sara.whitfield` (teacher).
2. Open **Results** from the sidebar (`/teacher/results`).
3. Look for a way to find one student's or one assessment's result.

**Expected:** a search box (and ideally a group/assessment filter), matching the capability already present on `/admin/users`.

**Actual:** the page renders **0 search inputs** and **3 `<select>` filters**. Measured in-browser:

```
search inputs = 0
selects       = 3
heading       = "Assessment results"
```

**Evidence:** `evidence/D2-teacher-results.png`; DOM count taken with
`page.locator('input[type=search], input[placeholder*=Search i]').count()` → `0`.

**Impact:** this is the teacher's everyday grading screen. Once a class produces results, locating one submission means paging manually. `/admin/users` proves the capability exists in the codebase — it just was not applied here.

**Minimal fix:** reuse the existing `UsersPage` search/filter bar (`src/components/admin/users/users-page.tsx`) on the results list. No new component needed.

---

### BUG-02 · Detail pages return HTTP 200 for records that do not exist (soft 404)

| Field | Value |
|---|---|
| **ID** | BUG-02 |
| **Feature / page** | `/admin/users/[id]`, `/teacher/classes/[id]` — pattern likely wider |
| **Severity** | **Medium** |
| **Reproduced** | Yes — HTTP status captured twice (Phase 44 `curl`, Phase 45 browser) |
| **Screenshot** | — (status-code defect; the visible UI is correct) |

**Reproduction**
1. Sign in as `admin`.
2. Navigate to `/admin/users/cmuno000000000000000000000` (a well-formed but non-existent id).
3. Compare with `/student/no-such-thing-p45`.

**Expected:** `404`.
**Actual:** `200` with the copy *"User not found. This account may have been removed or the link is incorrect. Back to users."* Meanwhile a genuinely unknown URL correctly returns `404` and the custom not-found screen.

Same pattern on `/teacher/classes/<invalid>` → `200`.

**Impact:** link checkers and monitoring cannot detect broken links; the application's own 404 telemetry under-reports. **User experience is not harmed** — the empty state is clear and offers a way back. This is a contract/observability bug, not a UX bug, and should be prioritised accordingly.

**Minimal fix:** call Next's `notFound()` in these detail routes when the record is absent, so the existing `not-found.tsx` renders with a real 404 status.

---

### BUG-03 · Duplicate and competing submission controls on the exam screen

| Field | Value |
|---|---|
| **ID** | BUG-03 |
| **Feature / page** | `/student/exams/[id]/take` |
| **Severity** | **Low** |
| **Reproduced** | Yes — observed in the DOM in every take-page run |

**Reproduction**
1. Start an exam as a student.
2. Inspect the action row: `Previous`, `Next`, **`Submit now`**, plus several unlabelled buttons (`'3' '4' '5' '6' '7' '8'`, `'More'`).
3. Open the submit dialog: it offers **`Keep working`** and **`Submit final answers`**.

**Expected:** one unambiguous route to submit.
**Actual:** `Submit now` is present in the persistent action bar *and* the question navigator's numbered buttons are exposed as `<button>` elements with single-character accessible names, alongside `More`. During a timed exam the submit control sits next to next-question navigation with no visual separation.

**Impact:** a stressed student can mis-click `Submit now` instead of `Next`. The confirmation dialog is the real protection and it does work (`Keep working` is offered), so severity stays Low — but the proximity is unnecessary.

**Evidence:** `/tmp/pwt` run output — buttons on the take page:
`['Previous','Next','Submit now','More']` and per-question `['3','4','5','6','7','8']`.

**Minimal fix:** move `Submit now` to the far right, visually separated (or into the header), and give the numbered navigator buttons descriptive `aria-label`s ("Go to question 3") rather than bare digits.

---

## 3. Separate: confirmed-good behaviour that looked suspicious

Recorded so a future phase does not re-litigate them.

| # | Looked like a bug | Verdict | Proof |
|---|---|---|---|
| 1 | Exam scoring produces "1 / 10 points" from 8 questions | **NOT A BUG** | Question points are 1,1,1,1,1,**2,2**,1 — sum **10**. Verified against `prisma` directly and against the result page |
| 2 | Student dashboard total in `/admin` (78 students / 8 teachers / 5 groups / 87 users) looked arbitrary | **NOT A BUG** | Exactly matches `prisma.user.groupBy` and `learningGroup.count()` |
| 3 | Notification preference reverted after toggling | **NOT A BUG** | The page has **14 per-section Save buttons**; my first test never pressed one. With `Save ACADEMIC` pressed, the value persisted across a full reload (verified, then restored) |
| 4 | Clicking "Start Quiz" appeared to do nothing | **NOT A BUG** | A confirmation dialog opens first (`Cancel` / `Start Quiz`); my selector grabbed the wrong element and raced hydration. With a scoped click it navigates and the exam loads |
| 5 | Teacher Results appeared completely empty | **NOT A BUG** | No attempt existed at that moment; after submitting one it rendered correctly |
| 6 | Stray sentence fragment at the top of the student dashboard | **NOT A BUG** | Full sentence renders correctly: *"Certificates and official training record. Practice, XP, and the AI tutor do not count toward a certificate."* My first screenshot crop was misleading |

---

## 4. Suspected but **not** confirmed

| ID | Suspicion | Why it stays unconfirmed |
|---|---|---|
| SUS-01 | `loading.tsx` may show a full-page spinner on every navigation (Phase 44 FIND-03) | In dev mode, route transitions complete fast enough that no blank-to-spinner moment was captured. **I did not observe the problem in a browser**, so I will not claim it. It remains a *code-shape* concern (one `loading.tsx` for 110 routes), not a demonstrated defect. Re-test against a production build before acting on it |
| SUS-02 | The report-only CSP would block some first-party script | The only violations seen were the dev-only `unsafe-eval` ones from Next's dev tooling. Cannot judge production behaviour from a dev build |
| SUS-03 | Long-run exam timer drift / auto-submit at expiry | Timer rendered (09:54) but I did not wait out a 10-minute attempt |

---

## 5. Severity summary

| Severity | Count | IDs |
|---|---|---|
| Critical | 0 | — |
| High | 1 | BUG-01 |
| Medium | 1 | BUG-02 |
| Low | 1 | BUG-03 |

**No feature in the tested set is broken.** Every journey that was exercised — login, validation, navigation, exam start → answer → navigate → submit → result, assignment creation, admin search + pagination, preference persistence, sign out — completed successfully and its result persisted where persistence was expected.
