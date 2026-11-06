# Phase 50 — Speaking & Listening: Bug Fixes

**Document:** `PHASE_50_AUDIO_BUG_FIXES.md`
**Date:** 2026-10-26
**Scope:** the seven defects confirmed in Phase 49 (`PHASE_49_AUDIO_FINDINGS.md` §3)
**Companions:** `PHASE_50_AUDIO_REGRESSION_TESTS.md`, `PHASE_50_FINAL_REPORT.md`

Seven confirmed defects, all reproduced on the current code before being touched, all fixed in place.
No redesign, no new dependency, no schema change, no new feature.

---

## Files changed

| File | Defects | Nature of change |
|---|---|---|
| `src/components/practice/audio-player.tsx` | P49-D1 | State is seeded from the media element; `canplay`/`play`/`pause` handling; safe duration for the range and readouts; seek clamps to the real duration; listeners reset per `src` |
| `src/components/voice/listening-lab.tsx` | P49-D2, P49-D3 | Utterance `start`/`error`/`end` handling, 1.5 s start watchdog, transcript fallback, real pause/resume with capability detection and an honest Stop fallback |
| `src/components/voice/speaking-lab.tsx` | P49-D4, P49-D5, P49-D7 | Recognition error mapping, 10 s timeout, cancel control, stale-callback guard, record control gated on a live session |
| `src/lib/voice/match.ts` | P49-D6 | Copula classification compares target against response instead of scanning target+response |
| `scripts/test-phase50-audio.ts` *(new)* | P49-D6 | 17 deterministic unit guards |
| `package.json` | — | Adds `test:phase50` to the `test` chain (no dependency change) |

Six files, 886 lines total in the touched files. `package-lock.json` unchanged.

---

## P49-D1 · MEDIUM · Audio player never received the track duration

### Root cause

`AudioPlayer` attached `loadedmetadata` / `durationchange` / `timeupdate` / `ended` / `error`
listeners inside `useEffect`, i.e. **after hydration**, while the `<audio preload="metadata">` element
had already started loading. For these small, cached MP3s the media events fire before the effect runs,
so:

- `duration` state stayed `0` forever → readout `0:00 / 0:00`, `[role="timer"]` `0:00 of 0:00`,
  `max={duration || 0}` left the seek range at **0**;
- a load-time failure was also missed, so a broken asset looked like an idle player until Play was
  pressed and `play()` rejected.

Measured before the fix (disposable DB, real 1.022 s MP3): element `duration=1.022`, `readyState=4`,
`mediaError=null`, UI `0:00 of 0:00`, `seekMax=0`, in 3/3 loads and throughout playback.

### Fix

- On mount / `src` change: reset state, then **seed from the element** (`audio.duration`,
  `audio.currentTime`, `audio.error`) before attaching listeners — the values the element already holds
  are adopted even though the events that produced them were missed.
- Listen for `loadedmetadata`, `durationchange`, `canplay` → `syncDuration()`, accepting only a finite
  positive duration.
- `play` / `pause` events now drive the `playing` flag, so the button reflects media state rather than
  only our own calls.
- `timeupdate` keeps position in sync; the effect is re-run per `src` and every listener is removed on
  cleanup (the element is paused as before).
- The range and both readouts use `safeDuration` (`Number.isFinite(duration) && duration > 0 ? duration : 0`),
  so a missing or `Infinity` duration cannot produce `max="Infinity"` or `NaN`.
- `onSeek` uses the element's own duration as the limit and clamps the requested time into `[0, duration]`.

### Before → after (same probe, same asset)

| Observation | Before | After |
|---|---|---|
| Readout at load | `0:00 / 0:00` | `0:00 / 0:01` |
| `[role="timer"]` | `0:00 of 0:00` | `0:00 of 0:01` |
| Seek `max` | `0` | `1.022` |
| Seek to 0.6 s | no effect (`currentTime` unchanged) | `currentTime = 0.6` |
| Keyboard ArrowRight ×2 | no effect | `currentTime = 0.8` |
| Play / Pause / Replay / Speed | worked | still work (unchanged) |

Adoption is automatic: the timer shows the real duration **133 ms** after load, with no interaction.
The server-rendered HTML still prints `0:00 / 0:00` for the instant before hydration — a duration is
only knowable in the browser — which is why the regression test waits for the hydrated value.

### Surfaces affected

The fix is in the shared component, so it applies everywhere it is rendered:

- `src/components/practice/listen-type-activity.tsx:57`
- `src/components/practice/activity-runner.tsx:279` (LISTEN_AND_CHOOSE and friends)
- `src/components/assessment/exam-runner.tsx:464`

Runtime-verified on two lessons (three players: `questions-1.mp3`, `hello-1.mp3`, `hello-2.mp3`).
The exam runner renders the same component but was **not** exercised at runtime — no assessment attempt
exists in the fixture database and creating one was out of scope.

---

