# Phase 50 — Final Report: Speaking & Listening Bug Fixes

**Document:** `PHASE_50_FINAL_REPORT.md`
**Date:** 2026-10-26
**Companions:** `PHASE_50_AUDIO_BUG_FIXES.md`, `PHASE_50_AUDIO_REGRESSION_TESTS.md`
**Evidence:** `evidence/p50/` — 19 screenshots, 4 result files (12 REAL / 1 SIMULATED / 18 MOCKED checks)

---

## 1. Verdict

# PASS

All seven Phase 49 defects were reproduced on the current code, fixed in place, and re-tested in a
real browser. **31/31 browser checks and 17/17 unit guards pass**, the existing suites are green, and
`npm run release:verify` exits **0** with a production build of 213 pages. No dependency, lockfile,
schema, data or visual-identity change was made.

### What PASS means — and what it does not

The fixes are verified **at the layer this environment can observe**: media-element state, rendered
messages, network calls, API responses and database rows. It does **not** mean that a human heard audio
or that speech was recognised:

| Unverified here (unchanged from Phase 49) | Why |
|---|---|
| Audible speech synthesis | The test browser has **0 TTS voices** and no audio output device |
| Real speech recognition transcripts | `SpeechRecognition` is present but has **no backend**; it never returns a result |
| Physical microphone capture | Only Chromium's fake device was available, and it was labelled as such |
| Audio pause/resume as *heard* | Only the wiring (`pause()`/`resume()` calls, no restart) could be verified |
| Exam-runner rendering of the player | No assessment attempt exists in the fixture DB; verified at source level only |

Where those events had to be exercised, a **mocked** engine/recognition object drove the app's own
handlers, and every such check is labelled MOCKED in the regression document.

---

## 2. Defects fixed

| ID | Severity | Defect | Fix | Verified by |
|---|---|---|---|---|
| **P49-D1** | MEDIUM | Shared player never received the duration: `0:00 / 0:00`, `seek max=0`, seeking dead on every audio surface | State seeded from the element before listeners attach; `canplay`/`play`/`pause` handled; safe-duration guard; seek clamped | T1.1–T1.8 |
| **P49-D2** | MEDIUM | A failing speech engine produced silence with no message | `start`/`error`/`end` handlers + 1.5 s start watchdog → message and automatic transcript fallback (`role="status"`) | T2.1–T2.3 |
| **P49-D3** | LOW | "Pause" cancelled speech and Play restarted from the beginning | Real `pause()`/`resume()` with capability detection (`Pause`↔`Resume`), honest `Stop` + note when unsupported | T3.1–T3.6 |
| **P49-D4** | MEDIUM | A blocked microphone was reported as "I couldn't understand the audio" | Error-code mapping: permission, no device, no speech, network, aborted, generic — each actionable, none blaming the learner | T4.* (7 codes) |
| **P49-D5** | LOW | Recognition could stay in `LISTENING` forever | 10 s bounded wait, `Stop listening` cancel, attempt-token guard against late callbacks, timer cleanup | T5.1–T5.4 |
| **P49-D6** | LOW | `mistakeCategory()` blamed am/is/are for unrelated answers | Copula comparison derived from target-vs-response; omission only when the response clearly attempts the sentence | 17 unit guards + §6 API/DB |
| **P49-D7** | LOW | Recording could start with no session and the transcript was dropped | Record control gated on a live session, guard message, explanatory hint; no session is created by the record path | T7.1–T7.3 |

Root causes, diffs and before/after measurements: `PHASE_50_AUDIO_BUG_FIXES.md`.

**Files changed (6):** `src/components/practice/audio-player.tsx`,
`src/components/voice/listening-lab.tsx`, `src/components/voice/speaking-lab.tsx`,
`src/lib/voice/match.ts`, `scripts/test-phase50-audio.ts` *(new)*, `package.json` *(one script key)*.

---

## 3. Regression results

| Suite | Checks | Result |
|---|---|---|
| Browser (real Chromium, real assets) | 31 | **31 PASS / 0 FAIL** |
| `npm run test:phase50` (unit guards) | 17 | **17 PASS / 0 FAIL** |
| `npm test` — 12 scripts incl. phase46 (10), phase47 (6) | 128 counted + uncounted scripts | **0 failures** |
| `npm run typecheck` | — | **EXIT 0** |
| `npm run release:verify` (typecheck → test → build) | — | **EXIT 0**, 108 s, 213/213 pages |

