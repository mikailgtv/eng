# Phase 49 — Audio Findings: Speaking & Listening Lab

**Document:** `PHASE_49_AUDIO_FINDINGS.md`
**Date:** 2026-10-26 · evidence timestamps in UTC
**Companion documents:** `PHASE_49_AUDIO_TEST_PLAN.md`, `PHASE_49_FINAL_REPORT.md`
**Verdict:** **PARTIAL** — audio playback and voice capture are real; speech recognition could not be
verified in this environment; grading is deterministic and honest.

---

## 1. Environment limitations (read first)

These are limits of the test rig, not product defects. They bound every claim below.

| # | Limitation | Consequence |
|---|---|---|
| E1 | Headless Chromium has **0 TTS voices** (`getVoices().length === 0`) and no audio output device | Audible speech synthesis **cannot** be verified. Only the call into `speechSynthesis.speak()` and the engine's own error event can be observed. |
| E2 | `SpeechRecognition` exists but has **no speech backend** | Clicking *Start speaking* starts recognition that produces **neither a result nor an error event**. Real transcription is **BLOCKED**, not passed. |
| E3 | Only a **simulated microphone** (`--use-fake-device-for-media-stream`, track label "Fake Default Audio Input") | Recording tests are **SIMULATED-DEVICE** tests. Physical microphone hardware was **not** tested. |
| E4 | No `STT_*`, `TTS_*` or `AI_API_KEY` configured | External speech/AI providers are **NOT TESTED**. No credential was fabricated and no successful provider response was simulated in the application. |
| E5 | Exactly **1 PUBLISHED** listening exercise | Exercise switching inside the listening lab is **NOT TESTED** (nothing to switch to). |
| E6 | `next dev` on a disposable DB copy, single user, no load | Concurrency, long sessions and production performance are out of scope. |

Where a simulated or mocked technique was used, the row says so explicitly: **SIMULATED DEVICE**,
**SIMULATED NETWORK FAULT** or **MOCKED**.

---

## 2. Confirmed working features (observed, not inferred)

### 2.1 Listening lab — `/student/listening` (REAL)

| Check | Evidence |
|---|---|
| Route loads with the single published exercise "Hello at the station" (PRE_A1 · Greetings) and its 2 questions | `L01-listening-desktop.png`; heading "Listening lab", 1 selector option, 2 fieldsets |
| **Play** invokes speech synthesis with the **exact** stored transcript, `rate=1`, `lang="en-US"` | instrumented `speak()`: `text="Hello. My name is Sam. I work at a fire station."` |
| **Slow** produces `rate=0.75`; **Replay** returns to `rate=1` | successive utterance records 1 → 0.75 → 1 |
| **Pause** cancels speech and shows the note "Paused." | `speechSynthesis.cancel()` count incremented; note rendered |
| **Show transcript** reveals, **Hide transcript** hides it (label flips) | `L03-transcript-translation.png` |
| **Show translation** reveals the stored translation | French text rendered (see observation O2) |
| Grading is **deterministic**: both answers right → "2 of 2 correct"; wrong option → "1 of 2 correct" | `L04-graded-2of2.png`; strings captured verbatim |
| Grading **persists**: `ListeningAttempt` rows store answers + counts | DB rows: `{q1:"Sam",q2:"True"} → 2/2`, `{q1:"Ali",q2:"True"} → 1/2` |
| 375 px: `scrollWidth=375`, no overflow; every control 48 px tall | `L05-listening-375.png` |
| Graceful degradation when the Web Speech API is absent (**SIMULATED** removal): "Audio is unavailable. Read the sentence below." and the transcript opens automatically | `L06-no-synth-fallback.png` |

### 2.2 Real MP3 playback — `/student/learn/cmujqdeit005mkpua6mn96f1u` (REAL)

The player is `src/components/practice/audio-player.tsx`, shared by practice activities, the
listen-and-type activity and the exam runner.

