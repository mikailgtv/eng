# Phase 52 — Final Report

**Verdict: PASS — both defects fixed, release gate green.**

Phase 51 verdict was `PARTIAL` (P51-D1 500-vs-404, P51-D2 21-px tap target). This phase delivers the two minimal fixes, repeats the original reproductions, verifies the 403 authorization contract is untouched, and reports the full regression/release results truthfully. Phase 53 is not started.

## 1. Fixes delivered

| ID | Severity | Root cause | Fix (smallest) | Files changed |
|---|---|---|---|---|
| **P51-D1** | MEDIUM | `getResultForStaff` correctly throws `ApiError(404)` for a missing attempt so API routes can answer with a status, but `StaffResultPage` (`src/app/(app)/teacher/results/[attemptId]/page.tsx:27`) awaited it with no error handling, so Next.js rendered the global error boundary as `500`. | In `page.tsx`, import `ApiError` and wrap `getResultForStaff` in `try/catch`: if `err instanceof ApiError && err.status===404` → `notFound()`, else re-throw. No query change, no schema change, no broad catch. | `src/app/(app)/teacher/results/[attemptId]/page.tsx` |
| **P51-D2** | LOW | `Submit now` button had only `text-[13px] font-medium` → line-box `~21px` tall, below the app's `≥44px` touch-target standard. | In `exam-runner.tsx`, add `inline-flex min-h-11 items-center justify-center rounded-lg px-3` — `min-h-11 = 44px`. No reposition, no redesign, no wording/behavior change. | `src/components/assessment/exam-runner.tsx` |

Both diffs are two-line-equivalent, reversible, and scoped. See `PHASE_52_ASSESSMENT_FIXES.md` for the exact patch.

## 2. Before / after — measured, not claimed

Browser: real `chromium_headless_shell-1248` via `playwright-core` from `/tmp` (zero `package.json` changes), `next dev -p 4052`, disposable DB `file:/tmp/p52_run1.db`.

| Check | Before (REAL) | After (REAL) | Status |
|---|---|---|---|
| `GET /teacher/results/does-not-exist-52` HTTP | `500` body `(other)` | `404` body `404` | **Fixed** |
| Browser text for missing | `Something went wrong … Result not found.` | `Page not found … Back to dashboard` | **Fixed** |
| `GET /teacher/results/<foreign-group attempt>` HTTP | `500` msg `This student is not in your groups.` | `500` msg `This student is not in your groups.` | **Preserved** (see §3) |
| Query-level `getResultForStaff` for missing | `ApiError 404 Result not found.` | `ApiError 404 Result not found.` → page `notFound()` | **Proven** |
| Query-level `getResultForStaff` for foreign | `ApiError 403 This student is not in your groups.` | `ApiError 403 …` (unchanged) | **Proven** |
| `Submit now` at 375 px | `21×68` box | `44×92` box (`min-h-11`) | **Fixed** |
| No horizontal overflow | `375=375` | `375=375` | **Preserved** |
| No overlap with Prev/Next | `overlaps=false` | `overlaps=false` | **Preserved** |
| Double-click submit → single POST | `1×200` | `1×200` | **Preserved** |
| Result rendering after submit | `0% ✗ Not Passed` | `0% ✗ Not Passed` | **Preserved** |

Evidence: `evidence/p52/measure-before.json` · `measure-after.json` · `p52-*-M1-runner-375.png` · `p52-*-S2-result.png` · `p52-*-T4-missing-attempt.png` · `p52-*-T5-foreign-attempt.png` · server log excerpts (`GET … 500 in …ms` → `404 in 428ms`).

## 3. Why the foreign-teacher case still shows HTTP 500 in the browser

Next.js `15.5.27` pages have no automatic `ApiError(403)` → HTTP `403` mapping. A thrown `ApiError(403)` in a server component always hits the global error boundary, which returns `500` with the message `This student is not in your groups.` The app has an `/unauthorized` page but no `forbidden.tsx`; adding `forbidden()` would be a new feature, not a minimal fix, and Phase 52's requirements explicitly say *" Preserve existing handling for all other errors. In particular, do not convert `403` into `404`."*

So we report honestly: the browser-observed HTTP status for the foreign case is `500` both before and after (preservation verified), but the *authorization contract* is verified at the query layer:

```
404 case: status=404 msg=Result not found. → PASS
403 case: status=403 msg=This student is not in your groups. → PASS
200 case: score=8 → PASS
```

