# Phase 50 — Audio Regression Tests

**Document:** `PHASE_50_AUDIO_REGRESSION_TESTS.md`
**Date:** 2026-10-26
**Companions:** `PHASE_50_AUDIO_BUG_FIXES.md`, `PHASE_50_FINAL_REPORT.md`
**Evidence:** `evidence/p50/` — 19 screenshots, 4 machine-readable result files
(`before-probe.json`, `after-probe.json`, `regress-results.json`, `regress-results.partial.json`)

---

## 1. What was executed

| Layer | Suite | Checks | Result |
|---|---|---|---|
| Browser (real Chromium) | `p50_regress.mjs` — sections d1, d2, d3mock, d3fallback, d45 | **31** | **31 PASS, 0 FAIL** |
| Unit (Node, no DOM) | `npm run test:phase50` → `scripts/test-phase50-audio.ts` | **17** | **17 PASS, 0 FAIL** |
| Existing suites | `npm test` (12 scripts incl. phase46/47/50) | 128 counted + scripts without counters | **0 failures** |
| Build | `npm run release:verify` (typecheck → test → build:safe) | — | **EXIT = 0**, 108 s, 213/213 pages |
| API + database | direct `curl` against `/api/voice/sessions/<id>/turn` + Prisma reads | 4 turns + 4 rows | as expected (see §6) |

Commands and exit statuses are listed verbatim in §7.

---

## 2. Environment and labelling

| Item | Value |
|---|---|
| App | `next dev` on `http://127.0.0.1:4052`, Next.js 15.5.27 |
| Database | **disposable copy** `/tmp/p50_run1.db` (from `prisma/dev.db`, which was never written) |
| Runtime | Node v22.23.3 via `.nvmrc` runtime |
| Browser | `chromium_headless_shell-1248` driven by Playwright-core 1.64.1 (installed under `/tmp` only) |
| Assets | the real `public/audio/*.mp3` files (`questions-1.mp3` 1.022 s, `hello-1.mp3` 3.198 s, `hello-2.mp3` 2.030 s) |

Every check carries one of these labels in the results:

- **REAL** — real browser, real asset, real API.
- **SIMULATED** — Chromium fake media device, or a request aborted in the browser.
- **MOCKED** — a `speechSynthesis` / `SpeechRecognition` object injected by the harness to emit the
  events this environment cannot produce (no voices, no speech backend). Mocks only *drive the app's
  own handlers*; they never replace a product code path and are never counted as evidence that speech
  recognition or speech output works.

**Standing limitation:** this machine has **0 TTS voices** and **no speech backend**, so audible output
and real transcription remain unverifiable. Nothing in this document claims otherwise.

---

## 3. Browser regression — all 31 checks

### D1 — shared audio player (REAL)

| ID | Check | Expected | Actual | Status |
|---|---|---|---|---|
| T1.1 | Duration becomes nonzero without interaction | duration > 0.5, range matches | `duration=1.022`, `max=1.022`, readout `0:00 / 0:01`, adopted after **133 ms** | PASS |
| T1.2 | Elapsed and total update during playback | `currentTime > 0`, total `0:01` | `currentTime=0.456`, `0:00 / 0:01` | PASS |
| T1.3 | Pause keeps position | `paused=true`, position retained | `paused=true`, `currentTime=0.748` | PASS |
| T1.4 | Seek works (pointer + keyboard) | slider → 0.6; arrows increase | slider → `0.6`; ArrowRight ×2 → `0.8` | PASS |
| T1.5 | Replay still works | restarts near 0 and plays | `currentTime=0.195`, playing | PASS |
| T1.6 | Playback speed still works | 0.75 → 1.0 | `0.75` → `1` | PASS |
| T1.7 | Same fix on a second surface | 2 players on the greetings lesson report duration + range | `hello-1` 3.198 s, `hello-2` 2.030 s, timers `0:00 of 0:03` / `0:00 of 0:02`, playback advanced to 0.41 s | PASS |
| T1.8 | Missing asset (SIMULATED abort) | error state, no fake player | message visible **on load** and after Play | PASS |

Screens: `after-D1-load.png`, `after-D1-playing.png`, `after-D1-second-surface.png`,
`after-D1-missing.png`. Before: `before-D1-lesson-player.png`, and Phase 49's `A06-seek-broken.png`.

### D2 — listening lab speech failure

| ID | Check | Kind | Expected | Actual | Status |
|---|---|---|---|---|---|
| T2.1 | Failure produces a visible, actionable message + fallback | REAL (failing engine) | status message, transcript opened | *"Audio could not be played on this device. The transcript is shown below…"*, transcript open | PASS |
| T2.2 | Learner can still answer after the failure | REAL | graded via the transcript | *"Listening practice. This is not an exam grade. 2 of 2 correct…"* | PASS |
| T2.3 | A successful synthesis is **not** reported as failed | MOCKED engine that starts | no message, transcript stays hidden | `note=null`, `transcriptAutoOpened=false` after 2.1 s (past the 1.5 s watchdog) | PASS |

