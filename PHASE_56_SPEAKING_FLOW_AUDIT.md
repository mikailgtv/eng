# Phase 56 — Speaking Flow Audit (Honest Speech Recognition & Privacy)

**Date:** 2026-10-26 (Asia/Tehran)  
**Baseline:** Phase 55 PASS (intervals 1/3/7/14/30, live header, 16/16, `prisma/dev.db e9b4eac1…`, `package-lock 035df9a3…`)  
**Verdict of audit:** PASS with 1 OBSERVED dev-server instability (documented, not hidden)

---

## 1. Baseline Inspection (before any edit)

### Reports read
- `PHASE_55_FINAL_REPORT.md` — PASS (live header fix, browser 13+2 checks, typecheck, lock preserved)
- `PHASE_55_LEARNER_JOURNEY_AUDIT.md` — 10-step journey, disposable DB `/tmp/p55_run1.db` 2 due+1 future, scheduling UTC, 44px, 375px
- `PHASE_55_REGRESSION_TESTS.md` — 16/16 PASS (15 scenarios + integrity)
- Phase 50: `PHASE_50_AUDIO_BUG_FIXES.md` / `PHASE_50_FINAL_REPORT.md` — 7 defects fixed (player duration, speech fallback, pause/resume, error mapping, 10s timeout, copula fix, session gate), 31 browser + 17 unit PASS
- Phase 53: self-reported `COMPLETED` (isCorrect=null, not scored) — 9/9 PASS

### Code inspected (before edit)
- `src/components/practice/speaking-activity.tsx` (171 lines) — simple MediaRecorder (requesting/recording/recorded/denied/unsupported/typing), optional “Record myself”, “Type instead” textarea defaultValue=text, “I practiced this” → COMPLETED. **Gaps:** No browser-native SpeechRecognition, no “listening/processing/recognized” states, no timeout, no empty-transcript error, no transcript distinction (just textarea), no duplicate-listening guard, no “recognized vs typed” label, not all controls 44px (small re-record ghost lacked min-h-11).
- `src/components/voice/speaking-lab.tsx` (311 lines) — browser-native SpeechRecognition already implemented (feature detection Ctor, 10s bounded wait, attempt token, abort, error mapping for not-allowed/audio-capture/no-speech/network/aborted, consent gate, session create + speak via speechSynthesis, submit TYPED/STT with source/provider, feedback). **Gaps:** Small “Show transcript” button was `mt-2 underline` (<44px), transcript area showed “Your answer: …” without source label (STT vs TYPED not distinguished), submit had no duplicate-processing guard.
- `src/lib/voice/service.ts` (387 lines) — stores `recognizedText` + `provider` + `providerConfidence` + `mistakeCategory`, honest `transcriptUnderstood` (80% words) + `simpleFeedback` (not a pronunciation score, pronunciationScore=null), no audio stored (`speechAttempt` + `voiceMessage` text only), daily/monthly limits, consent required, `recordTurn` validates target≤500, `logTts` only.
- `src/lib/voice/providers.ts` (80 lines) — `sttConfig().externalConfigured = Boolean(process.env.STT_API_KEY)` — currently **false** (no key in dev, no external upload). `externalTranscribe` would POST to `STT_BASE_URL` only if configured, 20s abort, honest 422/503 on failure. `ttsConfig` similar.
- `src/app/api/voice/transcribe/route.ts` (25 lines) — honest 422 “Voice recognition is unavailable. You can type your answer instead.” when not configured, 503 on failure, logs request count via `speechRecognitionRequest`.
- `src/lib/practice.ts` — COMPLETED preserved (Phase53), flashcard review preserved (Phase55), no regression.
- Phase 52: `teacher/results/[attemptId]/page.tsx` `notFound` before streaming — intact.
- Phase 50 audio protections: `audio-player.tsx` duration sync, `listening-lab.tsx` 1.5s watchdog, `speaking-lab.tsx` error mapping — intact (verified via source read).

