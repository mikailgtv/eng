# Phase 7 report — English Tutor

Phase 7 adds an English practice tutor on top of the existing LMS. It does not replace the teacher, and it does not write exams, attendance, grades, or lesson progress. Phase 8 was not started.

The app is running at http://localhost:3000.

## 1. AI provider abstraction

`src/lib/ai/curriculum-provider.ts` is the course-grounded tutor. Vocabulary, grammar, quiz, and mistake review always use stored lessons, vocabulary, grammar, and real practice misses.

`src/lib/ai/http-provider.ts` is an optional OpenAI-compatible client. It is used only for open conversation, lesson help, and free practice, and only when `AI_API_KEY` is set in the server environment. This workspace has no provider credential, so those modes also use the curriculum tutor. The key is never sent to the browser and is not stored in `ai_settings`.

## 2. AI modes

Conversation, Vocabulary, Grammar, Lesson help, Mistake review, Quiz me, and Free practice. Each mode has its own opening and follow-up. A mode can be turned off in settings.

## 3. AI Tutor UI

`/student/tutor` is mobile-first. It shows the student’s level, mode buttons, a conversation thread, suggested prompts, translation hints, difficulty, New conversation, and End and summarize. While a reply is generated the thread shows “Thinking...” and then reveals the reply in chunks. The rest of the page stays usable.

## 4. Context engine

`buildLearningContext` runs on the server for the signed-in student. It includes first name, level, course, current module and lesson, a short lesson excerpt, up to eight vocabulary items, grammar titles, and up to three recent practice-miss topics. It does not include passwords, tokens, employee codes, email, teacher notes, or the full history.

## 5. Conversation storage

`ai_sessions` and `ai_messages` store the practice. System prompts are not saved as student-visible messages. Students can open `/student/tutor/history`. Ending a session stores a learning summary, not a grade.

## 6. Vocabulary practice

The tutor asks for words from the current lesson. It accepts the stored translation. If the course has no vocabulary rows, it says so and does not invent advanced words.

## 7. Grammar practice

The tutor uses the grammar concept stored on the current lesson. For “to be” it asks short completions such as “I ___ …”. A wrong answer gets one short correction, then the next item.

## 8. AI Quiz mode

Quiz me asks five items from stored vocabulary or a beginner pattern. Every quiz is labeled “AI Practice — not an exam.” Answers are not written to assessment attempts.

## 9. Mistake review

If the student has incorrect practice attempts, the tutor names that topic and gives a short exercise. If none are stored, it says so. It does not invent a weakness.

## 10. Recommendation system

A recommendation is saved only when there is a real practice miss or an unfinished current lesson. Example: “Review [lesson title].” It is a next step, not a ranking.

## 11. Usage controls

Requests require a student session. Messages are limited to 500 characters by default. Replies are capped. A daily request limit defaults to 40 and is enforced from `ai_usage`. Sessions stop at 80 messages. Provider calls time out after 20 seconds. Failures return “English Tutor is temporarily unavailable” and do not expose provider errors.

Admin usage at `/admin/ai` shows session count, message count, active users in 7 days, usage by day, usage by group, and an estimated token count from character length. That estimate is not a provider invoice. Students are not ranked by usage.

## 12. Privacy and security

The client cannot set student id or level. Extra fields are rejected. Student A cannot read Student B’s session (404). Teachers and admins cannot read conversation messages (403). Teacher review lists practice prompts, not chat transcripts, and shows only the student’s first name. Audit logs record setting changes and publishes, not message text.

## 13. Teacher controls

`/teacher/ai` lets an assigned teacher enable or disable the tutor, conversation, translation hints, and the Easy default for their groups. They cannot change the organization limit or provider credential. They can approve, reject, or, after a confirmation, publish an approved item into a lesson as a non-required practice activity. Nothing is published automatically.

## 14. Admin controls

`/admin/ai` can enable or disable the tutor globally, set the daily limit, the reply cap, and translation availability. It cannot view or edit the provider credential.

## 15. Database changes

New tables: `ai_sessions`, `ai_messages`, `ai_usage`, `ai_feedback`, `ai_settings`, `ai_generated_content`, `ai_recommendations`. Indexes cover student, session, status, and created time. `npx prisma db push` did not use `--accept-data-loss`.

## 16. APIs created

- `POST/GET /api/ai/sessions`
- `GET /api/ai/sessions/[id]`
- `POST /api/ai/sessions/[id]/messages` (server-sent events)
- `POST /api/ai/sessions/[id]/end`
- `POST /api/ai/feedback`
- `POST /api/ai/settings`
- `GET/POST /api/ai/review`
- `GET /api/admin/ai/usage`

All of these check the session on the server.

## 17. Testing performed

`npx tsc --noEmit` passed.

`npx tsx scripts/testing/verify-phase7.ts`: **20 passed, 0 failed**. Covered correction, Pre-A1 opening, login, tutor page, no credential in HTML, rejected client level and student id, server-owned session, streamed correction, empty message, cross-student 404, teacher 403, quiz label, student blocked from usage, admin aggregate, and daily limit.

Server logs for those routes were 200, 201, 403, 404, 422, or 429. No 500s.

## 18. Known limitations

- No external model is configured in this environment. Open conversation uses the curriculum tutor until `AI_API_KEY` is set on the server.
- The tutor does not listen to speech and does not score pronunciation. A stored phonetic hint can be shown; that is not voice analysis.
- Translation hints cover the tutor’s own beginner prompts and stored vocabulary glosses. They are not a general translator.
- Reply text is generated, saved, then revealed in chunks. A remote model, when configured, is not token-streamed.
- Daily limits reset at UTC midnight and the in-request counter is the database count.
- Published AI practice becomes a normal practice activity only after a teacher confirms. It is still not an exam.
- Feedback does not affect grades.

## 19. Recommended Phase 8

Do not treat this as started.

1. Connect a real speech checker before any pronunciation score.
2. Token-level streaming from the external provider when one is configured.
3. Teacher-reviewed question bank import, still never automatic exam generation.
4. A shared rate-limit store if the app runs on more than one server.
5. Optional organization permission if teachers should ever see conversations. Keep the default private.