Screens: `after-D2-failure.png`, `after-D2-answered.png`, `after-D2-success-mock.png`.

### D3 — pause must not behave like stop

| ID | Check | Kind | Expected | Actual | Status |
|---|---|---|---|---|---|
| T3.1 | Truthful control after a failed utterance | REAL | does not claim to pause silence | label `Pause`, note *"Nothing is playing right now."* | PASS |
| T3.2 | Pause pauses, label flips | MOCKED | `pause()` once, no cancel, no new utterance, label `Resume` | `{speak:1, pause:1, resume:0, cancel:1}`, `paused=true`, label `Resume` | PASS |
| T3.3 | Play after Pause resumes | MOCKED | `resume()` with no new utterance | `{speak:1, pause:1, resume:1, cancel:1}` | PASS |
| T3.4 | Repeated pause/resume does not stack utterances | MOCKED | one utterance | `{speak:1, pause:5, resume:5, cancel:1}` after 4 extra cycles | PASS |
| T3.5 | Replay still restarts deliberately | MOCKED | second utterance | `speak:2` | PASS |
| T3.6 | No pause support → honest Stop | MOCKED engine without `pause` | label `Stop`, `cancel()`, honest note | label `Stop`, `cancel:2`, *"Stopped. Press Play to start again."* | PASS |

Screens: `after-D3-paused-mock.png`; before: `before-D3-mock-pause.png` (`pause:0, cancel:2, speak:2`).

### D4 — microphone error guidance (MOCKED recognition events)

| ID | Injected `event.error` | Message shown | Status |
|---|---|---|---|
| T4.not-allowed | `not-allowed` | "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again — or type your answer below." | PASS |
| T4.service-not-allowed | `service-not-allowed` | same permission guidance | PASS |
| T4.audio-capture | `audio-capture` | "No microphone was found. Check that a microphone is connected…" | PASS |
| T4.no-speech | `no-speech` | "I did not hear any speech. Try again, or type your answer below." | PASS |
| T4.network | `network` | "Speech recognition could not reach its service. Check your connection…" | PASS |
| T4.aborted | `aborted` | *(no message — treated as a user cancel)* | PASS |
| T4.weird-internal-error | unknown code | generic "I couldn't understand the audio…" fallback | PASS |

Screen: `after-D4-permission.png`.

### D5 — timeout, cancellation and stale results (MOCKED recognition)

| ID | Check | Expected | Actual | Status |
|---|---|---|---|---|
| T5.1 | Success path still normal | "Your sentence was understood…" | real `POST /turn` 200, feedback shown | PASS |
| T5.2 | Cancel while listening | button reads `Stop listening`, returns to idle | label `Stop listening`, state `READY` | PASS |
| T5.3 | A never-returning recognition cannot hang the UI | leaves `LISTENING` with a message | state `ERROR`, *"Speech recognition did not respond…"*, after **10 532 ms** | PASS |
| T5.4 | A late result cannot overwrite a newer attempt | still shows the newer result; exactly one turn posted | `posts=1`, `understood` still true after the stale `banana` result and a stale `no-speech` error were replayed | PASS |

Screen: `after-D5-timeout.png`.

### D7 — no recording before a session exists

| ID | Check | Expected | Actual | Status |
|---|---|---|---|---|
| T7.1 | Recording blocked before a session | disabled + explanation + no recognition created | `disabled=true`, hint visible, forced click → state `READY`, **0** recognition instances | PASS |
| T7.2 | Recording unlocks after a session | enabled once `POST /api/voice/sessions` succeeds | `201`, prompt "Hello. What is your name?", enabled | PASS |
| T7.3 | No upload introduced | no audio/blob requests | `suspicious=[]` | PASS |

Screens: `after-D7-gated.png`; before: `before-D7-before-session.png` (`startDisabled=false`, click →
`LISTENING`).

---

## 4. Unit guards — 17/17 (`npm run test:phase50`)

| Group | Checks | Notes |
|---|---|---|
| The reported defect | 3 | `banana` vs a copula target → not `am/is/are` (→ `missing words`); related fragments likewise |
| Genuine copula mistakes preserved | 3 | wrong copula, omitted copula in an attempted sentence, copula added where the target has none |
| Other categories / fallbacks preserved | 4 | `articles`, its precedence, `missing words`, `not the full phrase` |
| Null/empty handling | 3 | correct answer → `null`; `null`/`undefined`/blank → `null`; punctuation only → `null` |
| Matching rule unchanged | 4 | case/punctuation, unrelated text, the ≥ 80 % rule, normalisation |

---

## 5. Corrections made to the *tests* (disclosed for transparency)

Five issues surfaced during this phase were **test defects, not product defects**. Each was corrected
and the corrected assertion is what the tables above report; none of these is counted as a pass for a
defect that actually failed.

1. **Seek simulation.** The first probe set `input.value` and dispatched `input`, which React's value
   tracker ignores — the seek appeared to do nothing. Replaced with real user input (`locator.fill` and
   arrow keys), which proved seeking works.