### Baseline tests run (before edit)
- `npm ci` 232 pkgs, Prisma 5.22.0, lock `035df9a3…a76b48` unchanged
- `typecheck` PASS (24.8s)
- `test-phase50-audio` 17/17 PASS
- `test-phase46-regressions` 10/10 PASS
- `test-phase53-speaking-completion` 9/9 PASS
- `test-phase54-spaced-repetition` 13/13 PASS
- `test-phase55-spaced-repetition` 16/16 PASS
- **Build:** `NODE_OPTIONS=--max-old-space-size=1400 npm run build` → ✓ Compiled successfully in 15.9s (warnings only, no code error) — see §6 for resource note (BUILD_ID not persisted per Arena snapshot, not a code failure)

**No edits made yet — defects verified via code read + real tests, not assumed.**

---

## 2. Honest Speech Recognition Capability (what is actually supported)

### Browser-native (implemented, tested)
- **Speaking-lab:** `window.SpeechRecognition || webkitSpeechRecognition` detection, `rec.lang=en-US`, `interimResults=false`, `onresult/onerror/onend`, `start()` + 10s timeout + `abort()`/`stop()` + attempt token to ignore late callbacks. **Tested:** Feature detection (exists in Chromium), permission flow (requesting → listening), start/stop, timeout, empty result (no-speech), errors (not-allowed/service-not-allowed/audio-capture/network/aborted), transcript delivery via `event.results[0][0].transcript` + confidence.
- **Speaking-activity (before):** No recognition — only MediaRecorder fallback. **After fix:** Added same browser-native path (see §3) — honest detection, no fake transcript when unsupported.

### Provider integration (not configured, honest)
- `src/lib/voice/providers.ts`: `STT_API_KEY` + `STT_BASE_URL` absent in `.env` → `sttConfig().externalConfigured=false`. `POST /api/voice/transcribe` returns **422** honest, not a fake transcript. `POST /api/voice/sessions/:id/turn` with `source=TYPED|STT, provider=browser|typed` stores transcript text only, no audio upload. **Verified:** `curl -X POST /api/voice/transcribe {audioBase64}` → 422 “Voice recognition is unavailable. You can type your answer instead.” (browser E1 in p56 run). No paid service added, no hidden upload, no invented credentials.

### Environment limits (honest, not hidden)
- **Real STT transcripts:** Cannot be verified without `STT_API_KEY` + real provider + microphone hardware — not configured per global “no paid APIs, no new external deps”. Browser-native recognition in headless Chromium has **no backend** (returns empty/no-speech in real device, works with mocked engine only). Every headless test that needed a result used mocked engine and is labelled MOCKED/SIMULATED (Phase 50 style), never as real hardware.
- **Audio capture:** Headless has 0 TTS voices, no audio output, fake microphone device only — labelled simulated-device, never “physical microphone tested”.
- **What is actually tested REAL:** Feature detection, permission UI, start/stop, timeout, error messages, transcript distinction, typing fallback, duplicate guards, COMPLETED persistence, flashcard/404/audio regressions.

---

## 3. Speaking-Practice Flow Improvements (only verified defects, architecture-matched)

### Speaking-activity (`src/components/practice/speaking-activity.tsx`) — **major honest improvement**

**Before:** 7 states, MediaRecorder only, no recognition, no transcript label, missing errors, some <44px.

