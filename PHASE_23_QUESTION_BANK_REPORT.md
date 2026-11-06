# Phase 23 — Question Bank Report

**Status: BLOCKED (substantial existing foundation, full acceptance unverified).**

## Existing structures and behavior
- Existing `Question`, `QuestionOption`, `AssessmentQuestion`, `QuestionBankMeta`, `QuestionVersion`, `AssessmentItemStatistic`, `AssessmentDistractorStatistic`, and `AssessmentQualityCheck` models.
- Supported types include multiple choice, true/false, fill blank, matching, word order, listening, and manual reading/writing/speaking. Difficulty tags are EASY/MEDIUM/HARD; skills cover vocabulary, grammar, reading, listening, speaking, writing.
- Teacher list `/teacher/questions` supports text/type/skill/difficulty/level/lesson filters; source is `src/app/(app)/teacher/questions/page.tsx`.
- Assessment registry explicitly separates PRACTICE (Activity/ActivityAttempt) from QUIZ/EXAM and defines diagnostic/placement/final/speaking/writing types.
- Quality and statistics foundations exist in `src/lib/assessment/intelligence/quality.ts` and analytics routes; question and blueprint versions also exist.

## Gaps and test needs
- No dedicated Phase 23 end-to-end test was run for tag completeness, draft/review/publish transitions, published-only assessment pools, question editing/version snapshots, or student sanitization of answer keys.
- Statistical calculations/sample-size safeguards and all skill/objective tags were not verified against test fixtures; do not claim bank reliability or item validity from model presence alone.
- Question version snapshots and content review parity across imported, AI-created and manually authored questions require validation.
- Need test that practice attempts, quizzes and exams stay separate in every dashboard and export, and that low-sample statistics are labeled as insufficient rather than interpreted as quality scores.

**Blocker:** High — quality analytics and lifecycle guarantees are not evidenced end-to-end. Root cause is that existing tables/pages have not been exercised against the Phase 23 acceptance suite. Required fix: isolated synthetic tests for tagging, role controls, approved-pool selection, answer-key sanitization, version retention, sample-size warnings and practice/quiz/exam separation. No real learner scores or fake analytics may be used.