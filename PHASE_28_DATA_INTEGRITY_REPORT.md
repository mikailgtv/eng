# Phase 28 — Data Integrity Report

**Audit date:** 2026-10-07

## Read-only source results

The user authorized a read-only inventory of `/home/user/prisma/dev.db`. It was opened with SQLite `mode=ro` and `PRAGMA query_only=1`; no record values were printed, changed, or exported.

| Validation | Source SQLite baseline | PostgreSQL target |
|---|---:|---|
| Physical tables / model-name match | 213 / 213; no missing or extra names | No target / not run |
| Total rows / nonempty tables | 3,716 / 123 | No target / not run |
| Nullable-cell count | 9,057 across nullable columns | No target / not run |
| SQLite `integrity_check` | `ok` | No target / not run |
| Foreign-key violations | 0 | No target / not run |
| Unique indexes / duplicate non-null groups | 314 / 0 | No target / not run |
| Critical PK-set and full-row digests | Baseline generated per table | No target / no comparison |
| Backup/restore verification | Existing files not opened; no new backup/restore | No backup/restore run |

Source DB SHA-256: `e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`. SQLite schema SHA-256: `edc4017d8b310c1675ac9c4e59a3c950dba7892cfb0fdbea42fc958663a3a25d`. Checked-in Prisma schema SHA-256: `559a211a8e79be6d0946a629c7e6cf52cdeb8c713298ce4e0d1590c942088431`; package version `0.1.0`; no Git revision is available. The Data Migration Report lists per-table row counts, primary-key column names, PK-set digests, and full-row digests; this report's appendix below provides per-table row/null/unique/FK results.

The source contains 87 `users`, 5 `learning_groups`, 1 `organizations`, 39 `lessons`, 5 lesson-progress rows, 15 class assignments, 7 assignment submissions, 7 attendance records, 4 assessments, 0 assessment attempts, 5 certificates, and 23 XP transactions. Thirteen user rows match the `@demo.example` email domain; no individual account values are disclosed. This is a mixed/demo-seeded development dataset, not evidence that the contents are production user data.

Critical domains requiring equality checks after an approved migration include user/student/teacher IDs, organizations/groups, lessons and progress, assignment/submission IDs, assessment/attempt/answer IDs, attendance IDs, XP ledger IDs, and certificate IDs. No ID mapping has been generated; the schema primarily uses strings and CUID defaults, with some natural and composite keys.

## Schema constraints reviewed statically

The checked-in schema declares 213 models, 339 relation annotations, 33 single-field unique attributes, 69 composite unique constraints, five composite primary keys, 190 explicit Cascade actions, 68 SetNull, two Restrict, and 79 relation annotations without explicit `onDelete`. These declarations do not establish that current database rows satisfy the constraints.

The inspected SQLite source passed its structural/uniqueness check and has zero FK violations. This does not rule out application-level invalid references or establish PostgreSQL results. No records were deleted or repaired. Any target mismatch must be reported with root cause; do not silently delete or coerce rows.
## Appendix — per-table source integrity summary

`null cells` counts NULL values only in columns SQLite declares nullable. `duplicate groups` counts duplicate fully non-null tuples for SQLite unique indexes; SQLite `integrity_check=ok` provides a second structural/unique-constraint check. No row values or key values are shown.

