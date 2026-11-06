# Phase 4 Report — Assessment & Examination System

**Project:** EnglishBridge LMS — organizational English training platform
**Phase:** 4 — quizzes, exams, question bank, timed sessions, automatic grading, results
**Status:** Complete. Phase 1–3 systems were extended, not rebuilt. Phase 5 was not started.

Practice, quiz and exam stay separate. Practice still lives in the Phase 3 activity engine. Quiz and exam scores are never written into practice records, and practice scores are never shown as exam results.

---

## 1. Features implemented

**Student**
- My Exams: open quizzes, upcoming scheduled exams, and a full attempt history (assessment, date, score, pass/fail, attempt number).
- Start screen: title, description, question count, duration, passing score, attempts used. Starting requires a confirmation: “Once you start, the exam timer will begin.”
- Exam room: one question at a time, numbered navigator (answered vs unanswered), previous/next, sticky countdown, progressive save with a visible “Saved” / “Not saved” state.
- Pre-submit review: answered x/y, unanswered count, “Are you sure?”. After submit the attempt is locked.
- Result page: score, percentage, ✓ Passed or ✗ Not Passed (icon and text), time used, answered/correct/incorrect, skill breakdown, “Needs review” grouping, and a question review when the assessment allows it.
- Dashboard cards: upcoming exams, open assessments, recent results, quiz progress. Empty state when nothing is scheduled. No invented numbers.

**Teacher / admin**
- Assessment builder: create quiz or exam, set title, description, course, duration, passing score, attempt limit, schedule, randomization, result visibility, navigation, and status (Draft / Scheduled / Open / Closed / Archived).
- Question picker: search the bank (never loads it all), add, reorder, set points per question, save.
- Question bank: search, filter by type / skill / difficulty / level / lesson / status, pagination, create, edit, archive (soft — past attempts stay intact).
- Results table: student, group, assessment, score, result, date, with filters and pagination. Opening a row shows the full review.
- Group summary (students, completed, average, passed, not passed) and skill percentages. No individual ranking and no leaderboard.

**Safety behavior**
- Refresh resumes the same attempt and the same server deadline.
- A second start while one is in progress resumes; a unique constraint stops two sittings from being created at once.
- Time expiry finalizes the attempt from saved answers (status EXPIRED). Closing or archiving an assessment does the same for every in-progress sitting.
- Double submit is rejected. Answers cannot be changed after submit.

---

## 2. Database changes

Six new models in `prisma/schema.prisma` (22 models total). Existing Phase 1–3 tables were not rebuilt.

| Table | Role |
|---|---|
| `assessments` | QUIZ or EXAM. Scope via course, level and/or module. Duration, passing score, max attempts, shuffle flags, show-results flags, status, `startAt`/`endAt`, author. |
| `questions` | Reusable bank item. Type, text, explanation, difficulty (EASY/MEDIUM/HARD — content tag only), points, skill, links to level/lesson/module/grammar/vocabulary, JSON configuration, DRAFT/PUBLISHED/ARCHIVED. |
| `question_options` | Choice text, order, `isCorrect`. Server-only. |
| `assessment_questions` | Explicit selection: order and points for this assessment. Unique `(assessmentId, questionId)`. |
| `assessment_attempts` | One sitting. Server `startedAt` and `deadlineAt`, attempt number, status, score, percentage, passed, auto-submitted flag, frozen question/option snapshot. Unique `(assessmentId, studentId, attemptNumber)`. |
| `assessment_answers` | One row per attempt + question. Raw answer saved while the exam runs; graded at submit. Unique `(attemptId, questionId)`. |

Indexes cover student, assessment, status, submitted time, and bank filters (type, skill, level, lesson). Attempts store student and question ids only — no copied names or group labels.

`NOT_STARTED` is the absence of a row, not a stored status. Stored statuses are `IN_PROGRESS`, `SUBMITTED` is not used as a resting state (auto-graded attempts finish as `GRADED` or `EXPIRED`).

---

## 3. New APIs

All mutations check the session and the request origin. The student id is never taken from the body.

| Endpoint | Who | What |
|---|---|---|
| `POST /api/assessments` | teacher, admin | Create a quiz or exam |
| `GET /api/assessments` | teacher, admin | List the teacher can manage |
| `GET /api/assessments/[id]` | teacher, admin | Builder payload (includes answers) |
| `PATCH /api/assessments/[id]` | teacher, admin | Settings and status. Closing finalizes open attempts |
| `PUT /api/assessments/[id]/questions` | teacher, admin | Replace the ordered question list |
| `POST /api/assessments/[id]/start` | student | Start or resume. Server clock, attempt limit, open window |
| `GET /api/assessments/[id]/availability` | student | Open/closed, attempts left, active attempt |
| `GET /api/assessments/[id]/attempts/[attemptId]` | owning student | Sanitized questions, saved answers, server deadline |
| `POST .../answer` | owning student | Save one answer (idempotent per question) |
| `POST .../submit` | owning student | Grade and lock. Late submit is finalized by the server |
| `GET /api/questions` | teacher, admin | Paginated bank search |
| `POST /api/questions` | teacher, admin | Create, with the same schemas used for grading |
| `PATCH /api/questions/[id]` | teacher, admin | Edit |
| `DELETE /api/questions/[id]` | teacher, admin | Archive (not a hard delete) |
| `GET /api/results` | teacher, admin | Filtered, paginated results. Teachers are limited to their groups |
| `GET /api/assessments/[id]/analytics` | teacher, admin | Group totals and skill percentages |