| Check | Evidence |
|---|---|
| Metadata loads: `src=/audio/questions-1.mp3`, `duration=1.022`, `readyState=4`, no media error | measured in-page |
| **Playback actually starts and progresses**: `currentTime` 0 → 0.258 s after 420 ms, `paused=false` | `A02-playing.png` |
| Plays **to the end** and the control resets: `ended=true`, `currentTime=1.022 = duration`, label back to "Play Listening audio" | `A03` observation |
| **Replay** restarts from ~0 and plays (`currentTime=0.194`) | measured |
| **Pause** stops and holds position (`paused=true`, `currentTime=0.227`) | measured |
| **Speed** toggles `playbackRate` 1 → 0.75 → 1 with `aria-pressed` reflecting the state | measured |
| Missing/failed asset (**SIMULATED NETWORK FAULT**, request aborted) shows "Audio is not available right now." instead of a fake player | `A03-audio-missing.png` |
| Distinct lessons load their own correct files: `/audio/hello-1.mp3` + `/audio/hello-2.mp3` in the greetings lesson, `/audio/questions-1.mp3` here | DOM `src` values |
| All **8** MP3 assets serve `200 audio/mpeg` (4.5–14 KB) | HTTP sweep |
| 375 px: no overflow, audio duration still decoded (1.022) | `A05-lesson-375.png` |

### 2.3 Listen-and-type activity — same lesson (REAL)

| Check | Evidence |
|---|---|
| Answer field exists (`<textarea id="listen-type-input">`) | DOM |
| Correct transcript graded correct, **case-insensitively** | `attempt 2 {text:"where are you from"} isCorrect=true score=1` |
| Shortened answer graded incorrect with zero points | `attempt 1 {text:"Where you from"} isCorrect=false score=0` |
| Result persists and locks the activity after reload — the saved answer is shown, the field is disabled | `C00-listen-type-persisted.png`, `C03-recorded-playback.png` |
| `ActivityAttempt` rows carry `attemptNumber`, `answer`, `isCorrect`, `score` | DB |

### 2.4 Lesson speaking activity — `speaking-activity.tsx` (**SIMULATED DEVICE**)

The strongest single result of this phase: **a recording indicator was not taken as proof — the
captured media was inspected.**

| Check | Evidence |
|---|---|
| **Record myself** requests `{audio:true}`, receives 1 live audio track, and shows **Stop recording** | track label "Fake Default Audio Input", `state=live` |
| After Stop, a `<audio controls>` element appears with a `blob:` source whose Blob contains **26,490 bytes** of `audio/webm;codecs=opus`, `duration=2.04`, `readyState=4` | `C03-recorded-playback.png` |
| The captured clip **plays back**: `currentTime=0.551`, `paused=false` | measured |
| **Re-record** clears the clip and restores the record control | DOM |
| **Type instead** → **I practiced this** saves progress and confirms | network: `POST /api/activities/cmujry0py004ooez7bmisd7e9/attempts` (21-byte body) |
| **The recording is never uploaded** — the only write is `{"selfReported":true}`; stored row has `isCorrect=null`, `score=null` | DB row + network capture |
| The UI states plainly that "Pronunciation feedback is not available yet — your practice is saved for future coaching." | rendered text; no invented score |
| Microphone denial: "Microphone was not available…" plus **Type instead** (**SIMULATED** rejection `NotAllowedError`) | `C06-mic-denied-simulated.png` |

This matches the product's own consent copy ("We do not save the recording"): recording is a local,
ephemeral practice aid; only a self-report is stored. That is coherent, not a defect.

### 2.5 Speaking lab — `/student/speaking` (REAL, except recognition)

| Check | Evidence |
|---|---|
| Consent gate appears for a student who never consented; accepting it calls `POST /api/voice/consent` → **201** and unlocks the controls | `D10-consent-gate.png`, `D11-consent-accepted.png` |
| Four modes offered: Speak / Repeat a word / Shadow / Talk with tutor | DOM |
| Choosing a mode creates a session: `POST /api/voice/sessions` → **201** with prompt "Hello. What is your name?", state "READY" | `D12-session-prompt.png` |
| Typed answer equal to the prompt → "Your sentence was understood. Try it one more time if you want." | `D15-typed-correct.png` |
| Unrelated typed answer ("banana") → "Try the full sentence again." — no false praise | `D16-typed-wrong.png` |
| **Try again** posts another turn for the same session (200) | network |
| History lists sessions with counters: "Greetings · 26 Oct 2026, 06:55 UTC · SPEAKING · A1 · 1 turns · 1 understood · ACTIVE · Delete text"; the page states "Counts only. No pronunciation score. Recordings are not stored." | `D18-history.png` |
| **No external host is contacted**: all 3 fetches relative/same-origin | network log |
| 375 px: `scrollWidth=375`, no overflow, controls 44–56 px | `D19-speaking-375.png` |
| With a **MOCKED** recognition result, the transcript reaches `POST /turn` (200) and is graded `understood:true`, `recognized:"Hello. What is your name?"` | `D14-mocked-stt.png` — **MOCKED**, proves the app's handling path only |

