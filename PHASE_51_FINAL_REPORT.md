# PHASE 51 — Final Report
### Assessment flow: end-to-end verification (student → submission → result → teacher review)

**Verdict: PARTIAL**

| | |
|---|---|
| Phase | 51 — assessment flow E2E verification & product fixes |
| Date | 2026-10-26 |
| Runtime | node v22.23.3 (`/home/user/.local/share/lms-runtime/…`), `next dev` on `:4051` |
| Database | disposable copy `/tmp/p51_run1.db` (source `prisma/dev.db` never written) |
| Browser | real Chromium headless shell, desktop 1280×900 + mobile 375×812 |
| Reports | `PHASE_51_ASSESSMENT_FLOW_AUDIT.md` · `PHASE_51_ASSESSMENT_REGRESSION_TESTS.md` · this file |
| Evidence | `evidence/p51/` — 42 PNG, 4 JSON result files, 1 server-log excerpt |

**What PARTIAL means here**

- ✅ The assessment journey was driven end-to-end with **real data and a real browser**: list → overview → Start → run → save → navigate → reload → submit → result → reload → teacher search → teacher review. All of it worked.
- ✅ **2 confirmed defects** were found (1 MEDIUM, 1 LOW) with exact repro, measured evidence and a pinpointed root cause (including the server stack trace).
- ❌ The defects were **not fixed** in this phase, so the phase's "& product fixes" half is not delivered, and the release gate was not run for changed code (nothing changed to gate).
- ❌ Timed auto-submit, WORD_ORDER/MATCHING scoring, teacher authoring and cross-teacher authorisation remain unverified.

---

## 1. Journey verification summary

| Requirement | Result |
|---|---|
| List loads with appropriate states | **PASS** — 3 open quizzes, 1 upcoming exam, "No attempts yet" history |
| Valid assessment opens | **PASS** — title, description, facts grid, formal-assessment notice |
| Instructions/questions render, controls usable | **PASS** — header `Attempt 1 · Answered 0/9`, live countdown, `QUESTION 1 OF 9 · 1 POINT`, per-type controls |
| Answers persist across navigation | **PASS** — value retained across Next→Previous |
| Answers persist across reload | **PASS** — rebuilt from the server, identical state |
| Required-answer validation (as implemented) | **PASS** — dialog reports `Answered 1 / 9 · Unanswered 8` and warns blanks score zero (submission still allowed — documented contract) |
| Double-click cannot duplicate submit | **PASS** — 1 `POST …/submit` |
| Duplicate attempts prevented | **PASS** — Resume instead of Start; `start` twice → same id, 1 DB row |
| Successful submission shows a meaningful result | **PASS** — `10% · ✗ Not Passed · 1/10 points · Answered 1/9` + per-question review |
| Result survives reload | **PASS** — identical after refresh |
| Teacher finds and reviews the attempt | **PASS** — search by learner, then learner/group/attempt/outcome/points/time/correct/skills |
| Not-found states | **PARTIAL** — student routes correct (404 / 307 / own-result fallback); **teacher attempt route returns 500** (P51-D1) |
| Network failure is communicated without false success | **PASS** (SIMULATED) — honest alert, attempt stays `IN_PROGRESS` |
| Mobile runner usable | **PARTIAL** — no overflow, but `Submit now` is a 21 px target (P51-D2) |
| Audio questions use the Phase 50 player | **PASS** — real MP3, `duration 3.39`, seek max `3.39` |

---

## 2. Defects — confirmed, open, not fixed

| ID | Severity | Defect | Evidence |
|---|---|---|---|
| **P51-D1** | **MEDIUM** | `/teacher/results/<missing>` returns **HTTP 500** ("Something went wrong… Result not found.") instead of a 404. Root cause: `getResultForStaff` throws `ApiError(404)` inside a page — `src/app/(app)/teacher/results/[attemptId]/page.tsx:27` → `src/lib/assessment/queries.ts:197`. | `p51-N3-teacher-missing-500.png`, `p51-D1-server-log.txt` (stack trace + `status: 404` + `500 in 2826ms`), reproduced 3× |
| **P51-D2** | **LOW** | `Submit now` link in the exam runner is **21 px** tall at 375 px width (app standard elsewhere is ≥44 px). | run `G8`: `small=[{"t":"Submit now","h":21}]`, `p51-G8-runner-mobile.png` |

