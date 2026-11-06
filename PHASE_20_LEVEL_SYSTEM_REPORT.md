# Phase 20 — Level System Report

## Implemented
- Standard levels use the existing `Level` catalog and current `User.englishLevel` field (Pre-A1 through C2 in the local catalog).
- `StudentLearningProfile` stores confirmed/unconfirmed status, target level, pace, daily goal, assigned course/teacher and updater metadata.
- `LevelAccessPolicy` supports tenant policy and display/name overrides; organization admins have a level configuration screen/API and may add organization custom levels.
- Server-side course access rejects inactive-level/unpublished content, cross-organization custom-level courses, and higher levels granted by group membership alone.
- Lower-level review follows policy; higher-level preview requires a persisted per-student course assignment and policy permission. Teachers can assign explicit previews through the student learning page/API.
- Teacher changes are tenant/group checked in server services and audited.

## Verification
The local Phase 20 test script verified expected course levels for four tagged test students: Ivan PRE_A1; Lena A1; Mei A2; Daniel B1. It tested a higher-level course before/after a temporary preview assignment and a cross-organization course with an invalid assignment row. Temporary test rows were removed. This is a narrow local test, not a complete RBAC/IDOR suite.

## Limitations / risks
- Current level remains stored in `User.englishLevel` for compatibility; target level is in the profile. No dedicated immutable placement history was verified.
- Organization-level custom ordering is based on one global `Level.order` unique constraint; independent tenant ordering may be constrained.
- No full tests of admin privilege boundaries, all organizations, profile promotion, expiration/override workflow or UI on mobile were run.
- The schema was pushed into the existing local SQLite DB during Phase 20 before target isolation was confirmed. Do not run another push without a verified pre-change recovery point and explicit plan.