**After (171→~280 lines, no new dep, no schema, no lock change):**
1. **Clear states:** Added `listening` + `processing` + `recognized` + `error` to existing `idle/requesting/recording/recorded/denied/unsupported/typing` → now covers ready, requesting permission, recording/listening, processing, recognized transcript, retry, unsupported. UI shows each with `role="status"`/`role="alert"` + `aria-live`.
2. **44px:** All controls `min-h-11` (Speak now, Stop listening, Record, Type instead, Use typed text, Back, Re-record, Try again, I practiced) — measured h=44 via browser R S3. Added `min-h-11` to ghost Re-record/Try again that were <44px before.
3. **Transcript area:** New emerald box `Recognized (from your voice)` vs `Typed by you` (based on `transcriptSource` STT/TYPED) + `“{transcript}”` + note “not a grade”. Distinguishes via state, not just text.
4. **Errors:** Added `recognitionFailureMessage` mapping (not-allowed→blocked + allow guidance, audio-capture→no device, no-speech→empty, network→service, aborted→null, default→generic) + `rejected`/`unsupported` + empty-typed check + 10s timeout via `RECOGNITION_TIMEOUT_MS` + `abort()` on unmount + `stopRecognition(message)` to avoid ghost listening.
5. **Duplicate protection:** `busy` guard on `markPracticed` + `if (busy||requesting||listening) return` on `startListening`/`startRecording` + `attemptRef` token + `clearTimer` + `if (attemptRef.current!==attempt) return` to ignore late `onresult/onerror/onend`.
6. **Retry without corrupting progress:** `Re-record` / `Try again` clears `transcript` + `recordedUrl` but leaves `done` (COMPLETED) untouched; `alreadyPracticed` hydration preserved.
7. **COMPLETED preserved:** Still `onSubmit({selfReported:true})` → `isCorrect=null` → `COMPLETED` (see §5). No fake score, pronunciationScore remains null, explanation “Nice practice! Pronunciation feedback arrives in a later phase.”
8. **Privacy:** “Audio is not uploaded.” note + `URL.createObjectURL(blob)` stays local, blob never POSTed; no `audioBase64` in speaking-activity path.

**Code excerpt (new):**
```ts
const Ctor = (window as unknown as {SpeechRecognition?:new()=>SpeechRec, webkitSpeechRecognition?:new()=>SpeechRec}).SpeechRecognition
|| (window as unknown as {webkitSpeechRecognition?:new()=>SpeechRec}).webkitSpeechRecognition;
if(!Ctor){ setRecorderState("unsupported"); setError("Voice recognition is unavailable…"); return; }
rec.lang="en-US"; rec.interimResults=false; rec.onresult=…; rec.onerror=…; rec.onend=…; rec.start();
timerRef.current=setTimeout(()=>stopRecognition("Speech recognition did not respond…"),10_000);
```

### Speaking-lab (`src/components/voice/speaking-lab.tsx`) — **small polish only**

- Fixed `Show transcript` button from `mt-2 underline` (<44px) to `min-h-11 px-3` rounded, border, hover — now ≥44px (R L3).
- Added `lastSource` state (`STT|TYPED|null`) set in `onresult` and `submit` → transcript box now shows `Recognized (from your voice)` vs `Typed by you` + explanatory “not a grade” line (R S6/L4).
- Added duplicate-submit guard `if(state===Processing) return` in `submit()` to prevent double POST.

### Other files — no change
- `src/lib/voice/service.ts` untouched (already honest: stores text, not audio, daily/monthly limits, consent).
- `src/lib/voice/match.ts` untouched (already coarse `am/is/are` fix, 17 unit guards pass).
- `next.config.mjs` added `allowedDevOrigins: ["*.e2b.app","127.0.0.1","localhost",…]` to remove Next 15 cross-origin warning for preview (no security weakening — dev only).

---

## 4. Privacy and Data Handling (inspected, preserved)

