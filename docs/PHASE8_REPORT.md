# Phase 8 report — Speaking and Listening Lab

Phase 8 adds speaking and listening practice to the existing EnglishBridge LMS. Phases 1–7 were not rebuilt. Phase 9 was not started. Official exams, attendance, grades, and lesson progress are not written by this feature.

The app is running at http://localhost:3000.

## 1. Completed features

Students can open Speaking and Listening from the student navigation, and from a published lesson (`Practice speaking` / `Practice listening`).

Speaking supports greetings, self-introduction, job, workplace, numbers, time, days, food, family, directions, asking for help, and basic firefighter and safety words. The flow is topic, short prompt, microphone or typed answer, recognized text, then a check of whether that text matches the prompt. Pre-A1 and A1 stay on those short prompts. The page does not introduce advanced vocabulary.

Modes: Speak, Repeat a word, Shadow (transcript hidden until Show transcript), and Talk with tutor. Voice chat reuses the Phase 7 tutor (`startTutorSession` / `sendTutorMessage`). It does not start a second tutor.

Microphone states are Ready, Listening, Processing, Finished, and Error. Buttons are Start speaking, Hear, Try again, and Show help. If the browser has no speech recognition, the page says: “Voice recognition is unavailable. You can type your answer instead.”

Listening uses a published text script. Play, Replay, and Slow use the browser voice. The transcript and translation stay hidden until the student asks. Questions are multiple choice or short type-in. The server grades the answer key. The result says it is not an exam.

Students can see their own speaking history and delete the recognized text. Assigned speaking and listening tasks appear under My assignments, labeled as practice, not exams.

Teachers can assign speaking practice (completion, teacher review, or AI feedback only) and a published listening exercise. They see counts for their groups. Private transcripts stay hidden unless an administrator turns teacher transcript visibility on. That setting is off by default.

Administrators can open Speaking & Listening, see usage counts, set daily minutes, and enable or disable the feature. There is no ranking.

## 2. Database changes

`npx prisma db push` added these tables. No `--accept-data-loss` was used.

- `voice_sessions`, `voice_messages`, `speech_attempts`
- `listening_exercises`, `listening_attempts`
- `audio_assets` (schema only; no invented file is stored)
- `tts_requests`, `speech_recognition_requests`
- `speaking_assignments`, `speaking_submissions`
- `listening_assignments`
- `voice_preferences`, `voice_consents`, `voice_settings`

Each row is owned by a student, teacher, or group foreign key, with timestamps and indexes. Users, lessons, and learning groups were extended with relations. Existing LMS tables were not duplicated.

One text-only listening script is stored: “Hello at the station.” It has no audio file and no audio URL.

## 3. Provider integration

`SpeechToTextProvider` and `TextToSpeechProvider` are represented by browser speech and an optional external HTTP provider.

- Browser speech recognition and `speechSynthesis` run on the device. Speeds are 0.75x, 1.0x, and 1.25x. Beginners default to 0.75x.
- If speech synthesis is missing, the page says: “Audio is unavailable. Read the sentence below.”
- External STT and TTS are used only when `STT_API_KEY` / `STT_BASE_URL` or `TTS_API_KEY` / `TTS_BASE_URL` are set in the server environment. This workspace has none. The keys are not in the UI, the HTML, or the database.
- The external transcribe call forwards the audio payload to the provider and does not store it. If the provider is not configured, the API returns the typing fallback. It does not invent a transcript.
- Server TTS does not invent an audio URL. If the external provider does not return audio, the student reads the sentence.

## 4. What the feedback does and does not claim

A turn is “understood” only when the normalized transcript matches the target sentence. The API always returns `pronunciationScore: null`. There is no accent score, phoneme score, or mouth or tongue advice. Provider confidence is stored only if the browser or external provider actually returns a number.

Recurring transcript misses can create an AI recommendation after three similar misses. That recommendation is practice guidance. It does not change a grade, an exam, or the curriculum.

## 5. Privacy, permissions, and audit

- Raw audio is not stored. `storeAudio` defaults to false, and the settings API rejects turning it on.
- Students are told that the recognized text is saved and the recording is not.
- Consent is required before a speech-to-text turn. Typing still works.
- A student can read and delete only their own session. Another student gets 404. A teacher gets 403 on the private session API.
- Teachers can assign only groups they already manage. Students cannot create assignments or change official results.
- Voice usage is admin-only. The usage view has counts, not best or worst lists.
- Audit actions cover setting changes, assignment create, and transcript delete. Passwords and provider keys are not written to the audit log.
- Assignment create sends one group notification. There is no reminder loop.

## 6. Security checks

`scripts/testing/verify-phase8.ts` against http://127.0.0.1:3000: **30 passed, 0 failed**.

Covered: transcript match, student login, speaking and listening pages, no provider key in HTML, client `studentId` / level / score rejected (422), session created from the server identity, typed match, no pronunciation score, mismatch not understood, cross-student 404, teacher session 403, missing STT offers typing, server-side listening grade, not-an-exam label, student cannot assign, teacher can assign, raw-audio setting rejected, student usage 403, admin usage 200, student can delete their transcript.

`npx tsc --noEmit` passed. Server logs for these checks had no 500 responses.

## 7. Limitations and known issues

- No external speech credential is configured, so recognition and playback depend on the student’s browser. Typing and the written sentence are the fallback.
- Word-by-word playback is not offered. The browser speaks the sentence. Isolated word timing is not guaranteed.
- There is no scheduled “due tomorrow” or “continue practice” job. A new assignment notifies the group once.
- Teachers do not see private transcripts unless an administrator explicitly enables that. The teacher page shows activity counts.
- AI feedback on a speaking assignment is labeled feedback only. It is not an official grade, and there is no setting that turns it into one.
- Phoneme scoring, accent classification, automatic oral-exam grading, live classroom monitoring, and automatic publishing were not added.
- The verifier created two demo speaking assignments titled “Say hello” in the development database. They are real rows from the test, not placeholder UI numbers.

Phase 9 was not started.
