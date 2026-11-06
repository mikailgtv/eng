# ASSESSMENT DATA MODEL — PHASE 17

This document outlines the data model, relationships, storage guarantees, and operational flows for the EnglishBridge Advanced Assessment Intelligence Engine.

---

## 1. Core Principles & Safeguards

1. **One Unified Web LMS**: Built strictly on top of the existing Phase 1–16 Next.js, Prisma, and SQLite architecture. No separate mobile codebase or native applications.
2. **Strict Separation of Assessment Types**:
   - `PRACTICE`: Managed via the Phase 3 activity engine; infinite, low-stakes learning, zero impact on official grading.
   - `QUIZ`: Short formative checks linked to lessons or modules.
   - `DIAGNOSTIC`: Skill-gap diagnostic profiling feeding Phase 9 adaptive learning. Not an official grade.
   - `PLACEMENT`: Pathway placement testing recommending starting courses. Explicitly separated from course grades.
   - `EXAM` & `FINAL`: High-stakes official assessments with append-only attempts and immutable historical snapshots.
   - `SPEAKING` & `WRITING`: Authentic production assessments with drafting, word counters, and human-guided rubric grading.
3. **Mandatory Historical Immutability**:
   - When an attempt starts, an immutable snapshot (`assessment_attempt_snapshots`) freezes the question text, option orders, points, rubric version, and time configurations.
   - If an instructor or administrator later edits or archives an underlying bank question, recalculates rules, or updates rubrics, historical results are never altered.
4. **No Student Rankings or Best/Worst Badging**:
   - Analytics present descriptive indicators and sample-size warnings without leaderboards, public rankings, or punitive gamification.

---

## 2. Entity Relationship Overview

```text
User (Student / Teacher / Admin)
  │
  ├── authoredAssessments ──────> Assessment
  │                                 │
  │                                 ├── questions ──> AssessmentQuestion ──> Question
  │                                 │                                          ├── QuestionOption
  │                                 │                                          ├── QuestionBankMeta
  │                                 │                                          ├── QuestionVersion
  │                                 │                                          └── AssessmentQualityCheck
  │                                 ├── blueprint ──> AssessmentBlueprint
  │                                 │                   ├── AssessmentBlueprintVersion
  │                                 │                   ├── AssessmentQuestionPool
  │                                 │                   └── AssessmentVariant
  │                                 └── retakePolicy ─> AssessmentRetakePolicy
  │
  ├── assessmentAttempts ─────────> AssessmentAttempt
  │                                 │
  │                                 ├── snapshot ───> AssessmentAttemptSnapshot
  │                                 ├── events ─────> AssessmentAttemptEvent (Integrity signals)
  │                                 ├── answers ────> AssessmentAnswer
  │                                 ├── rubricScores > AssessmentRubricScore
  │                                 ├── writing ────> WritingSubmission
  │                                 ├── speaking ───> AssessmentSpeakingSubmission
  │                                 ├── diagnostic ─> DiagnosticProfile
  │                                 ├── placement ──> PlacementResult
  │                                 └── corrections ─> AssessmentCorrection
  │
  └── accommodations ─────────────> AssessmentAccommodation
```

---

## 3. Database Entities & Schemas

### Assessment Blueprints
- **`assessment_blueprints`**:
  - `id`: CUID primary key
  - `title`: String
  - `assessmentType`: DIAGNOSTIC | PLACEMENT | QUIZ | EXAM | FINAL | SPEAKING | WRITING
  - `courseId`, `levelId`, `moduleId`, `unitId`: Optional scoping identifiers
  - `questionCount`: Total target questions
  - `timeLimitMinutes`: Configured duration
  - `passingScore`: Threshold percentage (default 70%)
  - `attemptLimit`: Maximum allowable attempts
  - `retakePolicy`: JSON stringified policy configuration
  - `secureMode`: Boolean enabling non-prejudicial integrity signals
  - `status`: DRAFT | REVIEW | APPROVED | PUBLISHED | RETIRED
- **`assessment_blueprint_versions`**:
  - `id`: CUID
  - `blueprintId`: Reference to `assessment_blueprints`
  - `version`: Sequential integer
  - `sections`: JSON array of skill percentage allocations
  - `difficulty`: JSON object of EASY, MEDIUM, and HARD allocations
  - `objectives`: JSON array of tagged learning objectives
  - `scoringConfig`: JSON configuration for weighted section scoring
- **`assessment_variants`**:
  - `id`: CUID
  - `blueprintId`: Reference to parent blueprint
  - `label`: Distinct variant tag (e.g., Variant A, Variant B)
  - `questionIds`: JSON array of approved question identifiers
  - `difficultyIndex`: Calculated difficulty weighting (EASY=1, MEDIUM=2, HARD=3)

