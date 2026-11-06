# Phase 49 — Speaking & Listening Lab: Real Functional Validation

**Document:** `PHASE_49_AUDIO_TEST_PLAN.md`
**Date:** 2026-10-26 (evidence timestamps are UTC; local time is UTC+03:30)
**Type:** Product testing only — no fixes, no redesign, no dependency or schema changes
**Verdict-bearing companion documents:** `PHASE_49_AUDIO_FINDINGS.md`, `PHASE_49_FINAL_REPORT.md`

---

## 1. Objective

Determine whether the listening and speaking surfaces of this LMS **actually function** — whether
audio plays, whether a learner's voice is truly captured, whether answers are graded, and where the
audio pipeline is only cosmetic. A visible button, player or "Recording…" label is treated as
**no evidence at all** until the resulting media, request or database row is observed.

Explicit non-goals (per phase instructions): no implementation work, no new features, no
infrastructure hardening, no security audit, no schema/migration/lockfile changes, no production or
organisational staging contact.

---

## 2. Surfaces under test

| Surface | Route | Role | Rendering component |
|---|---|---|---|
| Listening lab (TTS-based) | `/student/listening` | STUDENT | `src/components/voice/listening-lab.tsx` |
| Lesson player (real MP3) | `/student/learn/<lessonId>` | STUDENT | `src/components/practice/audio-player.tsx` via `listen-type-activity.tsx`, `activity-runner.tsx` |
| Lesson speaking prompt (MediaRecorder) | `/student/learn/<lessonId>` | STUDENT | `src/components/practice/speaking-activity.tsx` |
| Speaking lab (Web Speech recognition) | `/student/speaking` | STUDENT | `src/components/voice/speaking-lab.tsx` |
| Speaking history | `/student/speaking/history` | STUDENT | same feature |
| Voice / listening API | `/api/voice/*` | STUDENT | `src/lib/voice/{service,match,providers,settings}.ts` |

Fixtures used (disposable copy only):

- Listening exercise `cmula5f6a0000txzv066afbfd` — "Hello at the station", PRE_A1, 2 questions, `PUBLISHED`.
- Lesson `cmujqdeit005mkpua6mn96f1u` — "Simple Questions" (contains a LISTEN_AND_TYPE with
  `/audio/questions-1.mp3` and a SPEAKING_PROMPT).
- Lesson `cmujqdeir001hkpuacb07lxwa` — contains LISTEN_AND_CHOOSE/LISTEN_AND_TYPE on
  `/audio/hello-1.mp3` and `/audio/hello-2.mp3`.
- `public/audio/*.mp3` — 8 real MPEG layer III assets (4.5–14 KB).
- Students: `james.carter` (exercised listening + lesson speaking), `lena.torres` (fresh consent gate,
  speaking lab sessions).

---

## 3. Environment

| Item | Value |
|---|---|
| App | Next.js 15.5.27 (`next dev`) on `http://127.0.0.1:4051` |
| Database | **Disposable copy** `/tmp/p49_preview.db` copied from `prisma/dev.db`; original untouched |
| Runtime | Node v22.23.3 (`/home/user/.local/share/lms-runtime/node-v22.23.3-linux-x64`) |
| Browser | Playwright-core 1.64.1 driving `chromium_headless_shell-1248` from `/tmp/pw-browsers` |
| Browser flags | `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --autoplay-policy=no-user-gesture-required` |
| Harness location | `/tmp/pwt/*.mjs` (outside the project; `package.json` unchanged) |
| Credentials present | `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_DEMO_HINTS` only |
| STT/TTS/AI credentials | **Absent** (documented as empty in `.env.example`); none were fabricated |

**Browser capability inventory (measured, not assumed):**

| Capability | Result |
|---|---|
| `speechSynthesis` | present, **0 voices installed** |
| `SpeechRecognition` / `webkitSpeechRecognition` | constructor present, **no speech backend** (never returns a result) |
| `navigator.mediaDevices.getUserMedia` | present; fake device "Fake Default Audio Input" grants a live audio track |
| `MediaRecorder` | present; produces `audio/webm;codecs=opus` |
| Audio output device | none (headless) |

---

## 4. Labelling rules for evidence

Because this environment cannot emit sound or recognise speech, every test is labelled with how the
result was produced:

- **REAL** — the browser exercised the real code path against real data (e.g. an MP3 decoded and
  played; a Blob produced by MediaRecorder and played back; a POST answered by the real API).
