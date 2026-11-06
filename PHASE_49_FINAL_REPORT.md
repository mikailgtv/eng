# Phase 49 — Final Report: Speaking & Listening Lab

**Document:** `PHASE_49_FINAL_REPORT.md`
**Date:** 2026-10-26
**Scope:** product validation of the speaking and listening surfaces against a disposable database
**Companion documents:** `PHASE_49_AUDIO_TEST_PLAN.md`, `PHASE_49_AUDIO_FINDINGS.md`
**Evidence:** `evidence/p49/` — 32 screenshots, 4 result files

---

## 1. Verdict

# PARTIAL

Audio **playback** was genuinely verified with real MP3 assets; voice **capture** was genuinely
verified with a simulated device (26 KB of playable Opus audio); **grading** was verified end to end as
deterministic local transcript matching with persisted rows. What could **not** be verified is what
this environment cannot produce: audible speech output and real speech recognition. Five defects were
confirmed, two of them MEDIUM and one of them affecting **every** audio player in the product.

| Dimension | Result |
|---|---|
| Real MP3 audio plays, progresses, ends, replays, pauses, changes rate | **YES — verified** (media element + `currentTime` + `ended`) |
| Browser speech synthesis produces audible listening exercises | **NO — BLOCKED** (0 voices, no audio device); the invocation and the engine's failure event were observed |
| Learner recording captures real audio data | **YES — verified** (Blob of 26,490 bytes, `audio/webm;codecs=opus`, plays back) — **simulated device only** |
| Recording is stored or uploaded | **NO — by design**; only `{selfReported:true}` is stored, `storeAudio:false` |
| Answers are graded and persisted | **YES — verified** (`ListeningAttempt`, `ActivityAttempt`, `SpeechAttempt` rows read back) |
| Real transcription / speech recognition | **NOT VERIFIED — BLOCKED** (no speech backend; no external STT configured) |
| Pronunciation analysis or pronunciation scoring | **DOES NOT EXIST** — and the app says so; the API returns `pronunciationScore: null` |
| AI-backed speaking feedback | **NOT TESTED** — no provider key; all feedback is deterministic local text |

---

## 2. Test execution

**59 checks executed across four browser sessions plus direct API and database verification.**
Groups: L = listening lab (16), A = real MP3 + listen-and-type (12), C = lesson speaking activity (10),
D = speaking lab (13), S = API/persistence/isolation (8).

| Group | Checks | PASS | FAIL | BLOCKED | INFO | NOT TESTED |
|---|---|---|---|---|---|---|
| L — `/student/listening` | 16 | 11 | 2 | 2 | 1 | – |
| A — real MP3 + listen-and-type | 12 | 11 | 1 | – | – | – |
| C — lesson recording (simulated device) | 10 | 9 | – | – | – | 1 |
| D — `/student/speaking` | 13 | 10 | 2 | 1 | – | – |
| S — API / persistence / isolation | 8 | 8 | – | – | – | – |
| **Total** | **59** | **49** | **5** | **3** | **1** | **1** |

Per-check detail is in `evidence/p49/results-ab.json` and `results-d.json`.

**Honesty note on re-runs.** Three checks initially failed because of *my harness*, not the product and
were corrected and re-run rather than reported as defects: A9 (looked for `<input>` while the field is a
`<textarea id="listen-type-input">`), D3 and D6 (read `prompt`/`understood` from the top level while the
API wraps payloads in `{success, data}`). A fourth, D2, failed once on a too-short wait after a
dev-server compile and passed once the unlock was polled. None of these appear in the defect list.
No test was retried until it passed: the re-runs tested corrected assertions.

The same applies in the opposite direction — the two browser-side "no transcript" results were **not**
softened into passes. They are recorded as **BLOCKED** with the measured reason.

---

## 3. Were audio playback and recording genuinely verified?

