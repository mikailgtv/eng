# Phase 3 Report — Interactive Practice Engine

**Project:** EnglishBridge LMS — organizational English training platform
**Phase:** 3 of the agreed roadmap — turning the lesson system into a real
interactive English learning/practice engine.
**Core loop delivered:** LEARN → PRACTICE → FEEDBACK → REVIEW → PROGRESS
**Status:** ✅ Complete. All suites green (118 automated checks). No Phase 4
work was started, per instructions.

---

## 1. Features delivered

**Practice inside every lesson**
- Lessons now contain a full interactive practice section rendered from the
  activity engine (no per-page hardcoding). Lessons without seeded activities
  gracefully fall back to the Phase 2 self-check blocks, so nothing is empty
  or broken.
- Immediate feedback on every submission: ✓/✗ icon **and** text (correctness
  never relies on color alone), the correct answer is always named after
  submitting ("Not quite. The correct answer is: …"), with beginner-friendly
  explanations ("We use 'am' with 'I.'") — no grammar jargon anywhere.
- Practice summary after the last activity: **Correct x / y**, **Practice
  Score %** (explicitly labelled as practice, *not* an exam), **Needs review**
  count, and three actions: **Review mistakes**, **Try again** (re-tries only
  the incorrect ones), **Continue lesson**.
- Review Mistakes panel: each missed item shows the question, the student's
  answer, the correct answer and a short explanation.

**Dashboard & progress (all real data)**
- Student dashboard upgraded: **Practice Today** (real attempts today +
  accuracy), **Vocabulary Review** ("N words ready" + *Review now*), **Recent
  Practice** (the student's actual latest attempts, linking into the lesson),
  Continue Learning, Course Progress, Current Level, streak.
- Vocabulary Review page (`/student/review`): flashcard session over the words
  currently due, with an honest empty state ("Nothing to review right now").
- My Progress: activities practiced, overall accuracy, correct answers,
  listening completed, grammar concepts practiced, words practiced, plus the
  Learning/In-review/Mastered vocabulary breakdown. Every displayed number is
  computed from real DB records — zeros and empty states are shown honestly.

**Vocabulary review flow**
- Every vocabulary-linked exercise and flashcard mark updates the student's
  per-word state. Self-assessment schedules the next review as **data**:
  *Known* → due in 3 days, *Review again* → due in 1 day, *Mastered* → due in
  7 days. Three consecutive "Known" marks with no mistakes → Mastered.
  "Known" is never permanent mastery. The wording avoids any "scientific
  spaced repetition" claim.

**Audio**
- 8 real MP3 audio files were generated for the listening activities
  (greetings, goodbye, name, numbers, colors, family, days, questions) — no
  fake URLs anywhere. A reusable accessible audio player (play/pause, seek,
  replay, volume, duration) is shared by all listening activities; no
  autoplay; preload=metadata only. If audio is missing the UI says
  "Audio is not available yet." and offers a "show text instead" fallback —
  never a broken player.
- Speaking practice: prompt + optional microphone recording (explicit
  permission, MediaRecorder, recording kept on-device) + "I practiced this"
  self-report. It never claims correct/incorrect and no AI pronunciation
  scoring exists (forbidden, and deliberately not built).

---

## 2. New database entities

`prisma/schema.prisma` — now 16 models. Added in Phase 3:

| Entity | Purpose / key fields |
|---|---|
| `Activity` | lessonId, nullable grammarId (SetNull), type (one of 10), title, instructions, order, points (default 1), required (default false), status (DRAFT/PUBLISHED/ARCHIVED), configuration (JSON string, zod-validated server-side). Indexes: `[lessonId, order, status]`, `type`, `grammarId`. |
| `ActivityVocabulary` | activity ↔ vocabulary link (`unique [activityId, vocabularyId]`) — powers vocabulary performance tracking. |
| `ActivityAttempt` | **append-only history**: studentId, activityId, answer (JSON), isCorrect (Boolean?, null = self-assessed), score, startedAt, submittedAt, attemptNumber (server-computed count+1). Never updated or deleted on retry. |
| `VocabularyReview` | unique `[studentId, vocabularyId]`; status NEW/LEARNING/REVIEW/MASTERED, correctCount, incorrectCount, lastReviewedAt, **dueAt** (the schedule, stored as data). Indexes: `[studentId, dueAt]`, `status`. |

Extended: `Course.completionRule` (VIEW_ONLY \| VIEW_AND_REQUIRED_ACTIVITIES \|
MIN_PRACTICE_SCORE \| TEACHER_APPROVAL — Phase 3 uses the default
VIEW_AND_REQUIRED_ACTIVITIES) + `Course.minPracticeScore`;
`Vocabulary.partOfSpeech`, `Vocabulary.levelCode` (+index); relations
`Lesson.activities`, `GrammarContent.activities`, `Vocabulary.activities`,
`Vocabulary.reviews`. No student data is duplicated into attempts — everything
references users/activities by FK.

---

## 3. New APIs

All endpoints derive the student from the **session** — no endpoint trusts a
client-provided student id. Mutations validate Same-Origin.

| Endpoint | Method | Behavior |
|---|---|---|
| `/api/activities/[id]/attempts` | POST | Records the session student's attempt. Re-authorizes the activity (published content in a course assigned to the student's group), validates the answer against the type schema (strict — forged fields → 422), computes correctness **server-side**, appends a new attempt row, returns sanitized feedback + attemptNumber. |
| `/api/lessons/[id]/practice` | GET | Sanitized activities (answers stripped) + the student's latest-attempt state + Practice Score + requiredRemaining/requiredTotal. 404 unless the lesson is visible to the session user. |
| `/api/practice/mistakes` | GET | Latest incorrect attempt per activity (optionally `?lessonId=`), with prompt/student answer/correct answer/explanation. Session-scoped. |
| `/api/practice/stats` | GET | Real totals: attempts, scored attempts, accuracy, distinct activities, listening completed, grammar concepts, vocabulary items, today's numbers + vocabulary review counts. |
| `/api/vocabulary/review` | GET | Vocabulary items currently **due** for the session student (`dueAt <= now`, status ≠ MASTERED). |
| `/api/vocabulary/review` | POST | `{vocabularyId, response: KNOWN\|NEED_REVIEW}` → upserts the **session** student's review row and schedules the next due date. The vocabulary item must be reachable through the student's assigned courses (random ids → 404). |
| `/api/lessons/[id]/complete` | POST | *(extended)* now enforces the course completion rule server-side — 422 with "Practice first: N required exercises left" when required activities are unattempted; idempotent afterwards. |

