# Phase 52 — Assessment Fixes (P51-D1, P51-D2)

**Verdict on fixes:** Both defects reproduced before the change, both re-measured after the change with the identical harness. P51-D1 and P51-D2 are fixed; foreign-teacher authorization is preserved.

## 1. Scope and evidence inspected before editing

Read: `PHASE_51_ASSESSMENT_FLOW_AUDIT.md` · `PHASE_51_ASSESSMENT_REGRESSION_TESTS.md` · `PHASE_51_FINAL_REPORT.md` plus `PHASE_50_AUDIO_BUG_FIXES.md` for context. The repository is not a git repo; baseline SHA-256 was recorded before any edit:

- `prisma/dev.db` `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`
- `package-lock.json` `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48`

Implementation files inspected as written (not assumed from the Phase 51 report):

- `src/app/(app)/teacher/results/[attemptId]/page.tsx` — server component, called `getResultForStaff(viewer, attemptId)` with no error handling; any `ApiError` propagated to the global error boundary.
- `src/lib/assessment/queries.ts:195-205` — `if (!attempt) throw new ApiError(404, "Result not found.")` and `if (viewer.role==="TEACHER" && !groups?.includes(...)) throw new ApiError(403, "This student is not in your groups.")`.
- `src/lib/api-errors.ts:6-14` — `class ApiError extends Error { status: number }` used by API routes via `handleApiError`; pages had no mapping for it.
- `src/components/assessment/exam-runner.tsx:301-307` — `Submit now` was `<button className="text-[13px] font-medium text-primary hover:underline">` with no padding/min-height.
- Existing tests: `scripts/test-phase46-regressions.ts` (BUG-01/BUG-02/TASK-2, disposable DB), `scripts/test-phase47-loading-boundaries.ts`, `scripts/test-phase50-audio.ts`, plus `npm test`, `npm run typecheck`, `npm run release:verify`.

Unrelated user changes: none detected (see §7, integrity). Display language: English.

## 2. P51-D1 — Missing teacher result returned HTTP 500 instead of 404

### Repro (Phase 51, repeated verbatim here)

1. Disposable DB `/tmp/p52_run1.db` seeded from `prisma/dev.db` (real fixture: `sara.whitfield` owns groups `cmujpng6g0005wcf3r5b4w1v9` etc., learner `anna.kowalski` is outside those groups).
2. Sign in as `sara.whitfield / Teacher#Demo1` via `POST /api/auth/login`, carry cookies.
3. `GET /teacher/results/does-not-exist-52` on dev server `:4052`.

**Before fix — measured REAL:**

- HTTP status: `500` (body marker `(other)`)
- Browser text: `Something went wrong An unexpected error occurred. The issue has been logged — please try again. Go home Try again Result not found.`
- Server log: `Error: Result not found. at getResultForStaff (src/lib/assessment/queries.ts:197:23) ... status: 404 ... GET /teacher/results/does-not-exist-52 500 in 2826ms`

This is the same stack trace Phase 51 captured in `evidence/p51/p51-D1-server-log.txt`.

### Root cause

`getResultForStaff` correctly throws `ApiError(404)` for a missing attempt so API routes can answer with a typed status. The page component `StaffResultPage` awaited it without a `try/catch`, so Next.js treated the thrown `ApiError` as an unhandled error and rendered the global error boundary as `500`. The bug is *where* the 404 is produced (query) vs *where* it must be translated for a page (the page itself).

### Smallest compatible fix

Edited one file: `src/app/(app)/teacher/results/[attemptId]/page.tsx`

```diff
+import { ApiError } from "@/lib/api";
 
   const viewer = { id: user.id, role: user.role, groupId: user.groupId };
-  const result = await getResultForStaff(viewer, attemptId);
+  let result: Awaited<ReturnType<typeof getResultForStaff>>;
+  try {
+    result = await getResultForStaff(viewer, attemptId);
+  } catch (err) {
+    if (err instanceof ApiError && err.status === 404) notFound();
+    throw err;
+  }
```

Rules enforced:

- Only `status === 404` is converted to `notFound()`.
- Every other error — notably `403` for a learner outside the teacher's groups — is re-thrown unchanged. No broad catch, no silent swallow, no query/auth change, no schema change.

### After fix — measured REAL

- HTTP status: `404` (body `"404"`)
- Browser text: `Page not found The page you are looking for does not exist or may have been moved. Back to dashboard`
- Server log: `GET /teacher/results/does-not-exist-52 404 in 428ms` (no stack trace)
- Positive control still `200`: `GET /teacher/results/<own-group attempt> 200` with learner name rendered.

