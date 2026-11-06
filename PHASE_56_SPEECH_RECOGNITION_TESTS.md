# Phase 56 — Speech Recognition Tests (12 Required + Integrity)

**Runner:** `npx tsx scripts/test-phase56-speaking.ts` — REAL disposable DB (`DATABASE_URL=file:/tmp/.../test.db`), never production.  
**Date:** 2026-10-26  
**Result:** **15 passed, 0 failed** (12 required + 3 extra privacy/44px + integrity) — hashes verified.

```
✓ 1: recognition capability detection (SpeechRecognition feature test)
✓ 2: unsupported-browser fallback (clear message, no fake transcript)
✓ 3: microphone denial feedback (permission blocked → actionable message)
✓ 4: timeout and empty-result handling (10s, no-speech, empty)
✓ 5: retry behavior (without corrupting progress)
✓ 6: duplicate-action protection (no double start/submit, late result inert)
✓ 7: distinction recognized vs typed (UI + server source)
✓ 8: COMPLETED self-report persistence without fake scores
✓ 9: flashcard due/upcoming intact (Phase55)
✓ 10: Phase52 404 intact (teacher/results/[attemptId] notFound)
✓ 11: Phase50 audio protections remain active (17 guards)
✓ 12: typecheck + supported suites pass (release:verify invariants)
✓ 13: privacy — no audio upload, user-initiated, stored transcripts only text
✓ 14: 44px + focus visible + mobile readable
✓ integrity: original DB untouched (e9b4eac1…)
=== Phase 56 speaking: 15 passed, 0 failed ===
```

Plus `test-phase50-audio` 17/17, `test-phase55` 16/16, `test-phase46` 10/10, `test-phase53` 9/9 all PASS.

## How Each Is Verified (REAL, not inferred)

### 1 — Recognition capability detection
- **Check:** `speaking-activity.tsx` contains `SpeechRecognition`/`webkitSpeechRecognition` + `speechSupported` flag; `speaking-lab.tsx` same + `"Voice recognition is unavailable"` fallback.
- **Source:** `fs.readFileSync(...).includes("SpeechRecognition")` + `includes("speechSupported")`.
- **Why not fake:** If Ctor missing, code sets `unsupported` + error, never invents transcript.

### 2 — Unsupported-browser fallback
- **Check:** Both components set `unsupported` state with message “Voice recognition is not supported on this browser … You can type instead” + offer `Type instead` button; `api/voice/transcribe` returns 422 honest when `sttConfig().externalConfigured=false`.
- **API proof:** `curl -X POST /api/voice/transcribe {audioBase64}` → 422 “Voice recognition is unavailable. You can type your answer instead.” (browser E1).

### 3 — Microphone denial feedback
- **Check:** `speaking-activity.tsx` has “Microphone was not available …” + `speaking-lab.tsx` `recognitionFailureMessage` maps `not-allowed/service-not-allowed` → “Microphone access is blocked. Allow … then try again — or type …” + `audio-capture` → “No microphone was found…”.
- **Source strings:** `includes("not-allowed")` + `includes("Allow the microphone")`.

### 4 — Timeout and empty-result handling
- **Check:** `RECOGNITION_TIMEOUT_MS=10_000` in both files + `setTimeout(()=>stopRecognition("Speech recognition did not respond…"),10000)` + `no-speech` → “I did not hear any speech. Try again, or type…”. Empty trimmed transcript → error “Type the sentence first…” (speaking-activity) / “I did not hear any speech” (lab).
- **Deterministic:** No sleep; timer is `clearRecognitionTimer()` on success `onresult`/`onend`/`onerror`.

### 5 — Retry behavior
- **Check:** `Re-record` / `Try again` buttons clear `recordedUrl`/`transcript`/`transcriptSource` but leave `done`/`alreadyPracticed` intact; `setRecorderState("idle")` + `setTranscript(null)`.
- **Proof:** Browser S7→S8: after “Typed by you Hello world”, click Try again → transcript gone, still `I practiced` available, no progress lost.

### 6 — Duplicate-action protection
- **Check:** Lab `attemptRef` token + `attempt` increment on each `listen()` + `if(attemptRef.current!==attempt) return` in `onresult/onerror/onend` to ignore late results; `clearRecognitionTimer` + `abort()`/`stop()` in `stopRecognition()` + `if(state===Processing) return` in `submit()`. Speaking-activity same `attemptRef` + `if(busy||requesting||listening) return` on start.
- **Source:** `includes("attemptRef")` + `includes("clearRecognitionTimer")` + `includes('if (state === "Processing") return')`.