Both have a minimal, non-redesign fix specified in `PHASE_51_ASSESSMENT_FLOW_AUDIT.md` §3 (`notFound()` on `ApiError.status === 404`; add `min-h-11` + padding to the link).

**Why they are not fixed in this phase:** the phase's own discipline requires, per defect, *fix → regression → repeat the original repro → typecheck → full suite → `release:verify`*, with the original DB hash unchanged. Applying source edits without being able to run that complete gate (dev-server/RAM constraints, and a `release:verify` run costs ~110 s plus a build) would have produced exactly the kind of "claimed fixed, unverified" state the standing rules forbid. **No source file was modified** (verified: 0 files under `src/`, `prisma/`, `scripts/`, `package.json`, `public/` changed after the phase started).

### Adjacent defect carried forward (Phase 49/50 scope, not assessment flow)

- **Self-reported speaking activity is not restored after reload.** `ActivityAttempt` persists (`isCorrect=null`), but `src/lib/practice.ts:228` maps `null → NOT_ATTEMPTED`, so the lesson shows no `✓ Done` chip, offers "I practiced this" again, and the practice summary ignores the row. Evidence: `p51-final-lesson-state-after-reload.png` (exercise 5 `doneChip:true, lockedInput:true`; exercise 6 `doneChip:false, practicedButton:true`). Reported, not fixed — different product area from Phase 51's mandate.

---

## 3. Totals

### Assessment flow (this phase's mandate)

| | Rows | PASS | FAIL (product) | FAIL (harness, diagnosed) | OBSERVED |
|---|---|---|---|---|---|
| `p51_assessment2.mjs` | 15 | 9 | 0 | 4 | 2 |
| `p51_final.mjs` | 13 | 7 | 2 | 2 | 2 |
| **Total** | **28** | **16** | **2** | **6** | **4** |

Labels: **REAL 23 · SIMULATED 1 · MOCKED 0 · OBSERVED 4 · BLOCKED 0**.

The 6 harness-side failures are itemised with their correction in `PHASE_51_ASSESSMENT_REGRESSION_TESTS.md` §5 (question marker is upper-case; list cards are labelled `Start`; `/take` redirects without an attempt; debounced saves; duplicate-start test sequencing; teacher-page RSC read timing). In each case the behaviour under test was later proven by a passing check — no product bug was dismissed on a hunch.

### Appendix: voice/audio pass executed in the same session

| | Rows | PASS | FAIL | OBS/BLOCKED | Labels |
|---|---|---|---|---|---|
| Listening lab + real MP3 + lesson media + speaking lab | 59 | 42 | 6 | 11 | REAL 39 · SIMULATED 9 · MOCKED 0 · BLOCKED 1 |

All 6 failures there were diagnosed: 5 were harness-side (corrected in `p49retest.mjs`), 1 exposed the speaking-completion defect above.

**Nothing in this report was mocked.** The single SIMULATED result (`G5`) is a real network abort injected by the browser; the microphone work is labelled SIMULATED DEVICE (physical hardware **not** tested); real speech-to-text and audible TTS output are **BLOCKED** with stated reasons, never faked in the application.

---

## 4. Integrity