This is labelled `SOURCE-ONLY` for HTTP-status framing and `REAL` for data (real Prisma, real `visibleGroupIds`). We do not claim a browser `403` that was never observed.

## 4. Regression and release gate

| Gate | Command / env | Result |
|---|---|---|
| Typecheck | `npm run typecheck` (`tsc --noEmit --max-old-space-size=2048`) | **PASS** exit 0 (~10 s) |
| Full test suite | `npm test` (`test:session-rules` → `test:phase50` etc.) | **PASS** — `test:api-safety` 13 passed, `test:phase46` 10 passed, `test:phase47` 6 passed, `test:phase50` 17 passed — total `EXIT:0` (~6.7 s) |
| Release verification | `npm run release:verify` (`typecheck && npm test && build:safe`) | **PASS** — Next build completed, all routes including `ƒ /teacher/results/[attemptId] 194B 106kB` listed, `EXIT:0` (~129 s) |

No test assertion was changed, no guard weakened, no production code was altered to force a pass. The two new lines type-check and build cleanly.

## 5. Data and dependency integrity

| Item | Before | After | Changed? |
|---|---|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` | **No** — all writes on `/tmp/p52_run1.db` |
| `package-lock.json` SHA-256 | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` | **No** |
| `package.json` deps/scripts | checked | checked | **No** new dependency, no script change, no Browser package (Playwright from `/tmp/pw-browsers` only) |
| `prisma/schema.prisma` / migrations | — | — | **No** change |
| Modified source files | — | `src/app/(app)/teacher/results/[attemptId]/page.tsx`, `src/components/assessment/exam-runner.tsx` | **2 files** — both expected |
| Temporary servers/processes | `next dev -p 4052` pid 17109 | killed, no listeners on 4050–4060 | **Cleaned** |
| Historical reports | `PHASE_50_*`, `PHASE_51_*` | untouched | **No** overwrite |
| Secrets in logs/reports | — | — | **None** (no bucket names, tokens, or credentials) |

`svgdev.db` in the task description refers to `prisma/dev.db` (verified SHA above); `svgpackage-lock.json` refers to `package-lock.json`.

## 6. Speaking-completion persistence — deferred

Phase 51 documented that self-reported speaking activity (`src/lib/practice.ts:228` maps `isCorrect=null → NOT_ATTEMPTED`) is not restored as completed after reload. Per Phase 52 §7, `src/lib/practice.ts` was **not modified** — the meaning of a self-reported attempt for progress/scoring needs a separate product decision. Recorded here as an open issue for a future phase; no assessment fix depends on it.

## 7. Remaining issues and next recommended phase

**No assessment defect remains from Phase 51.** The two confirmed defects are closed with measured before/after.

| Known limitation (not a defect in this fix) | Recommendation |
|---|---|
| Teacher `403` renders via error boundary as `500` with correct message (no `forbidden.tsx`) | Future phase: add `src/app/(app)/teacher/results/[attemptId]/forbidden.tsx` and use `forbidden()` for `ApiError(403)` if the design wants a semantic `403` page — requires product decision on 403 vs redirect to `/unauthorized` |
| `icon.svg` conflict (`public/icon.svg` vs `src/app/icon.svg`) → `GET /icon.svg 500` on every page | Low-priority: remove or rename one icon per Next.js docs warning observed in every dev log |
| Speaking-completion persistence (`practice.ts`) | Needs product decision on what counts as completed — track as next candidate phase |

**Recommended next phase:** Phase 53 — either the speaking-completion product decision + fix, or the optional `403` semantic page improvement above. Either can be done independently of the assessment flow, which now meets its definition of done.

## 8. Definition of done — checklist

- [x] P51-D1 fixed: `500` → `404` for missing attempt, re-measured REAL (HTTP + browser + server log)
- [x] P51-D2 fixed: `21px` → `44px` at 375 px, re-measured REAL (geometry + overflow + overlap)
- [x] Foreign-teacher 403 behaviour remains intact (not converted to 404, query-level `403` still thrown, browser message correct)
- [x] Submit still single-request, result rendering still functional
- [x] Full regression + `typecheck` + `release:verify` all PASS, reported with exact commands and exits
- [x] DB/lockfile/deps/schema integrity recorded, no unexpected changes
- [x] Deliverables `PHASE_52_ASSESSMENT_FIXES.md` · `PHASE_52_REGRESSION_TESTS.md` · `PHASE_52_FINAL_REPORT.md` created
- [x] Phase 53 not started

