# Phase 29 — Exam Security Report

**Live exam/attempt tampering:** NOT TESTED.

## Positive static controls

- Student start/resume uses session student and transaction guards; answer-save and submit services are designed to bind attempt to viewer, enforce deadline, and transition state guarded/idempotently. Student attempt response is documented as sanitized; official score calculation is server-side.
- Correct-answer data is intentionally present in teacher builder/question-bank endpoints.

## HIGH candidate: staff exam IDOR and answer exposure

`GET/PATCH /api/assessments/{id}` require only TEACHER/ADMIN and query by ID; GET serializes nested options including `isCorrect`. PATCH updates any found assessment. `PUT /api/assessments/{id}/questions` also uses only broad TEACHER/ADMIN role and existence lookup before replacement. No assigned-group/course-owner/organization check appears in these handlers. A teacher who obtains another assessment ID may read answer keys or modify the exam. Runtime cross-teacher/tenant request was NOT TESTED.

**Other tests NOT RUN:** student A/B attempt IDs, direct attempt URL, question answer exposure, correct answer in student routes, client score/passed/completed flags, time manipulation, duplicate submissions, repeated grading/review, result export, teacher scope.