### 2.6 Scoring mechanism — identified precisely

There is **no AI and no pronunciation scoring** anywhere in this path:

- `src/lib/voice/match.ts` → `transcriptUnderstood()` normalises text and requires **all significant
  words or ≥ 80 % of words longer than 2 characters** to appear in the transcript.
- `recordTurn()` (`src/lib/voice/service.ts`) computes `understood`, a coarse `mistakeCategory`, and a
  canned `simpleFeedback()` string; it writes `VoiceMessage` + `SpeechAttempt` + `SpeechRecognitionRequest`.
- The API returns `"pronunciationScore": null` on every turn — the app does not fabricate a score.
- External STT is a separate endpoint, `/api/voice/transcribe`, which with no provider configured
  returns **422 "Voice recognition is unavailable. You can type your answer instead."** and records
  `SpeechRecognitionRequest {provider:"external", ok:false}`.

Verified end-to-end through the real API:

| target | transcript | understood | feedback |
|---|---|---|---|
| Hello. What is your name? | hello what is your name | true | Your sentence was understood. Try it one more time if you want. |
| Hello. What is your name? | banana | false | Try the full sentence again. |
| Hello. What is your name? | what name | false | Try the full word or sentence again. |

### 2.7 Persistence, isolation and API states (REAL)

| Check | Result |
|---|---|
| `POST /api/voice/transcribe` without a provider | **422** + "Voice recognition is unavailable. You can type your answer instead." |
| Student A posts a turn into Student B's session | **404** "Session not found." (tenant/ownership isolation intact) |
| Submit to an unknown listening exercise | **404** "Listening exercise not found." |
| `POST /api/voice/consent` with a foreign `Origin` | **403** "Request blocked: cross-origin requests are not allowed." |
| Session creation payload | `{sessionId, prompt, aiSessionId:null, maxAudioSec:20, **storeAudio:false**}` |
| Stored voice data after testing | `VoiceSession` (turns/recognizedCount/mistakeNotes/durationSec), `VoiceMessage` (PROMPT/SCRIPT, USER/STT, USER/TYPED), `SpeechAttempt` (provider `typed`, confidence null) — **no audio bytes anywhere** |

---

## 3. Confirmed defects

Severity uses CRITICAL / HIGH / MEDIUM / LOW / INFO. All are reproducible on the disposable copy.

### P49-D1 · MEDIUM · The audio player never learns the track duration — progress bar and time readout are inert

**Route:** every place `AudioPlayer` renders — practice activities (`/student/learn/<lessonId>`),
listen-and-type, exam runner.
**Observed:** the `<audio>` element reports `duration=1.022`, `readyState=4`, `mediaError=null`, yet the
component's state stays at zero:

- visible readout: **"0:00 / 0:00"**
- screen-reader timer: `"0:00 of 0:00"`
- seek slider: `max="0"` → the thumb cannot move and seeking is impossible, although the control is
  labelled "Seek Listening audio"

Reproduced on **3/3** fresh loads, and while audio was genuinely playing (`currentTime` 0.188 s and
0.892 s with the slider still at `max=0`). File: `A06-seek-broken.png` (the "0:00 / 0:00" readout is
visible under the Play button).

**Likely cause (hypothesis, not verified by change):** `audio-player.tsx` attaches `loadedmetadata` /
`durationchange` / `error` listeners in `useEffect`, i.e. after hydration, while `preload="metadata"`
has already fired those events for these small files. The state is never seeded from
`audio.duration`. The same race explains why an aborted request only shows the error **after** the user
presses Play (`errorVisibleOnLoad=false`, `errorVisibleAfterPlay=true` in check A8) instead of at load.

**Impact:** audio still plays and stops correctly, but the learner gets false position/duration
information, cannot seek, and assistive technology is told "0:00 of 0:00" throughout playback. This
affects every audio surface in the product, not just this lab.