| Table | Rows | Null cells | Duplicate unique groups | FK violations |
|---|---:|---:|---:|---:|
| `access_review_decisions` | 0 | 0 | 0 | 0 |
| `access_reviews` | 11 | 0 | 0 | 0 |
| `account_security_events` | 232 | 288 | 0 | 0 |
| `activities` | 71 | 51 | 0 | 0 |
| `activity_attempts` | 4 | 4 | 0 | 0 |
| `activity_vocabulary` | 41 | 0 | 0 | 0 |
| `adaptive_assessment_events` | 0 | 0 | 0 | 0 |
| `adaptive_assessment_sessions` | 0 | 0 | 0 | 0 |
| `adaptive_rules` | 1 | 0 | 0 | 0 |
| `ai_feedback` | 0 | 0 | 0 | 0 |
| `ai_generated_content` | 0 | 0 | 0 | 0 |
| `ai_messages` | 8 | 2 | 0 | 0 |
| `ai_recommendations` | 2 | 3 | 0 | 0 |
| `ai_sessions` | 4 | 8 | 0 | 0 |
| `ai_settings` | 1 | 1 | 0 | 0 |
| `ai_usage` | 6 | 0 | 0 | 0 |
| `announcement_acknowledgements` | 0 | 0 | 0 | 0 |
| `announcement_targets` | 0 | 0 | 0 | 0 |
| `announcements` | 0 | 0 | 0 | 0 |
| `api_client_credentials` | 18 | 26 | 0 | 0 |
| `assessment_accommodations` | 6 | 18 | 0 | 0 |
| `assessment_answers` | 0 | 0 | 0 | 0 |
| `assessment_attempt_events` | 0 | 0 | 0 | 0 |
| `assessment_attempt_snapshots` | 0 | 0 | 0 | 0 |
| `assessment_attempts` | 0 | 0 | 0 | 0 |
| `assessment_blueprint_versions` | 6 | 0 | 0 | 0 |
| `assessment_blueprints` | 6 | 36 | 0 | 0 |
| `assessment_corrections` | 0 | 0 | 0 | 0 |
| `assessment_diagnostic_profiles` | 0 | 0 | 0 | 0 |
| `assessment_distractor_statistics` | 0 | 0 | 0 | 0 |
| `assessment_item_statistics` | 6 | 36 | 0 | 0 |
| `assessment_quality_checks` | 0 | 0 | 0 | 0 |
| `assessment_question_pools` | 0 | 0 | 0 | 0 |
| `assessment_questions` | 51 | 0 | 0 | 0 |
| `assessment_report_snapshots` | 6 | 12 | 0 | 0 |
| `assessment_retake_policies` | 1 | 1 | 0 | 0 |
| `assessment_retention_policies` | 0 | 0 | 0 | 0 |
| `assessment_review_queue` | 0 | 0 | 0 | 0 |
| `assessment_rubric_scores` | 0 | 0 | 0 | 0 |
| `assessment_speaking_submissions` | 0 | 0 | 0 | 0 |
| `assessment_variants` | 12 | 0 | 0 | 0 |
| `assessments` | 4 | 14 | 0 | 0 |
| `assignment_submissions` | 7 | 28 | 0 | 0 |
| `attendance_changes` | 14 | 7 | 0 | 0 |
| `attendance_records` | 7 | 0 | 0 | 0 |
| `audio_assets` | 0 | 0 | 0 | 0 |
| `audit_logs` | 647 | 618 | 0 | 0 |
| `badges` | 8 | 0 | 0 | 0 |
| `book_content_nodes` | 21 | 86 | 0 | 0 |
| `book_versions` | 1 | 0 | 0 | 0 |
| `books` | 1 | 3 | 0 | 0 |
| `calendar_sync_mappings` | 0 | 0 | 0 | 0 |
| `certificate_preferences` | 1 | 0 | 0 | 0 |
| `certificate_revocations` | 1 | 0 | 0 | 0 |
| `certificate_sequences` | 1 | 0 | 0 | 0 |
| `certificate_signatories` | 2 | 0 | 0 | 0 |
| `certificate_templates` | 2 | 0 | 0 | 0 |
| `certificate_verifications` | 12 | 2 | 0 | 0 |
| `certificate_versions` | 5 | 1 | 0 | 0 |
| `certificates` | 5 | 17 | 0 | 0 |
| `certification_settings` | 1 | 0 | 0 | 0 |
| `challenge_participants` | 5 | 3 | 0 | 0 |
| `challenges` | 3 | 6 | 0 | 0 |
| `class_assignments` | 15 | 42 | 0 | 0 |
| `class_sessions` | 15 | 88 | 0 | 0 |
| `communication_preferences` | 0 | 0 | 0 | 0 |
| `communication_settings` | 0 | 0 | 0 | 0 |
| `content_ai_drafts` | 0 | 0 | 0 | 0 |
| `content_assignments` | 0 | 0 | 0 | 0 |
| `content_comments` | 0 | 0 | 0 | 0 |
| `content_item_tags` | 0 | 0 | 0 | 0 |
| `content_item_usages` | 0 | 0 | 0 | 0 |
| `content_items` | 0 | 0 | 0 | 0 |
| `content_media` | 0 | 0 | 0 | 0 |
| `content_metrics` | 0 | 0 | 0 | 0 |
| `content_overrides` | 0 | 0 | 0 | 0 |
| `content_prerequisites` | 0 | 0 | 0 | 0 |
| `content_quality_checks` | 40 | 0 | 0 | 0 |
| `content_releases` | 0 | 0 | 0 | 0 |
| `content_reviews` | 0 | 0 | 0 | 0 |
| `content_settings` | 0 | 0 | 0 | 0 |
| `content_tags` | 14 | 0 | 0 | 0 |
| `content_versions` | 0 | 0 | 0 | 0 |
| `conversation_participants` | 0 | 0 | 0 | 0 |
| `conversations` | 0 | 0 | 0 | 0 |
| `course_assignments` | 20 | 0 | 0 | 0 |
| `course_completion_records` | 2 | 6 | 0 | 0 |
| `course_completion_rules` | 0 | 0 | 0 | 0 |
| `course_versions` | 0 | 0 | 0 | 0 |
| `courses` | 4 | 44 | 0 | 0 |
| `curriculum_versions` | 0 | 0 | 0 | 0 |
| `curriculums` | 2 | 13 | 0 | 0 |
| `daily_learning_plans` | 4 | 0 | 0 | 0 |
| `delegations` | 0 | 0 | 0 | 0 |
| `departments` | 0 | 0 | 0 | 0 |
| `external_data_import_batches` | 15 | 18 | 0 | 0 |
| `external_identity_links` | 14 | 26 | 0 | 0 |
| `gamification_profiles` | 5 | 10 | 0 | 0 |
| `gamification_settings` | 1 | 0 | 0 | 0 |
| `grammar_content` | 6 | 45 | 0 | 0 |
| `group_challenge_progress` | 1 | 0 | 0 | 0 |
| `group_challenges` | 1 | 1 | 0 | 0 |
| `import_batches` | 0 | 0 | 0 | 0 |
| `integration_connections` | 13 | 72 | 0 | 0 |
| `integration_credentials` | 0 | 0 | 0 | 0 |
| `integration_field_mappings` | 0 | 0 | 0 | 0 |
| `integration_logs` | 17 | 69 | 0 | 0 |
| `integration_sync_jobs` | 0 | 0 | 0 | 0 |
| `knowledge_items` | 1 | 2 | 0 | 0 |
| `learning_events` | 32 | 135 | 0 | 0 |
| `learning_goals` | 3 | 3 | 0 | 0 |
| `learning_groups` | 5 | 23 | 0 | 0 |
| `learning_levels` | 12 | 0 | 0 | 0 |
| `learning_objectives` | 20 | 20 | 0 | 0 |
| `learning_recommendations` | 30 | 1 | 0 | 0 |
| `learning_streaks` | 1 | 0 | 0 | 0 |
| `lesson_content_blocks` | 156 | 156 | 0 | 0 |
| `lesson_drafts` | 0 | 0 | 0 | 0 |
| `lessons` | 39 | 318 | 0 | 0 |
| `level_access_policies` | 0 | 0 | 0 | 0 |
| `levels` | 7 | 7 | 0 | 0 |
| `listening_assignments` | 0 | 0 | 0 | 0 |
| `listening_attempts` | 6 | 6 | 0 | 0 |
| `listening_exercises` | 1 | 2 | 0 | 0 |
| `login_attempts` | 210 | 220 | 0 | 0 |
| `mascot_reaction_logs` | 0 | 0 | 0 | 0 |
| `message_attachments` | 0 | 0 | 0 | 0 |
| `message_revisions` | 0 | 0 | 0 | 0 |
| `messages` | 0 | 0 | 0 | 0 |
| `mfa_backup_codes` | 0 | 0 | 0 | 0 |
| `mfa_challenges` | 11 | 0 | 0 | 0 |
| `mfa_methods` | 1 | 2 | 0 | 0 |
| `milestones` | 4 | 0 | 0 | 0 |
| `modules` | 9 | 27 | 0 | 0 |
| `notification_deliveries` | 258 | 270 | 0 | 0 |
| `notification_preferences` | 0 | 0 | 0 | 0 |
| `notification_rules` | 14 | 28 | 0 | 0 |
| `notification_template_versions` | 0 | 0 | 0 | 0 |
| `notification_templates` | 0 | 0 | 0 | 0 |
| `notifications` | 318 | 2204 | 0 | 0 |
| `organization_settings` | 1 | 7 | 0 | 0 |
| `organizations` | 1 | 1 | 0 | 0 |
| `password_history` | 5 | 0 | 0 | 0 |
| `permissions` | 49 | 0 | 0 | 0 |
| `placement_results` | 6 | 6 | 0 | 0 |
| `push_subscriptions` | 0 | 0 | 0 | 0 |
| `question_bank_meta` | 0 | 0 | 0 | 0 |
| `question_options` | 97 | 0 | 0 | 0 |
| `question_versions` | 1 | 0 | 0 | 0 |
| `questions` | 57 | 148 | 0 | 0 |
| `recurrence_rules` | 1 | 1 | 0 | 0 |
| `requirement_overrides` | 0 | 0 | 0 | 0 |
| `review_schedules` | 1 | 0 | 0 | 0 |
| `role_permissions` | 161 | 0 | 0 | 0 |
| `roles` | 8 | 0 | 0 | 0 |
| `rubric_versions` | 6 | 0 | 0 | 0 |
| `rubrics` | 6 | 6 | 0 | 0 |
| `scheduled_notices` | 47 | 0 | 0 | 0 |
| `skill_mappings` | 0 | 0 | 0 | 0 |
| `skills` | 19 | 6 | 0 | 0 |
| `speaking_assignments` | 3 | 21 | 0 | 0 |
| `speaking_submissions` | 0 | 0 | 0 | 0 |
| `speech_attempts` | 3 | 3 | 0 | 0 |
| `speech_recognition_requests` | 12 | 0 | 0 | 0 |
| `streak_freezes` | 1 | 1 | 0 | 0 |
| `student_badges` | 3 | 0 | 0 | 0 |
| `student_course_assignments` | 0 | 0 | 0 | 0 |
| `student_knowledge_states` | 1 | 1 | 0 | 0 |
| `student_learning_preferences` | 1 | 0 | 0 | 0 |
| `student_learning_profiles` | 77 | 366 | 0 | 0 |
| `student_lesson_progress` | 5 | 5 | 0 | 0 |
| `student_milestones` | 0 | 0 | 0 | 0 |
| `student_skill_states` | 7 | 0 | 0 | 0 |
| `student_voice_preferences` | 0 | 0 | 0 | 0 |
| `support_access_sessions` | 12 | 0 | 0 | 0 |
| `teacher_approvals` | 2 | 1 | 0 | 0 |
| `teacher_group_assignments` | 2 | 2 | 0 | 0 |
| `teacher_learning_overrides` | 3 | 12 | 0 | 0 |
| `teacher_notes` | 7 | 7 | 0 | 0 |
| `teacher_student_assignments` | 0 | 0 | 0 | 0 |
| `teaching_plans` | 8 | 30 | 0 | 0 |
| `teams` | 0 | 0 | 0 | 0 |
| `temporary_permissions` | 0 | 0 | 0 | 0 |
| `transcripts` | 0 | 0 | 0 | 0 |
| `tts_requests` | 0 | 0 | 0 | 0 |
| `units` | 1 | 4 | 0 | 0 |
| `user_departments` | 0 | 0 | 0 | 0 |
| `user_groups` | 11 | 0 | 0 | 0 |
| `user_invitations` | 23 | 124 | 0 | 0 |
| `user_organizations` | 87 | 0 | 0 | 0 |
| `user_profiles` | 0 | 0 | 0 | 0 |
| `user_roles` | 6 | 18 | 0 | 0 |
| `user_sessions` | 165 | 419 | 0 | 0 |
| `users` | 87 | 1019 | 0 | 0 |
| `vocabulary` | 118 | 1652 | 0 | 0 |
| `vocabulary_review` | 0 | 0 | 0 | 0 |
| `voice_consents` | 0 | 0 | 0 | 0 |
| `voice_messages` | 6 | 0 | 0 | 0 |
| `voice_sessions` | 6 | 24 | 0 | 0 |
| `voice_settings` | 0 | 0 | 0 | 0 |
| `webhook_deliveries` | 0 | 0 | 0 | 0 |
| `webhook_inbound_receipts` | 0 | 0 | 0 | 0 |
| `webhook_subscriptions` | 0 | 0 | 0 | 0 |
| `weekly_learning_plans` | 2 | 0 | 0 | 0 |
| `workflow_approvals` | 0 | 0 | 0 | 0 |
| `workflow_events` | 0 | 0 | 0 | 0 |
| `workflow_idempotency_records` | 0 | 0 | 0 | 0 |
| `workflow_run_steps` | 0 | 0 | 0 | 0 |
| `workflow_runs` | 0 | 0 | 0 | 0 |
| `workflow_versions` | 0 | 0 | 0 | 0 |
| `workflows` | 0 | 0 | 0 | 0 |
| `writing_submissions` | 0 | 0 | 0 | 0 |
| `xp_transactions` | 23 | 44 | 0 | 0 |