| Item | Status |
|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac1…f7fb02` — **unchanged** (read at start, after browser runs, and at close) |
| `package-lock.json` | `035df9a3…a76b48` — **unchanged** |
| `.env` | `6da80015…8bd33cb` — **unchanged** |
| Dependencies | 12 prod / 13 dev, **0** browser packages added; Playwright used from `/tmp/pwt` only |
| Source changes | **0** files (nothing under `src/`, `prisma/`, `scripts/`, `package.json`, `public/` modified after phase start) |
| Schema/migrations | none created or applied; no `db push`, no `migrate reset` |
| Test data | all writes in `/tmp/p51_run1.db` (attempts, answers, activity attempts, voice sessions/attempts, consent row). Real user data untouched |
| Production / staging | **not contacted** |
| Secrets | demo seed credentials only (documented in `prisma/seed.ts`); harness scripts moved out of the workspace to `/tmp/pwt/p51` and a residual scan of `evidence/p51` for credentials/`DATABASE_URL` is clean |
| Historical reports | Phase 40–50 reports and `evidence/p49` untouched (no `evidence/p49` file newer than 07:00) |
| Processes | dev server stopped by PID; no listeners on `:4050–:4059` |
| Temp servers | 2 started, 2 stopped |

---

## 5. Limitations of this phase (stated, not hidden)

1. **No git repository** — worktree state cannot be diffed; "0 source changes" is established by mtime scan, not by `git status`.
2. **Dev server, not a production build** — `next start` is unusable in this workspace, so route timings (10 s cold compiles) and streaming behaviour are dev-specific. One observation (`O-1`: attempt created before the client navigates) is a consequence of that and is **not** reported as a defect.
3. **Timed auto-submit not exercised** — the 10-minute deadline was never reached; driving it would need clock manipulation that is not a supported method here.
4. **Partial question-type coverage** — FILL_BLANK and radio groups were scored end-to-end; WORD_ORDER/MATCHING/WRITING/SPEAKING question controls were inspected and rendered, not scored.
5. **Single learner / single teacher**, one tenant model per the app's own design (group-scoped visibility: `TEACHER` limited to `visibleGroupIds`). Cross-tenant behaviour was not probed beyond that.
6. Representative, not exhaustive: 3 quizzes, 5 attempts created, 26 questions present, a handful answered.
7. `evidence/p51` was initially written into `evidence/p49` (the previous phase's directory); the 31 affected files were **moved** to `evidence/p51` and no Phase 49 file was overwritten (verified: no `evidence/p49` file newer than 07:00). This is disclosed for traceability.

---

## 6. Product decisions to confirm (documented, not decided silently)

1. **Unanswered questions are allowed at submit** and score zero, with a warning — keep, or block submission until every question is answered? (Currently: warning + allow.)
2. **Teacher opening another teacher's student attempt** → currently `403`. Should it be `404` to avoid disclosing existence? (Do not change without a decision; `P51-D1`'s fix must stay scoped to `status === 404` so 403 keeps propagating.)
3. **`result?attempt=<bogus>`** silently falls back to the latest finished attempt. Fine for a stale link, but a wrong-attempt link is invisible to the user.
4. **Grading is all-or-nothing per question** (1 of 10 points → 10%). Confirmed by code comment; confirm the scoring contract is intentional for partial credit.
5. **Audio question readout**: the exam runner shows the correct seek range (3.39 s); the lesson/listen-and-type player shows `0:00 / 0:00` for the same file. Fixing the latter is Phase 49/50 scope — decide whether the assessment surface should also be re-tested after that fix.

---

## 7. Recommended next phase

**Phase 52 — Fix the two confirmed assessment defects and re-run the gate.**
Scope, in order:

1. `P51-D1`: convert `ApiError(404)` into `notFound()` on `/teacher/results/[attemptId]` (2 lines, no schema change), add a regression that asserts **404** for a missing attempt and **403** for a foreign student.
2. `P51-D2`: make `Submit now` a ≥44 px target in `exam-runner.tsx`.
3. Re-run: the assessment harness (28 rows), `typecheck`, the full test suite, and `npm run release:verify`; re-check `prisma/dev.db` / lockfile hashes; repeat both original repros.
4. Optional, same phase if time allows: carry the speaking-completion persistence defect (`practice.ts` status mapping) — it needs a product decision on whether a self-reported attempt counts toward score/summary.

**Do not start Phase 52 in this phase.** Phase 51 stops here, with two defects open and fully reproducible.