**Repro:** open `/student/learn/cmujqdeit005mkpua6mn96f1u`, press Play in "Listen and type exactly
what you hear", watch the readout — it stays "0:00 / 0:00" while words are audible.

---

### P49-D2 · MEDIUM · When speech synthesis fails, the learner gets silence with no explanation

**Route:** `/student/listening`.
**Observed:** pressing **Play** calls `speechSynthesis.speak()` with the correct text, rate and language,
and the engine fires an **`error` event with `error="synthesis-failed"`**; no `start` event ever fires.
The UI shows **no message at all** — `audioNote` stays `null`, no `role="alert"`, nothing changes.
`L02-play-no-voices.png`.

The component has no `onerror`/`onstart` handler and never checks `getVoices()`, so it cannot tell the
difference between "playing" and "the engine refused". By contrast, the *absent-API* branch is handled
well ("Audio is unavailable. Read the sentence below." + auto transcript, verified as L16) — it is the
*failing* engine that is silent.

**Environment caveat:** the failure was produced by a voice-less headless browser. The defect is that
no device-level failure is ever surfaced; on any machine where TTS is unavailable or broken
(no voice package, enterprise policy, some WebViews) the learner clicks Play and nothing happens.

**Impacts:** a beginner cannot tell whether the exercise is broken or their device is muted; there is
no fallback to the transcript, which the app already knows how to do.

---

### P49-D3 · LOW · "Pause" is a stop: it cancels speech and cannot be resumed

**Route:** `/student/listening`.
**Observed:** Pause calls `speechSynthesis.cancel()` and shows "Paused."; `speechSynthesis.paused`
stays `false`. Pressing **Play** afterwards speaks the whole transcript **again from the beginning**
(second `speak()` call, `rate=1`, `cancel` count incremented) — there is no resume and no saved position.
The engine's own pause/resume (`speechSynthesis.pause()`) is not used.

**Impact:** the label promises pause/resume semantics that do not exist; on a long exercise, Pause
silently costs the learner the beginning. (Arguably also a usability decision — flagged as a defect
because the control label is wrong, not merely because resume is absent.)

---

### P49-D4 · MEDIUM · A denied microphone in the speaking lab is reported as "I couldn't understand the audio"

**Route:** `/student/speaking`.
**Observed:** `rec.onerror` is a single handler that sets the message
**"I couldn't understand the audio. Please try again."** regardless of `event.error`. With an injected
`not-allowed` error event (**MOCKED**, to exercise that exact handler — `D17-mocked-denial.png`), the
learner is told their speech was unintelligible when in fact permission was refused, and receives **no
permission guidance** and no pointer to the keyboard path that exists on the same page.

**Scope note:** the real browser-permission-denied path could not be triggered here (see C8 below), so
this is confirmed by source inspection plus the mocked event, not by a real permission refusal.

**Impact:** the single most common speaking failure — a blocked microphone — produces a message that
blames the learner and suggests retrying an action that cannot succeed. The phase brief explicitly
lists "unclear permission instructions" as a target symptom.

---

### P49-D5 · LOW · No timeout or cancel while recognition is listening

**Route:** `/student/speaking`.
**Observed:** with the real (backend-less) recogniser, `start()` is called, then **neither** `onresult`
**nor** `onerror` fires; the state label stays **`LISTENING`** and the button stays "Recording..." for
the full observation window (5 s, observed twice). There is no timer, no cancel button, and no way out
except reloading. `D13-stt-failure.png`.

**Environment caveat:** the stall is caused by the missing speech backend. The defect is the absence of
any timeout or escape hatch, which leaves the learner in a dead state whenever the recogniser hangs
(flaky network, service outage, unsupported locale).

---

### P49-D6 · LOW · Mistake category is mis-assigned whenever the target sentence contains am/is/are

**Route:** `POST /api/voice/sessions/<id>/turn` → `mistakeCategory()` in `src/lib/voice/match.ts`.
**Observed:** transcript `"banana"` against target `"Hello. What is your name?"` is stored as
`mistakeCategory: "am/is/are"` and appended to the session's `mistakeNotes`, because the search runs
over `` `${target} ${heard}` `` — the target's own "is" always matches. Every wrong answer to any
sentence containing am/is/are gets this category.