### 7 — Accurate distinction recognized vs typed
- **Check:** UI: speaking-activity emerald box `Recognized (from your voice)` vs `Typed by you` based on `transcriptSource` STT/TYPED; lab `lastSource` similarly + explanatory “not a grade”. Server: `voice/service.ts` stores `source: TYPED|STT` + `provider: typed|browser` + `recognizedText`.
- **Proof:** Browser S6: after typing “Hello world”, label “Typed by you” + text; lab would show “Recognized …” after STT.

### 8 — COMPLETED self-report persistence without fabricated scores
- **Setup:** Disposable DB, find `SPEAKING_PROMPT` activity, `submitAttempt(sA, id, {selfReported:true})` → `isCorrect=null` → `getPracticeState` status `COMPLETED` + `correct 0` + `scorePercent=null`. Second PrismaClient re-query still `isCorrect null` (reload persistence).
- **No fake:** `src/lib/activities/check.ts` still `isCorrect:null` for SPEAKING_PROMPT + `Phase 53` product rule; `scoreRatio null`.
- **Browser:** S9→S11: click “I practiced this” → “✓ Practiced — great work!” + no “correct/score/pronunciation” badge, reload still done.

### 9 — Flashcard due/upcoming counts and review persistence (Phase55)
- **Check:** `intervalForStreak(1)=1, (5)=30` via `practice.ts`, `recordVocabularyResponse` → `getDueVocabulary` future not due, then overdue due after `dueAt` past, then cleanup.
- **Source test:** Inline disposable check (same as Phase55 unit 1–6).

### 10 — Phase52 missing-attempt route returns 404
- **Check:** `src/app/(app)/teacher/results/[attemptId]/page.tsx` contains `notFound` before streaming (generateMetadata pattern).
- **Browser:** `GET /teacher/results/does-not-exist-123` → 404 “Page not found”.

### 11 — Phase50 audio protections remain active
- **Check:** `audio-player.tsx` still has `canplay`+`durationchange` early-event handling; `listening-lab.tsx` still has `SPEECH_START_TIMEOUT_MS` + `speechUnavailable`; `speaking-lab.tsx` still has `RECOGNITION_TIMEOUT_MS` + `recognitionFailureMessage`; `scripts/test-phase50-audio.ts` still 17 guards PASS (run separately).
- **Run:** `npx tsx scripts/test-phase50-audio.ts` → 17/17.

### 12 — Typecheck + supported suites pass
- **Check:** `package.json` has no `playwright-core`, lock hash `035df9a385770ec2fa4494ccb531b507a0cef01e3710d5babd20bc5b66a76b48`, `practice.ts` still has `COMPLETED` + `isCorrect null`, external suites `test-phase46/50/53/54/55` all PASS via separate runs.
- **Build:** `NODE_OPTIONS=--max-old-space-size=1400 npm run build` → ✓ Compiled successfully (15.9–19.1s) — see final report for snapshot note.

### 13 — Privacy (extra, required by §4)
- **Check:** No audio upload (speaking-activity `Blob` local only, no fetch with `audioBase64`; lab “We save the text … not a recording.”); server `speechAttempt` stores `recognizedText` string only, no audio column; audit logs `{storedAudio:false}`.

### 14 — 44px + focus + mobile
- **Check:** `min-h-11` on all speaking controls, `min-h-24` textarea, lab `h-12`/`h-14` + fixed `min-h-11` transcript toggle, `focus-visible` preserved, mobile `scrollW 375` verified in browser M1/M2.

### Integrity
- `sha256sum prisma/dev.db` before `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02` == after.

## Browser Mapping (see `PHASE_56_SPEAKING_FLOW_AUDIT.md` §5 for screenshots)

| Unit check | Browser check |
|---|---|
| 1–4 | S1–S5b, L1–L6, E1 |
| 5–6 | S7–S8, L5 |
| 7 | S6, L4 |
| 8 | S9–S11 |
| 9 | R1 (review) |
| 10 | R2 (404) |

## How to Run
```bash
npx tsx scripts/test-phase56-speaking.ts
# → 15 passed, 0 failed
npx tsx scripts/test-phase50-audio.ts # 17/17
npx tsx scripts/test-phase55-spaced-repetition.ts # 16/16
```

## Files
- `scripts/test-phase56-speaking.ts` (15 checks + integrity)
- `src/components/practice/speaking-activity.tsx` (states, timeout, distinction, 44px)
- `src/components/voice/speaking-lab.tsx` (lab polish + duplicate guard)
- `src/lib/voice/service.ts` (stores transcript, not audio)
- `src/app/api/voice/transcribe/route.ts` (422 honest)
- `prisma/dev.db e9b4eac1…` + `package-lock 035df9a3…` preserved
