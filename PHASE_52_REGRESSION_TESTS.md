# Phase 52 — Regression Tests

**How this was tested:** real Chromium via `playwright-core` from `/tmp` (never added to `package.json`), dev server `next dev -p 4052` on disposable DB `file:/tmp/p52_run1.db`, plus direct Prisma query tests for the authorization contract. Every result is labelled `REAL` / `SOURCE-ONLY` — nothing was mocked.

## 1. Browser before/after harness — `p52_measure.mjs`

Same script for both runs: `node p52_measure.mjs before <quizId>` and `node p52_measure.mjs after <quizId>`. It logs in via `POST /api/auth/login` and drives real navigation, measuring HTTP status, response body markers, rendered text, and element geometry.

| ID | Name | Before (REAL) | After (REAL) | Evidence |
|---|---|---|---|---|
| T1 | Missing attempt on `/teacher/results/[attemptId]` | **FAIL** `HTTP 500 body="(other)"` | **PASS** `HTTP 404 body="404"` | `measure-before.json` → `measure-after.json`; `p52-*-T4-missing-attempt.png`; server log `500 in 2826ms` → `404 in 428ms` |
| T2 | Foreign attempt (learner outside teacher's groups) | `HTTP 500 learnerDataRendered=false` — **preserved** | `HTTP 500 learnerDataRendered=false` — **preserved** | `measure-*.json`; `p52-*-T5-foreign-attempt.png`; server log `status:403` but boundary `500`; see §2 |
| T3 | Own-group attempt (positive control) | **PASS** `HTTP 200 learnerRendered=true` | **PASS** `HTTP 200 learnerRendered=true` | `measure-*.json`; `GET /teacher/results/cmvoz7kl400038vk7thc181w2 200` |
| T4 | Rendered page for missing attempt (browser) | `OBS` `Something went wrong … Result not found.` `HTTP 500` | `OBS` `Page not found … Back to dashboard` `HTTP 404` | screenshots |
| T5 | Rendered page for foreign attempt (browser) | `OBS` `Something went wrong … This student is not in your groups.` `HTTP 500` | `OBS` `Something went wrong … This student is not in your groups.` `HTTP 500` | screenshots |
| M1 | Submit-now tap target at 375 px | **FAIL** `height=21px width=68px` | **PASS** `height=44px width=92px (≥44)` | `p52-*-M1-runner-375.png`; `box={"w":67.92,"h":20.80}` → `box={"w":91.92,"h":44}` |
| M2 | No horizontal overflow at 375 px | **PASS** `scrollW=375 clientW=375` | **PASS** `scrollW=375 clientW=375` | geometry measurement |
| M3 | Submit-now does not overlap Prev/Next | **PASS** `overlaps=false` | **PASS** `overlaps=false` | geometry vs nav button rects |
| S1 | Repeated submit sends exactly one request | **PASS** `POSTs=1 [200]` | **PASS** `POSTs=1 [200]` | `response` event count on `…/submit` |
| S2 | Submission lands on rendered result | **PASS** `url=/…/result?attempt=… percent=0 ✗ Not Passed` | **PASS** `url=/…/result?attempt=… percent=0 ✗ Not Passed` | `p52-*-S2-result.png` |

**Before totals:** 5 PASS, 3 FAIL, 2 OBS (10 rows).  
**After totals:** 7 PASS, 1 FAIL, 2 OBS (10 rows) — the remaining FAIL is T2, which is intentionally `500` (see §2; it is not a regression, it is preservation).

Raw JSON retained at `evidence/p52/measure-before.json` and `evidence/p52/measure-after.json` with ISO timestamps `2026-10-26T08:11:50Z` (after) and corresponding before timestamp.

## 2. Authorization contract — query-level (REAL DB, SOURCE-ONLY browser status)

The dev server's page boundary returns `500` for any thrown `ApiError(403)` — this is existing framework behaviour, not a new defect. To verify the contract was not weakened, the three cases were exercised directly via `getResultForStaff` against the same disposable DB and `TEACHER` viewer:

```
404 case: status=404 msg=Result not found. → PASS
403 case: status=403 msg=This student is not in your groups. → PASS
200 case: score=8 → PASS
```

This proves: missing → `404`, foreign-group → `403` (not converted to `404`), own-group → real result. No assertion was changed to force a pass.

Label: `SOURCE-ONLY` for HTTP-status framing (query throws `403`, Next page boundary renders it as `500`); `REAL` for data (real Prisma, real group membership via `visibleGroupIds`).

## 3. Phase 51 scenario regression

The identical journey was re-driven after the fixes (same quiz family, same learner `james.carter`):

- Start → Take → Answer → Submit → Result still works (S1/S2 PASS).
- No duplicate submit (S1), no duplicate attempt (`POST /start` reuse, verified in T3's control), result persists (S2 URL carries `attempt=`).
- Teacher search/list was already covered by Phase 46's BUG-01 regression (search narrows by student/assessment/combination) — re-run below, still PASS.

## 4. Existing automated suites (after fixes)

All run with `. /home/user/.local/share/lms-runtime/node-v22.23.3-linux-x64/env.sh` on the original DB (not the disposable copy):

| Suite | Result | Notes |
|---|---|---|
| `npm run typecheck` (`tsc --noEmit`) | ✅ PASS (exit 0, ~10s) | Two new imports (`ApiError`, `Awted<>`) type-check clean |
| `npm test` (full) | ✅ PASS | 13 passed in `test:api-safety` etc. + `test:phase46` 10 passed + `test:phase47` 6 passed + `test:phase50` 17 passed = all green (`EXIT:0`, ~6.7s) |
| `npm run release:verify` (`typecheck && npm test && build:safe`) | ✅ PASS | Next `15.5.27` build completed, all `ƒ` routes including `/teacher/results/[attemptId] 194B 106kB` and `/student/exams/[id]/take 6.86kB 113kB` — full bundle listing retained in log (`EXIT:0`, ~129s) |

No test was weakened, no assertion changed, no production guard altered.

## 5. Mobile layout checks

Included in §1 (M1–M3) at exact viewport `375×812`:

- `Submit now` now `44×92` (was `21×68`), centered `inline-flex`, `px-3` padding verified in DOM (`className` contains `min-h-11`).
- `scrollWidth ≤ clientWidth` — no overflow introduced.
- No overlap with Prev/Next buttons (checked via `getBoundingClientRect` of all three).

## 6. What was not tested (explicit limitations)

- No physical microphone, no audible TTS/STT hardware — out of scope for this phase (Phase 49/50 scope).
- `forbidden()`/`forbidden.tsx` 403 rendering: app has no `forbidden.tsx`; adding it would be a separate feature, not a minimal fix. The current `500` boundary with the correct message is documented as preserved behaviour.
- Production/staging deploy probes: not run (no credentials, no production access).

## 7. Evidence inventory

All under `evidence/p52/` (and retained raw JSON):

- `measure-before.json`, `measure-after.json` — full 10-row results with HTTP status, body markers, geometry
- `p52-before-M1-runner-375.png` / `p52-after-M1-runner-375.png` — 375 px runner with bounding-box measurement
- `p52-before-S2-result.png` / `p52-after-S2-result.png` — result page after submission
- `p52-before-T4-missing-attempt.png` / `p52-after-T4-missing-attempt.png` — missing-attempt page (500 → 404)
- `p52-before-T5-foreign-attempt.png` / `p52-after-T5-foreign-attempt.png` — foreign-attempt page (500 preserved)
- `p52_measure.mjs` — harness source (Playwright from `/tmp`, no `package.json` change)

Server log excerpts (`/tmp/p52_server.log`) show the exact status transitions cited above; no secrets or PII in logs.

