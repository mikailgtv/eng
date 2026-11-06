# Phase 23 — Learning Path Report

**Status: BLOCKED (reusable learning-path components exist; required coverage is not certified).**

## Existing evidence
- `src/lib/learning.ts` fetches assigned published course/module/lesson trees, session-user progress, prerequisites, content releases and teacher overrides. It exposes `isDemo` on a course overview. Course assignment and level-access checks are server-side.
- Content prerequisites and `ContentRelease` support scheduled, sequential, teacher and immediate release patterns; `ContentOverride` can unlock content.
- Student surfaces exist at `/student/learning`, `/student/plan`, `/student/review`, and `/student/achievements`; the student review queue uses stored knowledge states.
- Diagnostic answers can create per-skill observed events/profile evidence in `src/lib/assessment/intelligence/diagnostic.ts`; recommendation code uses stored learner state and review events. Daily goal/achievement UI is present.

## Gaps / blockers
- The full daily learning experience and weak-skill recommendation ranking have not been tested against a complete learner journey; recommendation labels/evidence must not be mistaken for mastery.
- Evidence coverage across completed lessons, practice attempts, speaking/listening and diagnostics has not been shown to feed one consistent per-student skill state.
- Demo courses are marked on course overview, but `getAssignedCourseOverviews` includes them in student totals when assigned. Content analytics query stored metrics/completions without a demo exclusion. This fails a claim that demo data is universally isolated from real reporting.
- Full dependency-cycle checks and teacher override audit/tenant tests were not run.

**High blocker — learning path/report integrity.** Root cause: demo marker is available but not consistently applied as a reporting filter, and skill-evidence/recommendation paths are not acceptance-tested end-to-end. Required fix: make demo exclusion explicit in real-content reports, preserve clear demo views separately, validate skills from real stored evidence, and run disposable integration tests for locks, overrides, review queues and recommendation explanations. No learner data was modified.