Unauthenticated → 401; teacher → 403; unknown/foreign resources → 404;
malformed payloads → 422. Verified by the test suites.

---

## 4. Activity types implemented

All 10 types from the brief are implemented end-to-end (schema validation →
sanitized rendering → server-side checking → attempt recording):

| Type | Student experience | Scoring |
|---|---|---|
| MULTIPLE_CHOICE | question + shuffled options; selection kept on wrong answer, locked after correct | ✓ |
| TRUE_FALSE | statement + True/False buttons | ✓ |
| FILL_BLANK | sentence with `___`; typed input (normalized: case/spacing/punctuation-insensitive — "AM" = "am", **not** fuzzy) or option chips | ✓ |
| MATCHING | tap left, tap right; pair badges; undo by re-tap; "N pairs left" | ✓ |
| WORD_ORDER | tap-to-add / tap-to-remove tokens (no drag; one-handed mobile); checks only when all tokens used | ✓ |
| VOCABULARY_RECOGNITION | word → meaning multiple choice; results feed the per-word review state | ✓ |
| LISTEN_AND_CHOOSE | audio player + question + options | ✓ |
| LISTEN_AND_TYPE | audio + typing what you hear (normalized comparison); transcript never sent to the client | ✓ |
| SPEAKING_PROMPT | prompt + optional recording; "I practiced this" self-report; never claims correctness | self-assessed |
| FLASHCARD | tap-to-flip word → translation/phonetic/example; Known / Review-again; session summary | self-assessed |

Extensibility: a new type = one entry in the registry + one zod schema + one
renderer branch. No per-type tables.

**Sanitization guarantees** (verified in tests): correct options/answers,
accepted answers, word order and LISTEN_AND_TYPE transcripts are stripped
before render; options, blank-options, matching columns and word tokens are
shuffled per request (Fisher–Yates).

---

## 5. Practice flow

1. Student opens a lesson → server renders explanation, vocabulary, grammar,
   examples, listening and the **practice section** from real `activities`
   rows (sanitized).
