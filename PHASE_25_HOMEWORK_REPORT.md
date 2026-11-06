# Phase 25 — Homework Report

**Status: BLOCKED.** The LMS has a real but narrower assignment workflow; it is not yet the full exercise-based homework system requested.

## Existing data-backed functionality
- `Assignment` is group-scoped, teacher-authored, linked optionally to course/lesson, has instructions, due time, allow-late and DRAFT/PUBLISHED/CLOSED/ARCHIVED states.
- Teacher pages create/publish assignments and see submissions; students see only published assignments in their own group and submit text to `/api/teaching/assignments/[id]/submit`.
- `AssignmentSubmission` is unique per assignment/student and stores answer text, status, submit time, score, one feedback string, reviewer and review time.
- Server services enforce student/group access, deadline/late policy, nonempty text, score range and teacher group scope. Notification and audit calls are present.
- Existing separate speaking/listening assignments and practice activities are not merely mock lists, but their completion/review path is not integrated into one homework submission ledger.

## Gaps
- Assignment type allowlist is currently PRACTICE/WRITTEN/VOCABULARY/READING; no full requested Listening/Speaking/Mixed assignment type or selectable exercise items.
- No student selection (class/group only), attempts limit, XP setting, required/optional flag, or reusable item list.
- Submissions are text-only, one row per student/assignment; no saved per-question state, immutable attempt history, media/file support, retry/resubmit lifecycle, RETURNED state, or cancellation/late-state transition history.
- A reviewed submission is set to GRADED; there is no return-with-changes action. Student can update text only before review, and a graded submission becomes non-editable.
- XP and skill-progress effects of homework are not demonstrated. No claim of automatic grade/XP is made.

## Blockers
- **High — database/workflow:** current schema cannot retain multiple attempts or homework items. Root cause: AssignmentSubmission is a single text response with a uniqueness constraint. Required fix: add reviewed additive records/relations after isolated migration and restore tests, then implement attempts, items, state history and idempotent submission.
- **High — UI/API:** no assignment builder for lesson exercises, individual targeting, modality or retry policy. Required fix: connect existing published Activities/Questions and speaking/listening items using server-side validation and published-content checks.
- **High — QA/security:** no E2E student A/B access, concurrent retry, deadline boundary or teacher scope tests in staging. Required fix: run cross-role tests in disposable DB.

No homework fixture or student submission was created in this phase.