2. **Transcript detector.** `getByText(/fire station/)` also matches the question legend
   *"He works at a fire station."*, producing a false "transcript opened". Replaced with the exact
   transcript sentence *"Hello. My name is Sam."*.
3. **Fixed sleep after grading.** A 2.5 s wait raced the dev-server's first compile of
   `/api/voice/listening/[id]/submit`. Replaced with a bounded `waitForFunction` for the expected result.
4. **Four wrong unit expectations.** My first expectations assumed `"I saw cat"` would be `articles`
   (it is *understood*, because articles are not significant words) and that a target containing "the"
   would report `missing words` (articles takes precedence). The guards now assert the actual, intended,
   pre-existing behaviour instead of my assumption.
5. **Harness label on D1 load.** The first "after" sample read the pre-hydration HTML. The probe now
   waits (bounded) for the hydrated value and also records the pre-hydration state separately — the
   server-rendered markup necessarily shows `0:00 / 0:00` because duration is browser-only knowledge.

One infrastructure event is also disclosed: the `next dev` process **restarted itself** mid-run
("Server is approaching the used memory threshold") under this sandbox's ~2 GB limit, aborting one
combined suite run. The browser suite was therefore split into five sections that can be run
independently (`node p50_regress.mjs d1|d2|d3mock|d3fallback|d45`), and results are merged by test ID.
No test was re-run in the hope that it would pass; the only re-runs were after correcting the
assertions listed above.

---

## 6. API and database verification (D6 end-to-end)

Four real turns against `POST /api/voice/sessions/<id>/turn`, read back from `SpeechAttempt`:

| target | transcript | understood | stored `mistakeCategory` |
|---|---|---|---|
| Hello. What is your name? | hello what is your name | true | `null` |
| Open the door now. | banana | false | `articles` *(pre-existing precedence: the target's article is missing)* |
| I am happy. | I is happy | false | `am/is/are` |
| Hello. What is your name? | banana | false | **`missing words`** (was `am/is/are`) |

`pronunciationScore` was `null` on every response. No `AiRecommendation` row was created. The
`articles` result for `banana` vs "Open the door now." is a known limitation of a coarse keyword
classifier, unchanged by this phase and recorded as such in the final report.

---

## 7. Commands and exit statuses

```
$ npm run typecheck                                  # tsc --noEmit
EXIT = 0

$ npx tsx scripts/test-phase50-audio.ts
=== Phase 50 audio unit guards: 17 passed, 0 failed ===
EXIT = 0

$ npm run release:verify                             # typecheck && test && build:safe
> typecheck                                          EXIT 0
> test: db-tls / backup-connection unit tests 32 passed, 0 failed
> test: request-trust & origin policy         23 passed, 0 failed
> test: staging-gate (Results)                27 passed, 0 failed
> test: release-contracts (Results)           13 passed, 0 failed
> test: test:phase46                          10 passed, 0 failed
> test: test:phase47                           6 passed, 0 failed
> test: test:phase50                          17 passed, 0 failed
> build:safe   ✓ Compiled successfully in 37.7s   ✓ Generating static pages (213/213)
EXIT = 0      (108 s total)

# browser suite (server: next dev -p 4052, DATABASE_URL=file:/tmp/p50_run1.db)
$ cd /tmp/pwt && PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node p50_regress.mjs d1
SECTION d1: 8 checks | cumulative 8 -> {"PASS":8}
$ ... p50_regress.mjs d2        SECTION d2: 3 checks | cumulative 11 -> {"PASS":11}
$ ... p50_regress.mjs d3mock    SECTION d3mock: 5 checks | cumulative 16 -> {"PASS":16}
$ ... p50_regress.mjs d3fallback SECTION d3fallback: 1 checks | cumulative 17 -> {"PASS":17}
$ ... p50_regress.mjs d45       SECTION d45: 14 checks | cumulative 31 -> {"PASS":31}
```

Grep of the full release log for failures: `grep -c "✗" /tmp/p50_release.log` → **0**.

---

## 8. Coverage: real vs simulated vs mocked

| Category | Checks | What it proves |
|---|---|---|
| **REAL (12)** | T1.1–T1.7, T2.1, T2.2, T3.1, T7.2, T7.3, §6 (4 turns) | Real MP3 decode, playback, seek, pause, replay, speed, real grading and persistence, real network capture |
| **SIMULATED (1)** | T1.8 | The missing-asset error path (request aborted in the browser) |
| **MOCKED (18)** | T2.3, T3.2–T3.6, T4.* (7), T5.1–T5.4, T7.1's instance count | The app's handling of engine/recognition events this environment cannot generate |

**Not covered by any check, and not claimed:**

- audible speech synthesis (0 voices, no output device);
- real speech recognition results (`SpeechRecognition` has no backend here);
- physical microphone capture (simulated device only, where used);
- audio pause/resume as *heard* by a user (wiring only);
- the exam runner's rendering of the shared player (`exam-runner.tsx:464` — source-level only, no
  assessment attempt exists in the fixture DB).