Evidence files (all in `evidence/p52/`): `measure-before.json`/`measure-after.json`, `p52-before-T4-missing-attempt.png` → `p52-after-T4-missing-attempt.png`, server log excerpts retained in `measure-*.json`.

### Foreign-teacher case (403) — preserved, not converted

Requirement: a real attempt belonging to a learner outside the teacher's authorized group still returns the product contract's `403` and is not turned into `404`.

- **Before fix:** `GET /teacher/results/cmvoz7kl200018vk7bqbl1gsy` → `500` body `This student is not in your groups.` — stack `throw new ApiError(403, ...)` at `queries.ts:201:13`.
- **After fix:** identical: `500` body `This student is not in your groups.` — stack unchanged, `status: 403`.

The dev server's page error boundary always returns HTTP `500` for a thrown `ApiError(403)` (Next.js `15.5.27` has no automatic 403 mapping for pages; `forbidden()`/`forbidden.tsx` is not configured in this app). The *contract* is still enforced at the query layer, and the user-visible message is correct. To prove preservation without claiming a browser `403` that was never observed:

- **Route/integration test — SOURCE-ONLY / REAL DB query:**

```
404 case: status=404 msg=Result not found. → PASS
403 case: status=403 msg=This student is not in your groups. → PASS
200 case: score=8 → PASS
SUMMARY 404=true 403=true 200=true
```

This runs `getResultForStaff` directly against the disposable DB copy (real `PrismaClient`, real `visibleGroupIds`, same `TEACHER` viewer used by the browser test). It confirms the authorization rule was not weakened and the fix distinguishes `404` from `403`.

No existing test was altered to force this pass.

## 3. P51-D2 — Mobile submit target only 21 px tall

### Repro

1. Sign in as `james.carter / Student#Demo1`.
2. `GET /student/exams/<quiz-with->1-question>` → `Start Quiz` → confirm → `/student/exams/<id>/take?attempt=...`
3. Measure at `375×812` (`isMobile: true, hasTouch: true`).

**Before fix — measured REAL:**

- Bounding box: `{"x":153.53,"y":673,"width":67.92,"height":20.80}` → `height=21px width=68px (target ≥44)`
- No overflow (`scrollW=375 clientW=375`), no overlap with Prev/Next, but fails WCAG/applied touch-target standard.

Screenshot: `p52-before-M1-runner-375.png`.

### Root cause

The button had only `text-[13px]` with no padding or minimum height, so its box was exactly the text line box.

### Smallest compatible fix

Edited one file: `src/components/assessment/exam-runner.tsx`

```diff
-          <button type="button" onClick={() => setSubmitOpen(true)} className="text-[13px] font-medium text-primary hover:underline">
+          <button
+            type="button"
+            onClick={() => setSubmitOpen(true)}
+            className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-[13px] font-medium text-primary hover:underline"
+          >
             Submit now
           </button>
```

`min-h-11` is `44px` (Tailwind `h-11 = 2.75rem = 44px`), `px-3` adds horizontal padding, `inline-flex items-center justify-center` centers the label, `rounded-lg` keeps the existing visual idiom. No redesign, no repositioning, no wording or behavior change.

### After fix — measured REAL

- Bounding box: `{"x":141.53,"y":551.80,"width":91.92,"height":44}` → `height=44px width=92px (target ≥44)` — `PASS`
- No overflow (`scrollW=375 clientW=375`) — `PASS`
- No overlap with Prev/Next (`overlaps=false`) — `PASS`
- Submission still single-request (two rapid clicks → `submit POSTs=1 statuses=[200]`) and result renders `0% ✗ Not Passed` with correct URL change to `/result?attempt=...`

Screenshot: `p52-after-M1-runner-375.png`.

## 4. What was not changed

- `src/lib/practice.ts` — speaking-completion persistence issue documented in Phase 51 is **deferred** per Phase 52 §7. No edit was needed for the assessment fixes.
- No schema, migration, dependency, `package-lock.json`, or unrelated refactor.

## 5. Files changed

| File | Change | Reason |
|---|---|---|
| `src/app/(app)/teacher/results/[attemptId]/page.tsx` | Import `ApiError`, wrap `getResultForStaff` in `try/catch` with `notFound()` only on `status===404` | P51-D1 — correct HTTP status, preserve 403 |
| `src/components/assessment/exam-runner.tsx` | `className` → `inline-flex min-h-11 items-center justify-center rounded-lg px-3 ...` | P51-D2 — 44 px touch target |

Both edits are two-line-equivalent, reversible, and scoped to the reported defect.