## P49-D2 · MEDIUM · A failing speech engine left the learner with silence

### Root cause

`play()` called `synth.speak(utter)` and set the note to `null`. The utterance had **no `onstart` /
`onerror` handlers** and the code never inspected `getVoices()`, so a `synthesis-failed` error (measured
on this machine: `error="synthesis-failed"`, `start` never fires) produced no UI change at all. The
graceful branch that already existed only covered a **missing** Web Speech API
(`if (!synth)`), not a present-but-failing engine.

### Fix

- `utter.onstart` → clears the note and marks the utterance as started.
- `utter.onerror` → ignores `canceled` / `interrupted` (those are our own `cancel()`), otherwise shows
  the failure message and **opens the existing transcript fallback** (`setShowTranscript(true)`).
- A **1.5 s watchdog** covers engines that neither start nor report an error: if `start` has not fired,
  the same fallback path runs. The watchdog is cleared on start, on error, on any new `play()`, on
  unmount, and before any `cancel()`.
- The note is rendered with `role="status"` so it is announced.

Message: *"Audio could not be played on this device. The transcript is shown below so you can still
read and answer."* — it says what happened and what to do, and it does not claim anything about the
learner's device beyond the fact that audio could not be produced.

### Before → after

| | Before | After |
|---|---|---|
| Visible feedback | none (`audioNote = null`) | status message shown |
| Transcript | stayed hidden | opened automatically |
| Learner can still finish | had to find the toggle manually | answered the same exercise: **2 of 2 correct** |

---

## P49-D3 · LOW · "Pause" was a stop

### Root cause

The Pause button ran `window.speechSynthesis?.cancel()` and set the note "Paused.". `cancel()` discards
the utterance, so the subsequent Play called `cancel()` + `speak()` again and replayed the sentence from
the beginning. The browser's own `pause()` / `resume()` were never used, so the label promised
pause/resume semantics that did not exist.

### Fix — capability-detected, both branches implemented

- `canPause` is computed once after mount: `typeof synth.pause === "function" && typeof synth.resume === "function"`.
- **Pause is supported** (Chromium, Firefox, Safari): the button becomes a toggle —
  `Pause` → calls `synth.pause()`, note "Paused."; while paused the label reads **`Resume`** →
  calls `synth.resume()`. Play while paused **resumes** rather than restarting.
- **Pause is not supported**: the button is labelled **`Stop`**, the label never claims pause, and
  pressing it cancels with the note *"Stopped. Press Play to start again."*
- `stopAudio()` clears a stuck `paused` flag after `cancel()` (some engines leave `paused = true`,
  which would block the next utterance), so no state can wedge the player.
- Pressing Pause when nothing is speaking says *"Nothing is playing right now."* instead of pretending.
- Replay and Slow still deliberately restart from the beginning — that is what those controls are for.

### Before → after (instrumented mock engine — see labelling note in the regression document)

| Sequence | Before | After |
|---|---|---|
| Play | speak 1 | speak 1 |
| Pause | `cancel()` → cancel 1, `speaking=false`, no `pause()` call | `pause()` → pause 1, `speaking=true`, `paused=true`, cancel unchanged |
| Label while paused | `Pause` | `Resume` |
| Play again | speak 2 (restart from the beginning) | `resume()` → speak **1** (continues) |
| 4× pause/resume | would spawn repeated utterances | speak stays **1** |
| Engine without pause | n/a (always cancel) | label `Stop`, `cancel()` used, honest note |

**Not verified:** that a human hears the continuation. This environment has no TTS voices, so the
*wiring* is proven and the *audible* behaviour is not.

---

## P49-D4 · MEDIUM · A blocked microphone was reported as unintelligible speech

### Root cause

```ts
rec.onerror = () => { setState("Error"); setError("I couldn't understand the audio. Please try again."); };
```

One handler, one message, `event.error` ignored. A `not-allowed` (permission) failure told the learner
their speech was unintelligible and offered no way forward — in a lab where the keyboard path exists
right below the microphone button.

### Fix

`recognitionFailureMessage(reason)` maps the recognition error code to plain language:

| `event.error` | Message shown |
|---|---|
| `not-allowed`, `service-not-allowed` | "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again — or type your answer below." |
| `audio-capture` | "No microphone was found. Check that a microphone is connected, then try again — or type your answer below." |
| `no-speech` | "I did not hear any speech. Try again, or type your answer below." |
| `network` | "Speech recognition could not reach its service. Check your connection, or type your answer below." |
| `aborted` | *(no message — the learner cancelled)* |
| anything else | "I couldn't understand the audio. Please try again, or type your answer below." |

No browser internals are exposed; no permission failure blames the learner.

---

## P49-D5 · LOW · Recognition could hang in the listening state forever

### Root cause

`listen()` started recognition with no timer, no cancel path, and no protection against late callbacks.
When the engine neither returns a result nor fires an error (measured in Phase 49: `errors=[]`,
`results=0`), the UI stayed `LISTENING` indefinitely and the only way out was a page reload.