Highlights from the after-state (all measured, not inferred):

- the player adopts `duration=1.022` and `max=1.022` **133 ms** after load with no interaction;
  pointer seek lands on `0.6 s`, ArrowRight ×2 reaches `0.8 s`;
- the listening lab shows *"Audio could not be played on this device. The transcript is shown below…"*
  and the learner then answers **2 of 2 correct** without audio;
- pause/resume on the mock engine: `{speak:1, pause:1, resume:1, cancel:1}` — before the fix it was
  `{speak:2, pause:0, resume:0, cancel:3}`, i.e. two utterances and no pause;
- `banana` vs `"Hello. What is your name?"` now stores `missing words` (was `am/is/are`), while
  `"I is happy"`, `"I happy"`, `"He are a teacher"` and `"I am go to school"` still store `am/is/are`;
- a recognition that never returns exits `LISTENING` after **10.5 s** with a retry message, and a late
  result from the abandoned attempt posts **no** extra turn and changes nothing.

Test-by-test detail, including which checks were real / simulated / mocked and five disclosed
corrections to my own test assertions: `PHASE_50_AUDIO_REGRESSION_TESTS.md`.

---

## 4. Remaining issues

None of these are regressions from this phase; they are either environment limits or pre-existing,
documented behaviour that was out of scope.

| Severity | Item | Note |
|---|---|---|
| INFO | Audible synthesis, real recognition and physical microphones remain unverified | Environment limitation; needs a machine with voices / a real STT provider, and a human tester |
| INFO | `mistakeCategory()` stays coarse in one respect | `banana` against `"Open the door now."` → `articles` (article precedence runs before missing-words). Pre-existing ordering, preserved deliberately; not an `am/is/are` false positive any more |
| INFO | `POST /turn` still returns `"practiceLabel": "AI Practice"` for deterministic grading | Phase 49 O1; not rendered in any UI, left untouched by this phase |
| INFO | The exam runner surface is covered at source level only | Requires an assessment attempt that does not exist in the fixture DB |
| INFO | The listening lab's "Pause" is only as good as the engine | Some engines may not honour `pause()`; the label switches to `Stop` when the API is absent, but a present-yet-unreliable `pause()` cannot be detected |

Nothing was hidden, downgraded or waived. No new defect was introduced: the only behavioural changes are
the seven described, each covered by a test that also exercises the surrounding behaviour (play, pause,
replay, speed, grading, consent, session creation, typed fallback, no-upload).

---

## 5. Data and dependency integrity

| Item | Value | Status |
|---|---|---|
| `prisma/dev.db` SHA-256 | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` | **unchanged** |
| `package-lock.json` SHA-256 | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` | **unchanged** |
| `.env` SHA-256 | `6da800151ba6962c32e7e3d66eb82a7223ea5d5e3cf2df40e6053102b8bd33cb` | **unchanged** |
| Dependencies | 12 runtime / 13 dev — no additions, no removals | **unchanged** |
| Schema / migrations | none touched | **unchanged** |
| Database used for writes | `/tmp/p50_run1.db` (disposable copy) | original never targeted |
| Files changed | 4 source components/lib + 1 new test script + `package.json` script key | as listed in §2 |
| Browser tooling | installed under `/tmp` only | project untouched |
| Secrets | none created, read, logged or exposed | — |

The dev server was stopped after testing; nothing is left listening on `:4052`.

---

## 6. Recommended next phase

1. **Re-verify the unverifiable parts on a capable machine** — audible listening-lab playback and a real
   recognition provider (only if credentials are provisioned by the owner; none should be fabricated).
   Until then, real-world speech recognition remains unverified, and no pronunciation score should be
   invented to fill the gap.
2. **Consider the exam-runner surface** as part of a broader assessment phase — the same component is
   now fixed, but no runtime evidence exists for it.
3. **Leave the coarse classifier alone unless the product wants finer error categories**; if so, that is
   a product decision with a new test set, not a bug fix.
4. Phase 49's O1/O2 items (the `AI Practice` API label and the French translation on a Persian course)
   remain open product questions and were deliberately not touched here.

---

## 7. Status

Deliverables complete:

- `PHASE_50_AUDIO_BUG_FIXES.md`
- `PHASE_50_AUDIO_REGRESSION_TESTS.md`
- `PHASE_50_FINAL_REPORT.md` (this document)

**Stopping here as instructed — Phase 51 has not been started.**