- **SIMULATED DEVICE** — Chromium's fake audio input supplied the microphone stream. This is **not**
  physical microphone hardware.
- **SIMULATED NETWORK FAULT** — a request was aborted in the browser to observe the missing-asset path.
- **MOCKED** — an isolated automated test injected a recognition event/error because the browser
  cannot produce one. Used only to exercise the application's handling code; **never** presented as
  verification of real speech recognition.
- **BLOCKED / NOT TESTED** — the capability does not exist in this environment; recorded with the
  reason rather than inferred as passing.

---

## 5. Test matrix

### Group L — Listening lab (`/student/listening`)

| ID | Steps | Expected |
|---|---|---|
| L1 | Navigate; read heading, exercise selector, questions | "Listening lab", 1 published exercise, 2 questions |
| L2 | Inventory `speechSynthesis.getVoices()` | Voices available for audible output |
| L3 | Click **Play**; inspect `speechSynthesis.speak` call | One utterance, rate 1, `en-US`, exact transcript |
| L4 | Observe utterance `start`/`error` events and `speaking` | Speech actually begins |
| L5 | With a failing engine, look for user-visible feedback | A message explains that audio is unavailable |
| L6 | Click **Pause** | Speech stops; "Paused." note |
| L7 | Click **Pause** then **Play** | Playback resumes from the paused position |
| L8 | Click **Slow** | Next utterance at rate 0.75 |
| L9 | Click **Replay** | Transcript re-spoken at rate 1 |
| L10 | Toggle transcript | Transcript shows, then hides |
| L11 | Toggle translation | Stored translation shown |
| L12 | Answer both questions correctly; **Check** | "2 of 2 correct" |
| L13 | Answer one question incorrectly; **Check** | "1 of 2 correct" |
| L14 | Reload after grading | Record whether the result survives |
| L15 | 375 px viewport | No horizontal overflow; touch targets ≥ 44 px |
| L16 | Simulate absence of `speechSynthesis`; **Play** | "Audio is unavailable. Read the sentence below." + transcript auto-opened |

### Group A — Real MP3 playback (`/student/learn/<lessonId>`)

| ID | Steps | Expected |
|---|---|---|
| A1 | Read `<audio>` after load | src `/audio/questions-1.mp3`, duration ≈ 1.0 s, readyState ≥ 1 |
| A2 | Click **Play**; sample `currentTime` after 420 ms | `currentTime` advances, `paused=false` |
| A3 | Wait for completion | `ended=true`, position ≈ duration, control back to Play |
| A4 | Click **Replay from the start** | `currentTime` back near 0 and playing |
| A5 | Click **Pause** | `paused=true`, position retained |
| A6 | Move the seek slider | `currentTime` follows the slider |
| A7 | Click **Speed** twice | `playbackRate` 0.75 then 1.0 |
| A8 | Abort the MP3 request; press Play | "Audio is not available right now." (no fake player) |
| A9 | Locate the listen-and-type answer field | A text field exists inside the activity |
| A10 | Submit the exact transcript | Graded correct |
| A10w | Submit a shortened transcript | Graded incorrect (0 points) |
| A11 | 375 px viewport | No horizontal overflow |

### Group C — Lesson speaking activity (`speaking-activity.tsx`)

| ID | Steps | Expected |
|---|---|---|
| C0 | Reload a previously answered listen-and-type activity | Answer locked, feedback retained |
| C1 | Click **Record myself** with the simulated device | Permission granted, 1 live audio track, Stop control |
| C2 | Stop after ~1.5 s; fetch the `blob:` URL | Blob holds real audio bytes; `<audio controls>` playable |
| C3 | Play the recorded clip | `currentTime` advances |
| C4 | Click **Re-record** | Player removed, recording available again |
| C5 | **Type instead** → **I practiced this** | Progress saved; confirmation shown |
| C6 | Watch network during C1–C5 | Recording never uploaded |
| C7 | Read the disclosure under the prompt | App states pronunciation feedback is unavailable |
| C8 | Click **Record myself** with permission withheld | Guidance + typing offered |
| C9 | Force `getUserMedia` to reject `NotAllowedError` (simulated) | "Microphone was not available…" + **Type instead** |

### Group D — Speaking lab (`/student/speaking`)

