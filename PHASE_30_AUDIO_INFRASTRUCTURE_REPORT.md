# Phase 30 — Audio Infrastructure Report

**Date:** 2026-10-10
**Status:** VERIFIED (static) / NOT VERIFIED (live STT/TTS provider, no credentials)

## Audit of Existing Audio Features

### Listening lesson audio
- Model: `ListeningExercise` with questions JSON, `ListeningAssignment` per group, `ListeningAttempt` with answers
- Audio file? `AudioAsset` model has title, transcript, url? optional — no storagePath, no duration, no processing status
- No file upload for listening audio before Phase 30; audio URL could be external
- **Gap:** no file metadata, no private access control for listening audio files

### Speaking practice recordings
- Model: `VoiceSession` (kind SPEAKING, LISTENING, VOICE_CHAT, PRONUNCIATION, SHADOWING), `VoiceMessage` (role PROMPT, USER, ASSISTANT), `SpeechAttempt` (targetText, recognizedText, understood, provider, confidence, mistakeCategory)
- Comment in schema: "This app stores recognized text. Raw audio is not stored unless an admin turns storage on."
- `VoiceSetting`: storeAudio boolean (false default), requireConsent, teacherTranscripts, etc.
- **Before Phase 30:** no audio file storage, only transcripts

### Speech-to-text requests
- `POST /api/voice/transcribe` — student only, body { audioBase64 max 2M }, checks `sttConfig().externalConfigured` (STT_API_KEY exists)
- `externalTranscribe()` fetches STT_BASE_URL with Bearer STT_API_KEY, 20s timeout, returns text + confidence
- Logs `SpeechRecognitionRequest` with studentId, provider, charCount, ok
- If not configured, returns 422 "Voice recognition is unavailable. You can type"
- **No audio storage**, only text
- **Status:** STT provider NOT VERIFIED (no STT_API_KEY in env)

### Text-to-speech output
- `POST /api/voice/speak` — student only, body { text min1 max400, provider browser/external }, logs TtsRequest
- `externalSpeak()` fetches TTS_BASE_URL with Bearer TTS_API_KEY, 20s timeout, returns audioBase64 or fallback
- If not configured, returns available false + message "Audio is unavailable. Read the sentence below."
- **No audio file storage**, returns base64 for client to play
- **Status:** TTS provider NOT VERIFIED (no TTS_API_KEY)

### Teacher review of permitted student recordings
- `teacherTranscripts` setting: if true, teachers can see transcripts
- No audio review before Phase 30 (only transcripts)
- `storeAudio` setting exists but not implemented with file storage

### Audio progress and processing status
- VoiceSession: turns, recognizedCount, retryCount, durationSec, wordsPracticed, mistakeNotes, summary
- No explicit PENDING/PROCESSING/READY/FAILED states before Phase 30, only ACTIVE/COMPLETED for session

## Requirements Implementation (Phase 30)

### Authenticate and authorize audio uploads and playback
- New `src/lib/storage/audio.ts` `uploadAudioRecording()` requires actorId, validates category, uses secure pipeline
- Download via adapter with auth check (not direct URL)
- **Status:** code VERIFIED, but not wired to existing voice session flow (voice still uses base64, not file upload)

### Validate format and duration
- `validateAudioDuration()` checks 1-120 sec, in audio.ts
- Format validated via `validateFile()` with policy (mp3,wav,m4a,ogg,webm) + magic bytes
- **Status:** VERIFIED in code

### File-size and request-duration limits
- Policy: audio_recording 10 MB, speaking_practice 8 MB, listening_audio 20 MB
- Voice settings: maxAudioSec 5-60 sec (clamped), dailyMinutes 1-180, monthlyMinutes 1-2000
- Transcribe: audioBase64 max 2M chars
- Speak: text max 400 chars
- **Status:** VERIFIED