Student result pages call the query layer directly with the same ownership checks.

---

## 4. Assessment types

| Type | Meaning | Seeded example |
|---|---|---|
| PRACTICE | Phase 3 lesson activities. Unlimited, low stakes, separate tables. Not an assessment. | 65 activities |
| QUIZ | Short assessment tied to a course (and, through question tags, to lessons). Multiple attempts when configured. | Quiz 1 Greetings (8q, 10 min, 70%, 3 attempts, OPEN). Quiz 2 Alphabet & Numbers (9q). Quiz 3 Verb to be (9q). |
| EXAM | Formal assessment. Stricter attempt limit and a schedule. | English Starter — Final Assessment (25q, 30 min, 70%, 1 attempt, SCHEDULED 5–12 Oct 2026 UTC). |

Status flow: DRAFT → SCHEDULED or OPEN → CLOSED → ARCHIVED. An assessment cannot be opened with zero questions. Students can start only when status is OPEN and server time is inside `startAt`/`endAt`.

Group reach is through the course assignment: a student sees an assessment only if their group is assigned the assessment’s published course. A direct assessment-to-group table is not in this phase (see limitations).

---

## 5. Question types

| Type | Grading | Student UI |
|---|---|---|
| MULTIPLE_CHOICE | Automatic, one correct option | Radio rows, ≥44px |
| TRUE_FALSE | Automatic | True / False buttons |
| FILL_BLANK | Automatic, case/space/punctuation normalized, not fuzzy | Text input |
| MATCHING | Automatic, all pairs | Tap left, tap right, undo |
| WORD_ORDER | Automatic, exact token order | Tap to add / tap to remove |
| LISTENING | Automatic, same as multiple choice | Real audio player + options. Transcript stays on the server |
| READING, WRITING, SPEAKING | Not graded. Stored, flagged “needs teacher review” | Notice only — no fake score |

Difficulty (Easy / Medium / Hard) is a content label. It is never shown as a judgment of the student.

Tags used for later analysis: skill (Vocabulary, Grammar, Reading, Listening, Speaking, Writing), lesson, module, level. Grammar-concept and vocabulary foreign keys exist on the question row for future tagging; the authoring form currently sets lesson and skill (level follows the lesson).

---

## 6. Exam flow

1. Student opens My Exams. The server lists only assessments their group can see.
2. Overview shows the rules. Start is blocked with a plain reason when the exam is scheduled, closed, empty, or out of attempts. An in-progress sitting offers Resume, not a new timer.
3. Confirmation dialog, then `POST /start`. The server writes `startedAt = now()` and `deadlineAt = startedAt + duration`. The browser clock is not an input.
4. The attempt snapshot freezes question order, points, option order, and shuffled matching/word-order layouts. Later edits to the bank do not reshuffle a sitting that already started.
5. Each answer is saved to `assessment_answers` (upsert on attempt + question). A failed save stays on screen and retries. Refresh reloads the same answers and the same deadline.
6. Submit shows answered / unanswered, then asks for confirmation. The server grades inside a transaction. A second submit gets 409.
7. If the deadline plus a 45-second grace window has passed, the server — not the student — finalizes the attempt as EXPIRED, using whatever was already saved. Closing the assessment does the same for every open sitting.

---

## 7. Grading logic

Supported types are graded on the server from the bank configuration and `question_options.isCorrect`. The client never sends a score, a percentage, or a passed flag.

- Each question is all-or-nothing: full points or zero.
- Unanswered auto-graded questions score zero.
- Percentage = earned auto-graded points / auto-graded points, rounded to an integer.
- Passed when percentage ≥ the assessment’s `passingScore`.
- Manual types (reading/writing/speaking) are excluded from the automatic total and shown as awaiting review. None are seeded.
- Fill-in answers use the same normalizer as practice (`am` = `AM`), not fuzzy matching.
- The result the student sees is the stored row, not a number computed in the browser.

---

## 8. Security implementation

Enforced in the API and query layer, not by hiding buttons.