### Question Bank Metadata & Integrity
- **`question_bank_meta`**:
  - `questionId`: Primary key referencing `questions`
  - `courseId`, `unitId`, `subskill`, `objective`, `topic`
  - `estimatedSeconds`: Target completion pacing
  - `vocabularyTag`, `grammarTopic`
  - `workplaceRelevance`, `firefighterRelevance`, `dayWorkerRelevance`: Domain context flags
  - `reviewState`: DRAFT | REVIEW | APPROVED | PUBLISHED | RETIRED
  - `usageCount`: Cumulative sitting count
- **`question_versions`**:
  - Immutable version history archiving question text, options, and configuration before mutations.
- **`assessment_quality_checks`**:
  - Automated flags for missing answers, multiple correct answers, empty options, broken media links, and semantic duplicates.

### Attempt Snapshots & Integrity Signals
- **`assessment_attempt_snapshots`**:
  - `id`: CUID
  - `attemptId`: Unique 1-to-1 reference to `assessment_attempts`
  - `questionVersions`: Full JSON snapshot of frozen question text, options, points, and layouts
  - `questionOrder`: Frozen item sequence
  - `timeConfig`: Frozen start time, server deadline, and accommodations
  - `scoringConfig`: Frozen passing threshold and calculation rules
  - `rubricVersionId`: Pinned rubric version if applicable
- **`assessment_attempt_events`**:
  - Audit logging of integrity indicators (`TAB_HIDDEN`, `FOCUS_LOST`, `RECONNECT`, `INACTIVITY`).
  - Labeled explicitly as diagnostic signals for instructor review, not definitive proof of cheating.

### Rubrics, Review & Production
- **`rubrics` & `rubric_versions`**:
  - Hierarchical structure: Rubric -> Criteria (weighted) -> Levels (score + description).
  - Pinned and marked immutable once referenced by an official finalized assessment attempt.
- **`assessment_rubric_scores`**:
  - Multi-dimensional rubric scoring by authorized teachers, with feedback and audit status (`SUBMITTED` -> `UNDER_REVIEW` -> `REVIEWED` -> `FINALIZED`).
- **`writing_submissions`**:
  - Dedicated storage for written essays, prompts, word counters, and teacher commentary.
- **`assessment_speaking_submissions`**:
  - Audio references, duration, and transcripts. Speech recognition outputs are strictly labeled as machine transcripts and separated from human teacher evaluations.
- **`assessment_review_queue`**:
  - Centralized task queue for pending student writing and speaking submissions.
- **`assessment_corrections`**:
  - Transparent audit trail tracking changes to finalized official assessment scores with reason and actor logging.

### Accommodations, Adaptive, Diagnostic & Reports
- **`assessment_accommodations`**:
  - Configurable accommodations: extra time, larger text, alternative presentation, audio replay allowances.
- **`assessment_retake_policies`**:
  - Configurable retake modes: NONE, ONE, TWO, UNLIMITED, WAIT period, or REMEDIAL review.
- **`assessment_diagnostic_profiles`**:
  - Descriptive skill gap profiles mapping to the Phase 9 adaptive learning engine.
- **`placement_results`**:
  - Recommended CEFR entry levels with manual teacher override tracking.
- **`adaptive_assessment_sessions` & `adaptive_assessment_events`**:
  - Controlled item-level adaptation history recording question selection logic.
- **`assessment_item_statistics` & `assessment_distractor_statistics`**:
  - Classical item analysis: difficulty estimates, distractor percentages, point-biserial correlations with honest sample-size validation.
- **`assessment_report_snapshots`**:
  - Reproducible snapshots for institutional BI reporting.

---

## 4. Lifecycle & Data Flows

### A. Exam Sitting Flow
1. **Validation**: Server verifies student group authorization, open scheduling window, and retake allowances via `assertRetakeAllowed`.
2. **Snapshot Creation**: Inside an atomic transaction, `assessment_attempts` is created, and `freezeAttempt` captures all question content into `assessment_attempt_snapshots`.
3. **Accommodation Application**: Any active `assessment_accommodations` row dynamically recalculates the server deadline.
4. **Progressive Auto-save**: Student answers persist via debounced calls to `/api/assessments/[id]/attempts/[attemptId]/answer`. Offline reconnection automatically syncs pending items.
5. **Integrity Monitoring**: Visibility and focus transitions log to `assessment_attempt_events`.
6. **Finalization & Post-processing**: Upon submit, `gradeAndFinish` runs server-side. Auto-graded items are evaluated; manual writing/speaking items enqueue to `assessment_review_queue`. `afterAssessmentSubmit` routes diagnostic and placement updates.

### B. Teacher Rubric Evaluation Flow
1. Teacher opens `/teacher/exams/reviews`.
2. Submissions are loaded from `assessment_review_queue` scoped strictly to assigned groups.
3. Teacher assesses criteria levels against pinned `rubric_versions`.
4. Teacher can request AI draft suggestions, clearly labeled as non-official feedback.
5. Submission is marked `FINALIZED`, locking the rubric version and updating the attempt's official score.
