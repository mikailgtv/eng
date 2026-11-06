# Phase 5 report — Teacher Control Center

Phase 5 adds class, group, attendance, assignment, lesson-authoring, schedule, plan, note, and in-app notification tools on top of the existing LMS. Auth, roles, the course engine, practice, and assessments were not rebuilt. Phase 6 was not started.

The dev server is running at http://localhost:3000 (`npx next dev -H 0.0.0.0 -p 3000`).

## 1. Dashboard

`/teacher` is one server render (`teacherHome`), not a fan-out of browser API calls. It shows today’s classes, the in-progress class if one exists, assigned groups, student counts, active students, a descriptive “need a look” count, open assignments, upcoming exams, unfinished plans, and recent attendance, exam results, and submissions.

Empty states are real: if nothing is scheduled today, the page says so. Quick actions are only links the teacher can use (continue/start today’s class, schedule, students, create assignment, courses). Start class is omitted when no class is scheduled.

Numbers come from stored rows. There is no ranking.

## 2. Groups

`/teacher/groups` lists assigned groups with student count, course, level, current published lesson, next class, and average published-lesson completion. Open Group goes to `/teacher/groups/[id]`.

The detail page has Overview, Students, Lessons, Attendance, Assignments, Exams, Progress, Schedule, and Reports. Reports are private teacher notes for the group, not a leaderboard.

An administrator sees every active group. A teacher who is not the lead and has no `TeacherGroupAssignment` row does not.

## 3. Sessions

`ClassSession` stores group, teacher, optional course/module/lesson, scheduled start/end, server `actualStart` / `actualEnd`, and status `SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED`.

Classroom mode is `/teacher/classes/[id]`: class, group, lesson, student count, attendance fraction, Take Attendance, Open Lesson, Start Activity, Add Note, End Class. Start and end times are written by the server. A second in-progress class for the same group or teacher is rejected.

## 4. Attendance

Marks are Present, Absent, Late, or Excused. Mark all present, then change individuals. One row per student per session. Every change writes an append-only `AttendanceChange` (who, when, previous, new) and an audit log entry. Attendance is refused for students outside the group and for a cancelled class. The attendance page shows counts only.

## 5. Lesson builder

`/teacher/courses` lists courses assigned to the teacher’s groups. A draft lesson can be created inside a module. The editor adds, edits, deletes, and reorders blocks with Up/Down (no drag-and-drop). Types: Heading, Text, Vocabulary, Grammar, Example, Image, Audio, Video, Tip, Warning, Question.

Publish asks for confirmation and refuses a lesson with no valid block. Students still only receive published lessons through the existing learning pages. An empty audio URL is rejected. The editor does not invent an audio file.

## 6. Assignments

Types: Practice, Written, Vocabulary, Reading. Fields: title, description, instructions, group, optional lesson, due time, draft/published, allow-late. Students submit text only. There is no file-upload control.

Student list: title, course, lesson, due time, and status Not started / In progress / Submitted / Late / Reviewed. A second submit is rejected. A late submit is rejected unless the teacher allowed it. The teacher reads the text, writes feedback, optionally records a 0–100 score, and marks it reviewed. This is not AI grading and does not change official exam scores.

## 7. Schedule

`/teacher/classes` has Today, Week, and Month. Events are labelled Class, Assignment deadline, Quiz, or Exam — the type is text, not color alone. A teacher can schedule one class or a weekly UTC rule. The rule creates the next four occurrences and skips times that already exist. Working days are not assumed.

## 8. Teaching plan

`/teacher/plans` stores group, optional course/module/lesson, planned date, duration, notes, and status Planned / Completed / Cancelled. Ending a class marks a matching planned lesson completed and links the session, so planned and taught stay separate records.

## 9. Notifications

In-app only, per user, with a bell in the app shell. Types used: class reminder is available on the model; the app currently writes assignment, absence, exam/quiz submission, and assignment-reviewed notices. Students do not receive teacher notes. There is no email or push.

## 10. Permissions

Teachers manage groups where they are the lead (`LearningGroup.teacherId`) or have a `TeacherGroupAssignment`. Admins see and write every group. Changing the lead teacher on the existing admin group form now syncs the assignment row. Teachers cannot change roles, passwords, admin settings, another teacher’s private notes, official exam scores, or progress. Students cannot call teaching write APIs.

## 11. Database

New tables: `teacher_group_assignments`, `recurrence_rules`, `class_sessions`, `attendance_records`, `attendance_changes`, `class_assignments`, `assignment_submissions`, `teacher_notes`, `teaching_plans`, `notifications`. Foreign keys and indexes cover teacher, group, student, scheduled start, status, and created time. `npx prisma db push` was used without `--accept-data-loss`. Unique constraints stop duplicate attendance and duplicate submissions. One in-progress session per group and per teacher is enforced in the service transaction.

## 12. APIs

All under `/api/teaching/*` and `/api/notifications`, session-authenticated, same-origin, and role-checked on the server. Client-supplied student ids are checked against the group. Class start/end timestamps are not accepted from the client.

## 13. Security

Missing or unassigned groups, sessions, lessons, and assignments return 404 from the API, not 403, so the caller is not told whether the row exists. A tampered session cookie is rejected. Direct HTML for an unassigned group renders the existing “Page not found” screen and does not include the group name. In this Next.js dev server that screen can still be HTTP 200 because the app shell starts streaming before `notFound()` runs. The API check is the authorization boundary.

Teacher notes default to `TEACHER_ONLY` and are not included in student notification payloads.

## 14. Testing

`npx tsc --noEmit` passes.

`npx tsx scripts/testing/verify-phase5.ts` against the running server: **42 passed, 0 failed**. Covered teacher, student, and admin login; unknown and unassigned group APIs; student blocked from class creation; schedule, start, duplicate in-progress, end, and server timestamps; attendance create, edit, uniqueness, audit, and cross-group rejection; tampered cookie; private note not leaked; late submit rejected; text submit; duplicate submit rejected; other-group submit 404; empty lesson publish rejected; empty audio rejected; valid publish; teaching plan; teacher and student pages render.

Server logs after the fix show those routes returning 200/201/404/409/422, not 500. An earlier attendance 500 (`P2028`, transaction timeout) was caused by writing the audit log inside the interactive transaction. Audit writes now happen after the transaction commits.

Verification rows titled `P5 …` were deleted afterward so the demo dashboard is not full of test classes.

## 15. Limitations

- No assignment file upload. Text only, on purpose.
- No generated audio. A block needs a real site path or URL.
- Block reorder is Up/Down, not drag-and-drop.
- Recurrence is weekly and UTC. There is no pause/edit screen yet; a new rule is created from the schedule page.
- The HTML not-found screen for an unassigned group may be HTTP 200 in dev. The API is 404 and the group is not rendered.
- Dashboard “need a look” reasons are descriptive counts (no recent sign-in, overdue assignment, failed assessment, low practice accuracy, absence). They are not a diagnosis.
- Exam and quiz scores remain official and are not editable from the teacher student profile.
- Notifications are in-app only.

## 16. Recommended Phase 6

Do not treat this as started.

1. Organization timezone and a way to pause or edit a recurrence rule.
2. Return a real HTTP 404 for unauthorized HTML routes before the shell streams.
3. Optional assignment files only after an upload pipeline exists.
4. Drag-and-drop with the existing Up/Down control kept as the keyboard path.
5. A reviewed export of attendance and assignment scores, still without rankings.
6. Email or other delivery only as an explicit, separate channel — in-app remains the default.