- Anonymous → 401. Teacher cannot start a student attempt → 403. Student cannot open the bank, create assessments, or read results APIs → 403.
- Another student’s attempt → 404 (not 403, so ids are not confirmed).
- A student only sees assessments whose course is published and assigned to their group.
- Teachers only see results for students in groups they teach. Admins see all.
- Correct options, accepted answers, matching pairs, word order and listening transcripts are stripped before any student payload. Verified in the API JSON and in the exam-room HTML.
- Answer bodies are strict zod objects. Extra fields such as `isCorrect` or `score` → 422.
- Cross-origin mutations → 403.
- Deadline, attempt count, passing score and student id are server state. Refreshing cannot extend the timer (deadline is a column, checked on every save and on submit).
- Submission uses a conditional update (`IN_PROGRESS` → terminal). Two submits cannot both win.
- Start uses a unique `(assessment, student, attemptNumber)` constraint so a double-click cannot create two active sittings.
- Question archive is a status change. Past attempt snapshots keep their question ids.

---

## 9. Teacher result functionality

- `/teacher/exams` — drafts, scheduled, active, closed, with type, course, question count, attempt count.
- `/teacher/exams/[id]` — builder plus a results overview: per group, students / completed / average / passed / not passed, and skill percentages. Best submitted attempt per student is used for the pass count so retakes are not double-counted. Students are not ranked.
- `/teacher/results` — filter by group, assessment, passed / not passed, and date. Paginated.
- `/teacher/results/[attemptId]` — full review for a student in the teacher’s groups, including the student name and group. Staff always see the review, even if the student-facing setting hides answers.

---

## 10. Student result functionality

- History on My Exams and on the dashboard, each row linking to that attempt.
- Result page shows the stored score only when `showResults` is true. Otherwise the student sees “Submitted — your teacher will share the results.”
- When `showCorrectAnswers` is false, the review (correct text and explanation) is omitted even if the score is shown.
- Mistake groups (“Verb to be · 3 incorrect”) are a study hint, not a label about ability. Skill bars are described the same way.
- A student cannot open another student’s result. Verified: Lena reading James’s attempt returns 404.

---

## 11. Testing performed

`bash scripts/testing/verify-phase4.sh` — **71/71**.

Covered: teacher create/edit/archive question; reject a choice question with no correct option; reject zero points; student blocked from bank and assessment APIs; create assessment; reject opening with no questions; add questions and open; scheduled final exam cannot be started; start, sanitized payload, progressive save, duplicate-answer uniqueness, refresh keeps deadline and answers, deadline equals start + duration, server grading of a perfect paper, double submit 409, saves after submit 409, result page and history, attempt cap (4th start → 422, all 3 rows kept), partial score and pass/fail math, cross-student 404, expiry auto-finalize, saves after expiry rejected, forged answer fields 422, bad shape 422, cross-origin 403, anonymous 401, teacher start 403, teacher result list and filters, group analytics consistency, skill analytics, teacher and student pages, dashboard upcoming exam, no answer leakage in HTML.

Regression after Phase 4, run on a fresh demo reset:

| Suite | Result |
|---|---|
| Phase 3 practice engine | 58/58 |
| Phase 2 completion / isolation | 21/21 |
| Phase 2 hidden-content | 9/9 |
| Phase 2 route sweep | 30/30 |
| Phase 4 | 71/71 |
| **Total** | **189/189** |

Production build is clean (no type errors, no dynamic-render crashes). The running server log stayed empty of application errors across the suite. Demo attempt rows were wiped afterward: 57 published bank questions, 4 assessments, 0 student attempts.

---

## 12. Known limitations

1. **Group targeting is indirect.** An assessment is visible to every group assigned its course. There is no “Shift A only” flag yet.
2. **Reading, writing and speaking** can be stored and are marked as needing a teacher. The exam room does not collect a long answer, and there is no grading screen. They are not in the seed.
3. **No random pools.** `randomizeQuestions` shuffles the teacher’s explicit list. It does not draw N questions from a larger pool.
4. **Question-picker search returns the first 10 matches.** The bank page itself is paginated. Teachers narrow the picker with search text and type.
5. **Grammar and vocabulary tags** exist on the question row but are not pickers in the form yet. Lesson and skill are.
6. **All-or-nothing points.** No partial credit on matching or word order.
7. **Timezone is UTC**, stored and displayed as UTC, and the schedule inputs are labeled and parsed as UTC (not the browser zone). A configurable organization timezone is not a settings screen yet.
8. **Closing an exam finalizes open sittings** from saved answers. It does not let a student finish the remaining time after the teacher has closed it.
9. **Inherited Next.js 14 behavior:** some unauthorized pages render a not-found UI inside an HTTP 200 shell. APIs return real 401/403/404. Unchanged from Phases 1–3.
10. **SQLite** is the demo database. The unique constraints cover the races we tested; a busier deployment should move to a server database before concurrent exam load.

---

## 13. Recommended Phase 5

Not started.

1. Teacher grading queue for writing and speaking, with the score written by the teacher — never by the student.
2. Direct assessment-to-group assignment, so one exam can be opened for a single shift.
3. Question pools (“draw 10 from this lesson”) on top of the existing snapshot.
4. Lesson-activity authoring UI, reusing the Phase 3 schemas (still no AI-generated questions).
5. Organization timezone setting, with UTC remaining the stored clock.

Still out of scope until a later decision: certificates, AI grading, speech scoring, leaderboards, gamification, automatic CEFR placement.