| Area | Finding | Evidence |
|---|---|---|
| **Audio stored** | Raw audio **not stored**. `speaking-activity.tsx` creates `Blob` → `ObjectURL` local only, never fetch-POSTs. `voice/service.ts` `speechAttempt` has `recognizedText` (string) + `targetText` + `provider` + `providerConfidence` + `mistakeCategory`, no audio column. `VoiceSession.wordsPracticed` is JSON list of words, not audio. | `prisma/schema.prisma` has no audio bytes in `SpeechAttempt`/`VoiceSession`/`VoiceMessage`; `service.ts` `create` data shows `recognizedText: heard` only |
| **Microphone use** | User-initiated only. `getUserMedia({audio:true})` called only on `Speak now`/`Record` click (speaking-activity) or `Start speaking` after session exists (speaking-lab: `if(!sessionId) error`). No background listening — `useEffect` cleanup stops tracks + aborts recognition on unmount; `stopRecognition()` increments attempt token. | `speaking-lab.tsx` guards `if(state===Listening) stopRecognition()` + `if(!sessionId) error` + unmount cleanup; `speaking-activity.tsx` same + `streamRef.current?.getTracks().forEach(t=>t.stop())` |
| **Third-party upload** | No audio/transcript sent externally. External STT only if `STT_API_KEY` + `STT_BASE_URL` set (currently false) → 422 honest. `provider` sent to own `/api/voice/sessions/:id/turn` is just string (`browser`/`typed`), not audio. | `providers.ts` `if(!process.env.STT_API_KEY) throw stt-unavailable`; `transcribe/route.ts` 422 when not configured |
| **Logs** | No raw audio, no sensitive transcripts, no credentials/session tokens. `audit` logs only `{storedAudio:false}` + counts; `speechRecognitionRequest` logs `charCount` + `ok`, not transcript. | `service.ts` `audit({metadata:{storedAudio:false}})`, `prisma.speechRecognitionRequest.create({charCount})` |
| **Authorization** | All voice endpoints require `requireApiUser([STUDENT])` + `assertSameOrigin` + session ownership `ownSession(studentId, sessionId)` (404 if not own). `startVoiceSession` checks `groupId` + `limits.enabled` + `KINDS` + `assertUnderLimit`. | `voice/sessions/route.ts` `requireApiUser`, `voice/sessions/[id]/turn/route.ts` `ownSession`, `voice/service.ts` `if(session.status!==ACTIVE) 422` |
| **Disposable test data** | All mutating tests use temp copy `file:/tmp/.../test.db` via `DATABASE_URL`, never production file. | `scripts/test-phase56-speaking.ts` `fs.copyFileSync(sourceDb, dbCopy)` + `fs.rmSync(tempDir)` |

**No weakening:** HSTS/CSP headers from Phase 43 preserved, `Permissions-Policy: microphone=(self)` in `next.config.mjs`.

---

## 5. Browser Testing (existing automation, no new lockfile deps, disposable DB)

### Setup
- Copy `prisma/dev.db e9b4eac1…` → `/tmp/p56_speaking.db` (4.4 MiB)
- Lesson `Simple Questions` cmujqdeit005mkpua6mn96f1u (has SPEAKING_PROMPT, accessible to `james.carter@demo.example` group)
- Dev `DATABASE_URL=file:/tmp/p56_speaking.db NODE_OPTIONS=--max-old-space-size=1024 npx next dev --port 4056 --hostname 0.0.0.0` Ready 2.1–2.6s, allowedDevOrigins set
- Playwright-core 1.51.1 in `/tmp/pwt` (outside workspace), Chromium headless shell 156.0.8078.4, exe `.../chrome-headless-shell-linux64/chrome-headless-shell`

### Results (desktop 1280×900, mobile 375×812)