**Playback — yes, at the media layer.** For `/audio/questions-1.mp3` the element reported
`duration=1.022`, `readyState=4`, `mediaError=null`; after pressing Play, `currentTime` advanced to
0.258 s with `paused=false`, ran to `ended=true` at exactly `1.022`, reset the control to "Play", and
**Replay** restarted from ~0 (`0.194`) and kept playing. Pause held the position (0.227). Speed
toggled `playbackRate` 1 → 0.75 → 1 with `aria-pressed` following. A second lesson was confirmed to load
different files (`hello-1.mp3`, `hello-2.mp3`), and all 8 shipped MP3s serve `200 audio/mpeg`.
A missing asset (request aborted in-browser — **simulated network fault**) showed
"Audio is not available right now." rather than a fake player.

What was **not** verified: that a human can *hear* it. There is no audio device in a headless browser;
"plays" here means the media pipeline decoded and advanced real time against a real file.

**Recording — yes, at the data layer, with a simulated microphone.** The lesson speaking activity
requested `{audio:true}`, received one live track, entered the recording state, and after Stop produced
a `<audio controls>` element backed by a `blob:` URL whose Blob contained **26,490 bytes** of
`audio/webm;codecs=opus` with `duration=2.04`, which then played back (`currentTime=0.551`). A
recording indicator was never accepted as proof; the bytes were fetched and measured. **Re-record**
cleared it. **This was a simulated device ("Fake Default Audio Input") — physical microphone hardware
was not tested and is not claimed.**

**The recording is deliberately never uploaded.** The only write during the whole flow was
`POST /api/activities/<id>/attempts` with a 21-byte body `{"selfReported":true}`; the stored
`ActivityAttempt` has `isCorrect=null, score=null`. The consent text ("We do not save the recording")
is therefore truthful, and the session payload confirms `storeAudio:false`.

---

## 4. Were transcription and scoring genuinely verified?

**Scoring — yes.** The mechanism is deterministic and was identified, exercised and read back:

- `src/lib/voice/match.ts` — normalised word matching, "all significant words or ≥ 80 %" → `understood`.
- Verified through the real API: exact text → `understood:true`; `"banana"` → `false` +
  "Try the full sentence again."; `"what name"` → `false` + "Try the full word or sentence again."
- Listening lab: 2 correct answers → "2 of 2 correct"; one wrong → "1 of 2 correct" — both persisted as
  `ListeningAttempt` rows with the submitted answers.
- Listen-and-type: `"Where you from"` → `isCorrect=false, score=0`; `"where are you from"`
  (lower case) → `isCorrect=true, score=1`, then the activity locked and still showed the result after
  reload.
- No external service is called: the browser made 3 same-origin requests only, and the API returns
  `pronunciationScore: null` on every turn.

**Transcription — no, and it is reported as blocked rather than passed.** In this browser the real
`SpeechRecognition` object is constructed and started but produces **neither a result nor an error**
(`errors=[]`, `results=0`, state stuck at `LISTENING`). The `/api/voice/transcribe` endpoint, which
would call an external STT provider, correctly returns **422 "Voice recognition is unavailable. You can
type your answer instead."** because `STT_*` is unset. To verify that the *application's handling* of a
transcript works, one isolated automated test injected a recognition result (**MOCKED**) — it produced
`POST /turn` → 200 with `understood:true, recognized:"Hello. What is your name?"`. That proves the app's
STT path; it is **not** evidence that speech recognition works, and it is labelled as mocked in every
document.

**Pronunciation feedback does not exist and was not invented.** The lesson activity states
"Pronunciation feedback is not available yet — your practice is saved for future coaching"; the history
page states "Counts only. No pronunciation score. Recordings are not stored."

---

## 5. Confirmed defects