2. The student answers → `POST /api/activities/[id]/attempts` → server
   validates + grades → immediate feedback banner (icon + text + correct
   answer + explanation) → `router.refresh()` keeps server state in sync;
   the component hydrates from the server state so a **mid-activity refresh
   preserves everything** (verified).
3. A failed submission **keeps the student's answer** for correction; a failed
   *network* request shows an error and the answer stays (retry safe).
4. After the last activity: Practice Summary (Correct x/y, Practice Score %,
   Needs review n) + Review Mistakes / Try again / Continue lesson.
5. Practice Score = % of the lesson's scored activities answered correctly on
   the latest attempt; self-assessed types (speaking, flashcards) count as
   done but are excluded from the percentage. No score exists before the first
   attempt (shown as "—", not a fake 0%).

**Lesson completion** (rule-aware, server-enforced): default rule = view the
lesson **and** attempt every required activity (correctness not required —
we don't want to lock beginners out). Attempting to complete early returns
422 with a plain-language count of what's left; the button mirrors the same
state. VIEW_ONLY / not-yet-settable rules pass through — nobody is blocked.

---

## 6. Vocabulary review flow

1. Vocabulary-linked exercises (MATCHING / VOCABULARY_RECOGNITION /
   FLASHCARD) and flashcard marks write to `vocabulary_review` for the
   **session** student only.
2. Statuses: NEW → LEARNING → REVIEW → MASTERED with visible counts.
3. Scheduling is data: NEED_REVIEW → due +1 day, KNOWN → +3 days,
   MASTERED → +7 days; 3 consecutive KNOWN with no mistakes → MASTERED.
4. The Review page and the dashboard "N words ready" both read
   `dueAt <= now` — the number is always real.
5. Review session = flashcards over due words; each mark reschedules the word
   immediately. "Known" ≠ permanent mastery; MASTERED words still age and can
   resurface via future teacher tooling.

---

## 7. Lesson completion logic

- `Course.completionRule` (data-driven): `VIEW_ONLY`,
  `VIEW_AND_REQUIRED_ACTIVITIES` (default, active in Phase 3),
  `MIN_PRACTICE_SCORE`, `TEACHER_APPROVAL` (recognized, pass-through until a
  later phase sets them — no one gets stuck).
- `checkLessonCompletion()` (server) is the single source of truth; the
  completion API rejects early completion with 422 and a helpful message; the
  lesson page shows exactly what remains ("2 required exercises left (3
  total)").
- Verified: gate blocks before practice (422), passes after required
  attempts (200), duplicate completion is idempotent (200, one row), and the
  Phase 2 regression suite confirms completion semantics didn't break
  progress/streak/recommendation flows.

---

## 8. Security checks

All verified by automated suites (`verify-phase3.sh` 58 checks + Phase 1/2
regressions 60 checks):

- **Session identity everywhere:** attempts, practice state, mistakes, stats
  and vocabulary review all derive the student from the session cookie.
  Forged `studentId` in the body is rejected (strict schema → 422). Lena and
  James have fully separated rows (checked at DB level).
- **Authorization server-side:** an attempt on an activity in a course not
  assigned to the student's group → 404; unpublished/draft content → 404 via
  API; pages render zero content bytes for unauthorized viewers (Next.js
  streaming renders the not-found UI with a 200 shell — the established,
  accepted Phase 1/2 behavior; byte-level protection verified; APIs keep true
  404s).
- **Answers never leak:** sanitized configs verified in lesson HTML and API
  responses (no correctOptionId / acceptedAnswers / words / transcripts).
- **Server-side grading:** a forged `isCorrect: true` cannot pass — the
  client sends only the raw answer; correctness is computed on the server.
- **Strict payloads:** extra/unknown fields → 422 (no mass assignment).
- **CSRF:** SameSite cookies + Origin validation on every mutation
  (cross-origin attempt → 403).
- **Role gates:** anonymous → 401; teacher → 403 on practice endpoints.
- **Duplicate submissions:** append-only attempt rows with server-computed
  attempt numbers; completion API idempotent.
- **Vocabulary review injection:** a vocabularyId outside the student's
  assigned courses → 404; review rows are always keyed to the session user.
- **No secrets in logs:** audit logging unchanged from Phase 1 (never
  credentials); demo accounts remain clearly marked dev/demo.

---

## 9. Mobile testing results

Static + behavioral verification (360 px-class viewports):

- **No horizontal overflow:** every practice surface is fluid (`w-full` inside
  `max-w-3xl`/`max-w-xl` page columns), tokens and options wrap
  (`flex-wrap`), long words `break-words`, the app root has
  `overflow-x: clip`. No fixed pixel widths exist in any practice component.
- **Touch targets:** all interactive elements ≥ 44 px (min-h-10…min-h-14
  verified across 20 component sites); answer rows are full-width tap areas
  with `min-h-12`.
- **No drag anywhere:** word order = tap to add / tap to remove; matching =
  tap left then tap right with visible pair badges and an undo path — both
  one-handed friendly.
- **Keyboard-friendly blanks:** real `<input>` with the right `inputMode`,
  large font (15 px+), visible focus rings globally (`:focus-visible`),
  full keyboard operability (semantic buttons/inputs everywhere; word-order
  tokens and matching cells are real buttons with aria-pressed).
- **Screen readers:** feedback banner is `role="status"` `aria-live`;
  audio player has aria labels + an sr-only timer; correctness conveyed by
  icon + text, not color alone.
- **Motion:** `prefers-reduced-motion` globally disables transitions/
  animations; only subtle color/width transitions exist otherwise.
- **Audio:** player is lazy (`preload="metadata"`), no autoplay, and missing
  audio degrades to a clear message instead of a broken player.

---

## 10. Known issues

1. **Next.js 14 streaming quirk (inherited, accepted):** nested-page
   `notFound()` can render the not-found UI with an HTTP 200 shell. Content
   protection is byte-level (verified) and all APIs return true 404/401/403.
   Revisit only if the project upgrades past Next 14.
2. **Flashcard flip is a cross-fade, not a 3D flip** — deliberate: simpler,
   faster and safer for reduced-motion and low-end devices.
3. **Audio pronunciation is per-sentence, not per-word** — the vocabulary
   model has an audio field, but per-word clips are not generated yet (100
   words); flashcards show phonetics instead. Candidate for Phase 4 content
   tooling.
4. **MIN_PRACTICE_SCORE / TEACHER_APPROVAL completion rules are recognized
   but not settable in the UI** — they pass through view-only so no course is
   blocked. Setting them is a teacher-UI task (Phase 4 candidate).
5. **Test helper scripts** live in `scripts/testing/` and are type-checked
   with the app (they must stay type-safe); they are dev/demo utilities and
   refuse nothing in production because they only run against a local server.

No known functional bugs; server log stayed clean through 118 automated
checks plus interactive testing.

---

## 11. Recommended next phase (Phase 4 — not started, per instructions)

1. **Teacher/admin activity authoring UI** — forms that write `activities`
   through the existing zod schemas (preview via the same renderers),
   including audio upload for listening exercises.
2. **Course assignment management UI** (admin assigns courses to groups from
   the existing assignment data).
3. **Teacher practice analytics** — the data foundation is ready
   (`ActivityAttempt` links to grammar concepts and vocabulary): "the class
   struggles with Verb to be", per-student mistake lists, item difficulty.
4. **Vocabulary audio at scale** + optional word-level pronunciation models.
5. **Completion rule settings UI** (MIN_PRACTICE_SCORE / TEACHER_APPROVAL)
   once teachers can author content.

Everything else (exams, certificates, leaderboards, AI pronunciation scoring,
CEFR automation) stays out of scope by design.

---

## Appendix — verification summary

| Suite | Focus | Result |
|---|---|---|
| `scripts/testing/verify-phase3.sh` | Practice engine E2E: logins, sanitized rendering, all 10 types, server-side grading, append-only attempts, forged/malformed payloads, session isolation, audio, mistakes, completion gate (before/after/idempotent), vocabulary scheduling (+24 h due, per-student rows, foreign-id 404), dashboard/progress/review real data, fallbacks, admin preview | **58/58 PASS** |
| Phase 2 regression (updated for the Phase 3 completion rule) | Content access semantics, per-student progress isolation, dashboards, seed idempotence | **21/21 PASS** |
| Phase 2 hidden-content | byte-level leakage checks | **9/9 PASS** |
| Phase 2 sweep (routes, empty states) | 30 route/UX checks | **30/30 PASS** |
| **Total** | | **118/118 PASS** |

Seed state after verification: 65 activities across 14 lessons (all 10 types
represented, 41 activity↔vocabulary links, 20 grammar-linked), 8 real audio
files in `public/audio/`. Demo practice data was wiped after testing — the
demo student starts at zero, honestly.