**Impact:** the learner's mistake history and the adaptive/recommendation hook (`maybeRecommend`) are
fed a category that has nothing to do with what went wrong. Stored evidence: session `mistakeNotes`
`["am/is/are"]`, `SpeechAttempt.mistakeCategory="am/is/are"`.

---

### P49-D7 · LOW · "Start speaking" is enabled before any session exists, and results are silently discarded

**Route:** `/student/speaking`.
**Observed:** on a fresh page (consent accepted, no session created), the primary **Start speaking**
button is enabled. Pressing it enters the recording state ("Recording...") although no session exists;
`submit()` begins with `if (!sessionId) return`, so any recognised transcript would be thrown away. No
API call is made. The section does show "Choose Speak to begin.", which mitigates but does not prevent
the dead end.

**Impact:** the biggest button on the page produces a false impression of recording; a learner who
starts there gets nothing and no explanation.

---

## 4. Observations and content notes (not defects)

| # | Severity | Observation |
|---|---|---|
| O1 | INFO | `POST /api/voice/sessions/<id>/turn` returns `"practiceLabel": "AI Practice"` while grading is deterministic string matching. The label is **not rendered** anywhere in the speaking UI (no `tsx` reference), so it is API metadata only — but it overstates the mechanism for any future consumer. `"pronunciationScore": null` is returned honestly. |
| O2 | INFO | The listening exercise's `Show translation` renders **French** ("Bonjour. Je m'appelle Sam. Je travaille dans une caserne.") while the rest of the course content is Persian. The feature works; the seeded content is inconsistent. Needs a product/content decision, not an engineering fix. |
| O3 | INFO | Graded practice is not resumed in the UI: after reload the listening lab shows no previous result (`L14`). Attempts are stored server-side. Acceptable for practice; noted because "lost progress" is an in-scope symptom. |
| O4 | INFO | "Speaking time" quota is estimated at **15 s per submitted turn** (`durationSec: {increment: Math.min(maxAudioSec, 15)}`), not measured from audio. With the default `dailyMinutes=15` a learner is cut off after ~60 turns regardless of how long they actually spoke. |
| O5 | INFO | Sessions created by the lab remain `ACTIVE`; the lab has no "end session" control (the API endpoint exists). History therefore accumulates rows marked ACTIVE. Cosmetic for now; matters if status is ever used for reporting. |
| O6 | INFO | The recording in the lesson activity is deliberately ephemeral and is **not** uploaded; only `{selfReported:true}` is stored. Consistent with the consent copy, but it means no teacher can ever hear a learner's practice recording — worth confirming as an intended product boundary. |

---

## 5. Unavailable capabilities (explicitly not verified)

| Capability | Status | Reason |
|---|---|---|
| Audible TTS output from the listening lab | **BLOCKED** | 0 voices / no audio device in the test browser |
| Real browser speech recognition (transcript quality) | **BLOCKED** | no speech backend; no result or error produced (`D4`) |
| External STT provider path (`externalTranscribe`) | **NOT TESTED** | no `STT_*` credentials; unavailable state verified instead |
| External TTS provider path | **NOT TESTED** | no `TTS_*` credentials |
| Pronunciation analysis / pronunciation score | **NOT TESTED — does not exist** | no such feature; the app returns `pronunciationScore: null` and says feedback is unavailable |
| Physical microphone capture | **NOT TESTED** | simulated device only |
| Real microphone permission denial in the browser | **NOT TESTED** | consent withheld in headless produced neither grant nor rejection within the observation window; the denial UI was verified with a **simulated** `NotAllowedError` (C9) and the recognition-error copy with a **MOCKED** event (D4) |
| Exercise switching in the listening lab | **NOT TESTED** | only one exercise is published |
| Teacher listening/speaking authoring and assignment marking | **NOT TESTED** | outside this phase's scope |

---

## 6. What this phase did **not** do

- No source file, schema, migration, dependency or lockfile was modified (`find src prisma scripts
  public -newermt "2026-10-26 06:20"` → **0 files**).
- `prisma/dev.db`, `package-lock.json` and `.env` SHA-256 values are unchanged.
- All writing tests ran against `/tmp/p49_preview.db`; the repository database was never the target of
  the running server.
- No credential was invented, no successful provider response was mocked inside the application, and
  no mock result is presented here as real speech recognition.