### Avoid logging raw audio, transcripts, tokens, provider credentials
- Monitoring logs only keyPrefix, no raw audio, no transcripts, no tokens
- Audit logs for audio upload would include fileName, size, checksum prefix, not raw audio
- STT/TTS providers log only provider name and charCount, not raw audio or API keys
- **Status:** VERIFIED (code inspection)

### Keep private recordings private
- Policy accessLevel PRIVATE for audio_recording, speaking_practice
- Download requires auth + participant/owner check (if wired)
- No public URL
- **Status:** VERIFIED in policy, but not yet enforced in voice flow (transcripts only)

### Asynchronous processing for expensive operations
- STT/TTS already async fetch with timeout, not blocking main thread
- No queue/worker for audio processing — could be added via workflow worker (WORKFLOW_WORKER_SECRET)
- **Status:** PARTIALLY VERIFIED (fetch is async, but no job queue)

### Track states PENDING, PROCESSING, READY, FAILED
- New `AudioProcessingState` type and `processingStatus` field in file metadata
- VoiceSession currently ACTIVE/COMPLETED, not PENDING/PROCESSING — gap
- **Status:** PARTIALLY VERIFIED (type defined, but not integrated into VoiceSession)

### Handle provider timeouts, quota limits, retries, unavailable services
- STT/TTS have 20s AbortController timeout, catch and return fallback
- No retry policy for STT/TTS (could add withRetry from reliability.ts)
- Quota: dailyMinutes, monthlyMinutes checked via `assertUnderLimit()` (not shown but exists in voice service)
- **Status:** PARTIALLY VERIFIED (timeout handled, retry NOT IMPLEMENTED)

### Avoid duplicate processing or billing on retries where idempotency can be supported
- No idempotency key for STT/TTS requests
- SpeechRecognitionRequest and TtsRequest logs charCount but no idempotency
- **Status:** NOT IMPLEMENTED

### Clear user-facing errors when voice services unavailable
- Transcribe: 422 "Voice recognition is unavailable. You can type your answer instead." or 503 "I couldn't understand the audio. Please try again."
- Speak: returns available false + "Audio is unavailable. Read the sentence below."
- Fallback: typed input allowed
- **Status:** VERIFIED

### Preserve usable non-voice learning fallback
- Voice chat falls back to typed input (source TYPED)
- Listening exercises can be submitted with typed answers
- **Status:** VERIFIED

## Do Not Invent Working STT/TTS

- We did NOT claim STT/TTS works without provider — code checks externalConfigured and returns fallback
- No fake audio URLs invented
- **Status:** VERIFIED (honest)

## Audio Upload Infrastructure (New)

- `src/lib/storage/audio.ts` provides `uploadAudioRecording()` with:
  - Auth, format/duration validation, secure key generation, checksum, provider tracking, processing status
  - `getAudioDownloadUrl()` tries signed URL, falls back to auth-required streaming
  - `getAudioFallbackMessage()` for UI
- **Status:** code VERIFIED, but not yet integrated into `POST /api/voice/sessions/[id]/turn` (which currently accepts transcript, not file)

## Remaining Gaps

- Voice sessions still transcript-only, no file upload wired
- No S3 bucket for audio storage
- No STT/TTS provider credentials to test
- No processing queue for long audio
- No idempotency for billing
- Teacher review of audio (not just transcripts) not implemented — requires storeAudio true + file storage

## Test Status

- Audio duration validation unit test concept — NOT VERIFIED via automated test (we tested via simple script but not full integration)
- Audio upload and processing states — NOT VERIFIED live (no file upload endpoint for audio yet)
- Staging/prod separation for audio — same as storage provider (local vs s3)

## Recommendation

- Wire `uploadAudioRecording` into voice turn endpoint when storeAudio is true
- Add file attachment model for speaking submissions (SpeakingSubmission currently no file)
- Add @aws-sdk for S3 audio storage
- Add idempotency key to STT/TTS requests