| ID | Severity | Defect | Where |
|---|---|---|---|
| **P49-D1** | **MEDIUM** | Audio player never receives the track duration: readout "0:00 / 0:00", screen-reader timer "0:00 of 0:00", seek slider `max=0` → seeking impossible, on 3/3 loads and throughout playback, while the element itself has `duration=1.022, readyState=4`. Shared component: affects practice, listen-and-type and exam runner. | `src/components/practice/audio-player.tsx` |
| **P49-D2** | **MEDIUM** | When the speech engine fails, the listening lab shows **no message**: `speak()` fires `error="synthesis-failed"`, no `start` event, and the UI remains silent with no transcript fallback (the absent-API branch *is* handled well). | `src/components/voice/listening-lab.tsx` |
| **P49-D4** | **MEDIUM** | A denied/failed microphone in the speaking lab is reported as "I couldn't understand the audio. Please try again." The handler ignores `event.error`, so permission problems blame the learner and give no permission guidance. Confirmed by source + **MOCKED** `not-allowed` event; real permission refusal not reproducible here. | `src/components/voice/speaking-lab.tsx` |
| **P49-D3** | LOW | "Pause" is a stop: it calls `speechSynthesis.cancel()`, has no resume, and Play afterwards restarts from the beginning. Label promises pause/resume semantics. | `listening-lab.tsx` |
| **P49-D5** | LOW | No timeout or cancel while recognition listens: state stayed `LISTENING` for the whole window with no result, no error and no escape hatch. | `speaking-lab.tsx` |
| **P49-D6** | LOW | `mistakeCategory()` matches am/is/are over `` `${target} ${heard}` ``, so **every** wrong answer to a sentence containing "is/am/are" is categorised am/is/are (e.g. `"banana"` vs "Hello. What is your name?"), polluting `mistakeNotes` and the recommendation hook. | `src/lib/voice/match.ts` |
| **P49-D7** | LOW | "Start speaking" is enabled before any session exists; pressing it enters the recording state and any transcript is discarded (`if (!sessionId) return`), with no explanation. | `speaking-lab.tsx` |

Non-defect observations (O1–O6, including the API's `practiceLabel:"AI Practice"` on deterministic
grading, the French translation on a Persian course, and the 15 s-per-turn quota approximation) are
itemised in `PHASE_49_AUDIO_FINDINGS.md` §4.

**Nothing here was fixed.** As instructed, this phase produced no code, schema or dependency change.

---

## 6. Coverage statement

- ~21 of 110 pages have been exercised across Phases 44–49; this phase added **6 routes**
  (`/student/listening`, `/student/speaking`, `/student/speaking/history`, `/student/learn/<lessonId>` ×2,
  plus `/api/voice/*`). This is **representative testing, not exhaustive coverage.**
- Deeply exercised: 1 listening exercise (of 1 published), 1 lesson with 6 activities, 2 of 8 MP3
  assets, 1 speaking session flow per student.
- Not covered: teacher-side authoring/assignment, exam-runner audio, uploads, email/SMS, MFA,
  backups/restore, destructive admin actions, concurrency and load.

---

## 7. Integrity

| Item | Value |
|---|---|
| `prisma/dev.db` | `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` (unchanged) |
| `package-lock.json` | `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48` (unchanged) |
| `.env` | `6da800151ba6962c32e7e3d66eb82a7223ea5d5e3cf2df40e6053102b8bd33cb` (unchanged) |
| Source files modified in this phase | **0** (`find src prisma scripts public -newermt "2026-10-26 06:20"`) |
| Database used for writes | `/tmp/p49_preview.db` (disposable copy) |
| Project dependencies | untouched — browser tooling installed under `/tmp` only |
| Credentials | none created, requested or exposed; no provider was faked |

---

## 8. Recommendation for the next phase

1. **Fix P49-D1 first** — one change to `audio-player.tsx` (seed state from the element's current
   `duration`/`error` before attaching listeners) repairs the progress bar, the time readout, seeking
   and the load-time error state on **every** audio surface at once.
2. **Then P49-D2** — surface engine failure in the listening lab (listen for `error`/`start`, check
   `getVoices()`), reusing the transcript fallback that already exists for the absent-API case.
3. **Then P49-D4/D5/D7** — branch on `event.error` so microphone denial reads as a permission problem,
   add a recognition timeout/cancel, and gate the record button on an existing session.
4. **P49-D6** — restrict `mistakeCategory()` to the transcript-only comparison.
5. **Re-verification needed** (not possible here): audible TTS output on a machine with voices
   installed, and a real STT provider once the owner provisions credentials. Until then, treat
   real-world speech recognition as **unverified** — and do not add a pronunciation score that the
   product does not have.

---

## 9. Status

Phase 49 deliverables complete:

- `PHASE_49_AUDIO_TEST_PLAN.md`
- `PHASE_49_AUDIO_FINDINGS.md`
- `PHASE_49_FINAL_REPORT.md` (this document)

**Stopping here as instructed — Phase 50 has not been started.**
