# PHASE 51 — Assessment Flow: Test Record

Everything below was **executed** against the disposable database `/tmp/p51_run1.db` with a real Chromium browser on dev server `:4051`. Nothing in this file is inferred from configuration.

Label meanings: **REAL** = real app, real DB, real browser · **SIMULATED** = a real failure injected at the network/device layer (no app code changed) · **MOCKED** = a stubbed API response (used only where explicitly stated) · **BLOCKED** = runtime evidence unobtainable · **OBSERVED** = recorded fact, not a pass/fail criterion.

---

## 1. Commands and exit statuses

| Step | Command | Result |
|---|---|---|
| DB copy | `cp prisma/dev.db /tmp/p51_run1.db` | SHA-256 identical to source at copy time (`e9b4eac1…f7fb02`) |
| Server | `DATABASE_URL=file:<disposable copy> NODE_OPTIONS=--max-old-space-size=1536 npx next dev -p 4051 -H 0.0.0.0` | listening on 4051 |
| Harness v1 | `node evidence/p51/p51_assessment.mjs` | superseded — selector assumptions wrong (see §5) |
| Harness v2 | `node evidence/p51/p51_assessment2.mjs` | exit 0, 15 rows |
| Harness final | `node evidence/p51/p51_final.mjs` | exit 0, 13 rows |
| DOM probes | `probe51c/d/e/f/g/h/i.mjs` (in `/tmp/pwt`) | informational |
| Voice/audio pass (appendix) | `p49a_listen.mjs`, `p49cd_speaking.mjs`, `p49retest.mjs`, `p49final.mjs` | 59 rows |

No assertion was modified to obtain a pass: every FAIL row is quoted below with its diagnosis.

---

## 2. Assessment flow — results per check (28 rows)

### 2.1 Harness v2 (`p51_assessment2.mjs`) — 15 rows: 9 PASS / 4 FAIL / 2 OBSERVED

| ID | Check | Kind | Result | Measured |
|---|---|---|---|---|
| F1 | In-progress attempt → Resume offered, no second Start | REAL | **PASS** | resumeBanner=true, startQuizAffordance=false |
| F2 | Resume opens the runner for the same attempt | REAL | FAIL* | URL `/take?attempt=cmvoy…` correct, but the question marker was read as `undefined` (harness regex case) |
| F3 | Answer persisted to the server | REAL | FAIL* | control=choice accepted; the answer POST was asserted before the debounce fired |
| F4 | Answers survive Previous/Next | REAL | FAIL* | `checked=1` before and after the round trip (identical), but the question-number assertion was `undefined` |
| F5 | Reload rebuilds the attempt with the same answer | REAL | **PASS** | `{"checked":1,"text":""}` before and after reload |
| E1 | Audio question uses the shared player with the real file | REAL | **PASS** | `duration=3.39`, `readyState=4`, `numbers-1.mp3`, seek `max=3.39`, question 8 |
| E2 | Duration: decoded vs displayed | OBS | — | decoded 3.39 s; seek max 3.39 (visible position clock not captured — selector collided with the countdown `role="timer"`) |
| F7 | Submit dialog reports answered/unanswered and warns | REAL | **PASS** | `Answered: 1 / 9 · Unanswered: 8 · "Unanswered questions are marked incorrect…"` |
| F8 | Double activation → one submission | REAL | **PASS** | 1 POST, status 200 |
| F9 | Result page shows outcome + review | REAL | **PASS** | `0%` `✗ Not Passed`, review rendered |
| F10 | Result unchanged after reload | REAL | **PASS** | `0%` → `0%`, same label |
| F11 | Never-attempted assessment → "no results yet" | REAL | **PASS** | 200 + "No results yet" |
| F12 | Missing assessment 404 / bad attempt id no leak | REAL | **PASS** | detail 404, take 307, result 200 with own data |
| J1 | Re-calling start returns the same attempt | REAL | FAIL* | sequenced **after** submission, so a new attempt was legitimate; re-done correctly in G4 |
| K1 | Page errors | OBS | — | `[]` |

\* diagnosed as harness-side, see §5. The behaviour under test was later proven by G2–G7.

### 2.2 Final harness (`p51_final.mjs`) — 13 rows: 7 PASS / 4 FAIL / 2 OBSERVED