| ID | Steps | Expected |
|---|---|---|
| D1 | First visit by a never-consented student | Voice notice + **I understand** |
| D2 | Accept the notice | `POST /api/voice/consent` succeeds; recording unlocks |
| D3 | Choose a mode (**Speak**) | `POST /api/voice/sessions` returns a prompt, displayed |
| D4 | Click **Start speaking** (real recognition) | Transcript returned |
| D5 | Watch state after a failing recognition | A message tells the learner what happened |
| D6 | MOCKED recognition result | Transcript reaches `POST /turn` and is graded |
| D7 | Type the prompt text → **Send** | "Your sentence was understood…" |
| D8 | Type unrelated text → **Send** | Not accepted; retry guidance |
| D9 | Click **Try again** | Another turn for the same session |
| D10 | MOCKED `not-allowed` recognition error | Message mentions microphone/permission |
| D11 | Open `/student/speaking/history` | Session listed |
| D12 | Inspect all browser requests | No external speech/AI host contacted |
| D13 | 375 px viewport | No horizontal overflow |

### Group S — API, persistence and isolation

| ID | Check | Expected |
|---|---|---|
| S1 | `POST /api/voice/transcribe` with no STT provider | 422 "Voice recognition is unavailable…" |
| S2 | Student A posts a turn into Student B's session | 404 |
| S3 | Submit to an unknown listening exercise | 404 |
| S4 | `POST /api/voice/consent` with a foreign `Origin` | 403 |
| S5 | `ListeningAttempt` rows after L12/L13 | 2 rows, correct counts, answers stored |
| S6 | `ActivityAttempt` rows after A10/A10w/C5 | Typed answers graded; self-report has null score |
| S7 | `VoiceSession` / `VoiceMessage` / `SpeechAttempt` after D | Session counters, message log, attempt rows |
| S8 | Session payload + network | `storeAudio:false`; no audio payload submitted |

---

## 6. Prerequisites

1. `.nvmrc` runtime sourced; `node_modules` present (installed earlier with `npm ci`).
2. Disposable DB copy created **before** any writing test (`cp prisma/dev.db /tmp/p49_preview.db`).
3. `next dev` started on a dedicated port with `DATABASE_URL` pointing at the copy; the original
   `prisma/dev.db` is never the target of a running server.
4. Session cookie obtained via `POST /api/auth/login` (UI login is flaky under automation).
5. Browser tooling installed under `/tmp` only; project dependencies untouched.

---

## 7. Out of scope / not testable in this environment

- **Audible output.** No audio device and no TTS voices — playback can be proven only at the media
  element/blob layer, never "a human heard it".
- **Real speech recognition.** The browser exposes the API but has no backend; no transcript can be
  produced without contacting an external service, which is not configured and must not be faked.
- **External STT/TTS/AI providers.** No keys. The unavailable-provider state is verified; the
  provider-backed path is not.
- **Physical microphone hardware.** Only a simulated device is available.
- **Teacher-side listening/speaking authoring and assignment flows** beyond the pages inspected.
- **Exercise switching inside the listening lab** — exactly one exercise is published, so there is
  nothing to switch to.
- **Load, concurrency and long-session behaviour.**

---

## 8. Evidence

32 screenshots and 5 machine-readable result files are written to `evidence/p49/`:

- **Listening lab (6):** `L01-listening-desktop.png`, `L02-play-no-voices.png`,
  `L03-transcript-translation.png`, `L04-graded-2of2.png`, `L05-listening-375.png`,
  `L06-no-synth-fallback.png`
- **Real MP3 player / listen-and-type (7):** `A01-lesson-audio-player.png`, `A02-playing.png`,
  `A03-audio-missing.png`, `A05-lesson-375.png`, `A06-seek-broken.png`,
  `A07-listen-type-wrong.png`, `A08-listen-type-correct.png`
- **Lesson speaking activity (6):** `C00-listen-type-persisted.png`, `C01-recording.png`,
  `C03-recorded-playback.png`, `C04-practiced.png`, `C05-mic-denied.png`,
  `C06-mic-denied-simulated.png`
- **Speaking lab (13):** `D01-consent.png`, `D02-session-started.png`, `D02b-after-start.png`,
  `D10-consent-gate.png`, `D11-consent-accepted.png`, `D12-session-prompt.png`,
  `D13-stt-failure.png`, `D14-mocked-stt.png`, `D15-typed-correct.png`, `D16-typed-wrong.png`,
  `D17-mocked-denial.png`, `D18-history.png`, `D19-speaking-375.png`
- **Results (5):** `results-ab.json` (listening + MP3 groups), `results-d.json` (speaking lab group),
  `results-ab.partial.json` and `results-cd.partial.json` (in-flight snapshots, superseded by the
  final files), `api-log.json` (captured `/api/voice/*` calls with status codes)
