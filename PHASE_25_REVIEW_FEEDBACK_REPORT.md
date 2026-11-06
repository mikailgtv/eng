# Phase 25 — Review and Feedback Report

**Status: BLOCKED (manual score/comment paths exist; unified review and structured feedback do not).**

## Existing paths
- Teachers can review text assignment submissions in `/teacher/assignments/[id]`; `reviewSubmission` checks teacher group access and stores 0–100 score, comment, reviewer and timestamp, writes audit, and notifies the student.
- Assessment manual review queue and rubric/manual grading infrastructure exist under `/teacher/exams/reviews` and assessment intelligence APIs.
- Speaking and writing activity/assignment structures exist, but not a verified unified review path spanning homework, spoken audio, writing, quiz results and returned work.
- Student sees assignment score/comment on the assignment page; assessment attempts/results have separate pages. There is no verified `/student/feedback` profile center aggregating these sources.
- Teacher notes are stored separately as TEACHER_ONLY; reports must not expose those notes to students or org-wide managers without permission.

## Missing acceptance behavior
- Review Center aggregating pending, late, speaking, writing, quiz, homework, returned and resubmitted work.
- Feedback fields for strengths, weakness, correction, recommendation, review state and student-readable visibility.
- Speaking rubric dimensions (pronunciation, fluency, accuracy, vocabulary, grammar) with teacher-configured criteria; reviewed audio access flow not tested.
- Writing corrected version, grammar/vocabulary error annotations and recommendation storage.
- Feedback state transitions NOT_REVIEWED → IN_REVIEW → REVIEWED / RETURNED → RESUBMITTED; assignment model currently has only IN_PROGRESS/SUBMITTED/LATE/GRADED behavior.
- Teacher recommendation actions (repeat, skill practice, remedial/advanced track, extra homework) are not persistently connected to the feedback record.

## Blockers
- **High — review center and feedback model:** existing one-field feedback and separate review pages do not capture requested dimensioned feedback. Required fix: additive feedback/review entities linked to existing submission/attempt IDs, private-note separation, versioned state transitions and student/teacher views.
- **High — authorization:** ensure each feedback/review API checks actor's assigned group and submission/student relation, with no student score mutation; test all role boundaries in an isolated environment.
- **Medium — accessibility:** no screen-reader/keyboard/mobile testing of review forms and audio/writing rubrics.

No scores or feedback were fabricated or written.