### Fix

- **10 s bounded wait** (`RECOGNITION_TIMEOUT_MS = 10_000`): if no result, error or end arrives, the
  recognition is abandoned and the learner is told *"Speech recognition did not respond. Try again, or
  type your answer below."* No transcript is ever invented.
- **Cancel**: while listening the primary button reads **`Stop listening`**; pressing it aborts the
  recognition and returns the lab to an idle state.
- **Stale-callback guard**: every attempt increments `attemptRef`; `onresult` / `onerror` / `onend`
  return immediately unless they belong to the current attempt. The timeout bumps the counter before
  aborting, so a result arriving after a timeout cannot resurrect a dead attempt or overwrite a newer one.
- **Cleanup**: the timer is cleared on result, error, end, cancel and unmount; the recognition is
  aborted on unmount.

---

## P49-D6 · LOW · `mistakeCategory()` blamed am/is/are for unrelated answers

### Root cause

```ts
const text = `${target} ${heard}`.toLowerCase();
if (/\b(am|is|are)\b/.test(text)) return "am/is/are";
```

The check ran over the **target as well as the response**, so any wrong answer to a sentence containing
"is" was filed as a copula mistake. `"banana"` against `"Hello. What is your name?"` was stored as
`am/is/are` and appended to the session's `mistakeNotes`, which also feeds `maybeRecommend()`.

### Fix

Classification is now derived from the comparison, in this order:

1. the learner used a copula the target does not contain → `am/is/are`
   (`"I am go to school"` vs `"I go to school."`);
2. the learner used a different copula than the target → `am/is/are`
   (`"I is happy"`, `"He are a teacher"`);
3. the target needs a copula, the learner omitted it, **and** a majority (> 50 %) of the target's
   significant words are present → `am/is/are` (`"I happy"` vs `"I am happy."`);
4. otherwise the existing categories and order are unchanged: `articles` → `missing words` →
   `not the full phrase`.

No NLP dependency; the same `normalizeSpeech` helper is reused.

### Before → after (real API + database rows)

| Target | Response | Before | After |
|---|---|---|---|
| Hello. What is your name? | `banana` | `am/is/are` | **`missing words`** |
| Hello. What is your name? | `what name` | `am/is/are` | **`missing words`** |
| I am happy. | `I is happy` | `am/is/are` | `am/is/are` *(preserved)* |
| I am happy. | `I happy` | `am/is/are` | `am/is/are` *(preserved)* |
| He is a teacher. | `He are a teacher` | `am/is/are` | `am/is/are` *(preserved)* |
| I go to school. | `I am go to school` | `am/is/are` | `am/is/are` *(preserved)* |
| correct answer | — | `null` | `null` |

`maybeRecommend()` and the recommendation table are untouched and still receive a category string;
no recommendation row was produced by the corrected classification in testing.

---

## P49-D7 · LOW · Recording could start before a session existed

### Root cause

The primary button was `disabled={!consent}` only, while `submit()` starts with `if (!sessionId) return`.
A learner who pressed **Start speaking** before choosing a mode entered a genuine recording state, and
any recognised transcript was then discarded without a word.

### Fix

- The button is now `disabled={!consent || !sessionId}`.
- `listen()` re-checks the session and, if missing, explains: *"Choose a practice mode above first, then
  press Start speaking."* (defence in depth — the disabled state already prevents it).
- A hint under the controls explains the order: *"Pick a practice mode above to start a session. The
  microphone only starts once a session exists, so nothing is listened to or thrown away by accident."*
- The record path never creates a session, and repeated presses cannot create duplicates; sessions are
  still created only by the four mode buttons, exactly as before.
- Consent behaviour is unchanged (same gate, same POST, same copy) and nothing is uploaded or stored:
  the session payload still reports `storeAudio:false`, and the flow produced no audio request.

### Before → after

| | Before | After |
|---|---|---|
| Button before a session | enabled | **disabled** |
| Pressing it | entered `LISTENING`, transcript would be dropped | no-op; recognition instance count **0** |
| Explanation | none (only "Choose Speak to begin.") | visible hint + guard message |
| After choosing a mode | recording works | recording works (session 201, prompt shown) |

---

## Behaviour deliberately left unchanged

- Worksheet content, questions, translations, topics, prompts and copy of the lessons themselves.
- Deterministic grading (`transcriptUnderstood`, the ≥ 80 % rule) — verified unchanged by units.
- The `articles` → `missing words` → `not the full phrase` precedence, including the pre-existing
  consequence that a target containing "a/an/the" reports `articles` before `missing words`.
- `pronunciationScore: null` everywhere; no pronunciation scoring was added.
- No audio is uploaded, stored or persisted; recordings remain local and ephemeral.
- Consent gate, session lifecycle and daily-limit accounting.