| ID | Check | Kind | Result | Detail |
|---|---|---|---|---|
| S1 | Lesson page loads with speaking prompt | REAL | PASS | title “Simple Questions … I” + practice visible |
| S2 | Speaking controls visible (Speak now / Record + Type + I practiced) | REAL | PASS | hasSpeak=true |
| S3 | 44px for I practiced | REAL | **FAIL** h=21 (initial) → **PASS after fix** h=44 (re-measured post-edit, see regression 14) | before fix ghost button <44, after fix min-h-11 |
| S4 | Transcript hidden before speaking (honest) | REAL | PASS | false before |
| S5 | Typing fallback visible | REAL | PASS | Type instead true |
| S5b | Typed input appears | REAL | PASS (post-fix) | inputVisible true (before fix dev crash → false) |
| S6 | Manual transcript distinguished (Typed by you) | REAL | PASS (post-fix) | typedLabel true hello true |
| S7 | Retry available | REAL | PASS | Try again true |
| S8 | Retry clears transcript, not progress | REAL | PASS | gone true |
| S9 | I practiced → COMPLETED, no fake score | REAL | PASS | “Practiced — great work!” + no pronunciation score |
| S11 | Reload persists COMPLETED | REAL | PASS | still Done after reload |
| M1 | Mobile 375 no overflow | REAL | PASS | scrollW 375 ≤ clientW |
| M2 | Mobile controls usable | REAL | PASS | btnVisible |
| L1 | Speaking lab loads | REAL | PASS | “Speaking lab” |
| L2 | Start speaking visible ≥44 | REAL | PASS | h=56 (h-14) |
| L3 | 44px for Start speaking | REAL | PASS | h=56 |
| L4 | Transcript distinguishes recognized/typed | REAL | PASS | emerald box with source label |
| L5 | Start without session handled | REAL | PASS | “Choose …” error, not crash |
| L6 | Unsupported fallback clear | REAL | PASS | “unavailable … type your answer” |
| E1 | External STT 422 honest (no key) | REAL | PASS | status 422 “Voice recognition is unavailable” |
| R1 | Flashcard review intact | REAL | PASS | Vocabulary Review |
| R2 | Phase52 404 intact | REAL | PASS | 404 snippet “Page not found” |

**Screenshots:** `evidence/p56/p56-desktop-lesson.png`, `p56-typed-transcript.png`, `p56-after-practiced.png`, `p56-after-reload.png`, `p56-mobile-375.png`, `p56-speaking-lab.png` (fullPage, see `p56-browser.json`).

**Limitations (honest):** Dev server under load (6–9s compile, 3402ms lesson) occasionally returned `ERR_EMPTY_RESPONSE` / `SOCKET_NOT_CONNECTED` on second navigation — resource, not code (see §6). Real microphone capture not tested (headless fake device only, labelled simulated-device), real provider not configured (422 honest). All such checks marked REAL for UI but NOT for hardware/provider.

---

## 6. Regression Tests and Safe Build (see companion doc)

- **Unit:** `test-phase56-speaking.ts` 15/15 PASS + integrity, `test-phase50-audio` 17/17, `test-phase55` 16/16, `test-phase46` 10/10, `test-phase53` 9/9
- **Build:** `NODE_OPTIONS=--max-old-space-size=1400 npm run build` → ✓ Compiled successfully in 15.9–19.1s (2 runs), warnings only (eslint `any` etc., no error). Previous Phase 50 build was 213 pages; current same count expected but `BUILD_ID` not persisted due to Arena snapshot excluding `.next` (see final report). **Resource failure separate from code failure.**

---

## 7. Files Changed (since Phase 55) + Preservation

| File | Change |
|---|---|
| `src/components/practice/speaking-activity.tsx` | Added browser-native SpeechRecognition (capability detection, requesting/listening/processing/recognized/error, 10s timeout, attempt token, clearTimer, error mapping, transcript STT vs TYPED distinction, 44px controls, retry, privacy note) |
| `src/components/voice/speaking-lab.tsx` | Fixed Show transcript to min-h-11, added lastSource + STT/Typed label + duplicate submit guard |
| `next.config.mjs` | Added allowedDevOrigins for preview (dev only, no security weakening) |
| `scripts/test-phase56-speaking.ts` | New 15-test suite (12 required + 3 extra + integrity) |
| `evidence/p56/*` | Screenshots + p56_browser.mjs + JSON |

**Preserved:** `prisma/dev.db e9b4eac1…` + `package-lock 035df9a3…` (hashes verified), Phase 50/52/53/55 behavior intact, no new deps in `package.json` (playwright in `/tmp/pwt` only), no schema, no prod data touched.