| ID | Check | Kind | Result | Measured |
|---|---|---|---|---|
| G1 | Runner shows attempt no., answered counter, live countdown | REAL | **PASS** | `Attempt 1 · Answered 0/9`, timer `09:23→09:21` |
| G2 | Correct answer persisted before submission | REAL | FAIL* | key `is` typed; row read 1.8 s later was `null` (debounce) — the row was present and graded at submit (see G6) |
| G2b | Answer key used | OBS | — | attempt `cmvoyy77s…`, FILL_BLANK "My name ___ Ali.", key `is` |
| G3 | Prev/Next keeps the answer | REAL | **PASS** | `QUESTION 2 OF 9` then back with value `is` |
| G4 | Start twice while in progress → same attempt | REAL | **PASS** | existing = first = second = `cmvoyy77s…`, DB rows = 1 |
| G5 | Simulated submit failure: honest error, no false success | SIMULATED | **PASS** | alert `Some answers are not saved yet — check your connection…`, still on `/take`, DB `IN_PROGRESS` |
| G6 | Submit grades the attempt; result page matches DB | REAL | **PASS** | UI `10% ✗ Not Passed` = DB `percentage=10, passed=false, status=GRADED`; graded answer `isCorrect=true, pointsEarned=1` |
| G7 | Result survives reload | REAL | **PASS** | `10%` → `10%` |
| G8 | 375 px runner: no overflow, usable targets | REAL | **FAIL (defect P51-D2)** | overflow none (`375/375`), but `Submit now` is **21 px** tall |
| G9 | Attempt rows for Quiz 3 | OBS | — | `#1 GRADED 10%`, `#2 IN_PROGRESS` |
| N1 | Teacher finds the attempt by search | REAL | **PASS** | learner + "Verb to be" + `10%` |
| N2 | Teacher review shows learner/assessment/outcome/review | REAL | FAIL* | page text read too early; the full page render (probe51h) contains `✗ Not Passed`, `10%`, `1 / 10 points`, `Answered 1 / 9`, `Correct 1`, timestamp, per-skill breakdown |
| N3 | Missing attempt on teacher route → 404 | REAL | **FAIL (defect P51-D1)** | HTTP **500** |

---

## 3. Cross-checks executed outside the harness

| Check | Method | Result |
|---|---|---|
| Teacher page with a valid attempt | `probe51h` DOM dump | `✗ Not Passed 10% 1 / 10 points · Passing score: 70% Time used 52s Answered 1 / 9 Correct 1 Incorrect 0 Submitted 26 Oct 2026, 08:03 UTC` |
| Teacher page with a missing attempt, twice | direct HTTP + browser | **500**, body "Something went wrong … Result not found." |
| Student bogus-assessment routes | direct HTTP | detail/take/result → 307 (net 404 after redirects for the detail route) |
| Runner DOM contract | `probe51f` | navigator labels `Question 1, not answered, current`; meta `QUESTION 1 OF 9 · 1 POINT`; countdown `role="timer"` |
| Start control contract | `probe51d` | confirm dialog "Start this quiz? Once you start, the exam timer will begin." → `POST /api/assessments/{id}/start` → `router.push('/take?attempt=…')` |
| Direct `/take` with no attempt | `probe51e` | redirects to the overview (no orphan attempt created) |

---

## 4. Coverage summary

| Section | Rows | PASS | FAIL (product) | FAIL (harness, diagnosed) | OBSERVED |
|---|---|---|---|---|---|
| `p51_assessment2.mjs` | 15 | 9 | 0 | 4 | 2 |
| `p51_final.mjs` | 13 | 7 | 2 | 2 | 2 |
| **Assessment flow total** | **28** | **16** | **2** | **6** | **4** |

By label across the 28 rows: **REAL 23 · SIMULATED 1 · MOCKED 0 · OBSERVED 4**.
(One SIMULATED row: `G5`, submit aborted at the network layer. Four OBSERVED rows: `E2`, `G2b`, `G9`, `K1`.)

**Product failures:** `P51-D1` (teacher 500) and `P51-D2` (21 px tap target). Both are reproducible on demand; neither is contradicted by any passing row.

---

## 5. Harness corrections made during this phase (product was right)

Recorded so the failure rows above are not mistaken for product bugs.

1. **Question marker is upper-case.** `QUESTION 1 OF 9` (CSS `uppercase` is *not* applied — the DOM text is already upper case). A case-sensitive `/Question \d+ of \d+/` never matched, so waits silently timed out. Fixed by `/question \d+ of \d+/i`.
2. **The list-card link is labelled `Start`, not the quiz title.** `filter({ hasText: 'Quiz 1' })` matched nothing; navigation now uses `a[href="/student/exams/<id>"]`.
3. **`/take` without an attempt redirects to the overview.** Direct navigation does not create an attempt; only the confirmed `Start Quiz` control does. The first harness assumed otherwise.
4. **`Attempts 0 of 3` copy is "Questions 9", not "9 questions".** The overview assertion was rewritten against the real fact grid.
5. **Answer saves are debounced (500 ms) + flushed**: reading the DB 1.8 s after typing raced the save. Persistence is asserted at submit (`G6`), where the graded row proves it.
6. **Duplicate-start test must run while an attempt is in progress.** In v2 it ran after submission, so the "different id" was correct behaviour; re-sequenced as `G4` (same id, 1 row).
7. **Teacher page text must be read after the RSC stream settles.** A 2.5 s read missed the outcome block; the DOM dump with `waitUntil: 'networkidle'` + 2.5 s shows it.

Two product failures were **not** retried until green: they are reported open.

---

## 6. Not covered (explicit)

- Timed auto-submit (`onExpire` → `doSubmit(true)`) — the 10-minute countdown was never driven to expiry; would need a clock manipulation that is not a supported test method here.
- WORD_ORDER / MATCHING / SPEAKING question scoring end-to-end — controls inspected, only FILL_BLANK and radio groups were scored in this phase.
- `integrity` logging, `secureMode`, `randomizeQuestions/Options`, `blueprintId` assessments, rubric/manual grading, retake policy.
- Teacher authoring journey (`/teacher/exams/new`, blueprint, reviews) and `/api/assessments/*/analytics`.
- Cross-teacher authorisation (403) — only the visibility scope was exercised indirectly.
- Real production latency; every timing observation here is dev-server behaviour.

---

## 7. Appendix — voice/audio pass executed in the same session (59 rows)

Executed before the assessment harness, on the same disposable DB; kept because it re-verifies the Phase 50 fixes the assessment runner depends on. Full tables: `evidence/p51/p49a-listen.json`, `p49cd-speaking.json`, `p49-retest.json`.

| Section | Rows | PASS | FAIL | OBS/BLOCKED | Labels |
|---|---|---|---|---|---|
| A/B — listening lab + real MP3 (`p49a_listen.mjs`) | 31 | 23 | 3 | 5 | REAL 24 · SIMULATED 2 |
| Re-test of the 3 harness errors + watchdog (`p49retest.mjs`) | 8 | 4 | 3 | 1 | REAL 7 |
| C/D — MediaRecorder lesson activity + speaking lab (`p49cd_speaking.mjs`) | 20 | 15 | 0 | 5 | REAL 8 · SIMULATED 7 · BLOCKED 1 |
| **Total** | **59** | **42** | **6** | **11** | REAL 39 · SIMULATED 9 · MOCKED 0 · BLOCKED 1 |

Headline evidence from that pass (all REAL unless noted):

- Real MP3: `duration 1.022`, `readyState 4`, play advances the clock (`0.01 → 0.45`), reaches `ended`, replay restarts, `playbackRate 1 → 0.75 → 1`, seek slider moves the position.
- Missing MP3 (SIMULATED abort): `Audio is not available right now.` — no silent failure.
- Browser without `speechSynthesis` (SIMULATED): `Audio could not be played on this device…` + transcript auto-revealed; with 0 TTS voices a real `synthesis-failed` error produced the same honest message.
- Listening practice grading: `2 of 2 correct` for the correct answers, `1 of 2` after changing one; DB rows `{q1:Sam,q2:True}→2/2` and `{q1:Ali,q2:True}→1/2`; label "This is practice, not an exam."
- Microphone captured real media (fake device = **SIMULATED DEVICE**, physical hardware **not** tested): `audio/webm;codecs=opus`, **18 762 bytes**, plays back (`currentTime 0.51`); **no audio upload** (0 audio requests); only `{selfReported:true}` persisted; `storeAudio=false` in the consent row.
- Defect found there and still open (Phase 49/50 scope): a completed **self-reported speaking activity** is not restored after reload — the `ActivityAttempt` row exists (`isCorrect=null`) but `src/lib/practice.ts` maps `null → NOT_ATTEMPTED`, so no `✓ Done` chip, "I practiced this" is offered again and the practice summary ignores it (evidence `p51-final-lesson-state-after-reload.png`).
- Genuinely **BLOCKED**: real speech-to-text (browser engine produced 0 results, no external STT configured) and audible TTS output (0 voices in headless Chromium). Both labelled, never mocked in the application.
