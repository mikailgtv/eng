# Phase 21 — Data Integrity Report

**Audit date:** 2026-10-05
**Scope:** read-only inspection of `prisma/dev.db` and its post-change snapshot. The target is a local SQLite file, not a confirmed staging or production database.

## Checks completed

- SQLite `PRAGMA integrity_check`: `ok` on current local DB and post-change backup.
- SQLite `PRAGMA foreign_key_check`: 0 violations on each.
- Tables present: 213 (current DB and backup).
- Selected current counts: users 87; organizations 1; learning groups 5; levels 7; courses 4; books 1; lessons 39; student learning profiles 77; XP transactions 23; audit rows 647; mascot reaction logs 0.
- The separate Phase 20 access/fixture verification script passed earlier: 4 labeled learner fixtures showed expected level/course visibility and tagged completion/XP totals; a temporary higher-level assignment test was removed afterward; a temporary cross-organization custom level/course/assignment test was cleaned up. This was a local DB script, not a staging security certification.
- Restoring the snapshot into a temporary SQLite copy passed integrity/FK checks and matched critical row counts; Prisma readback matched users/courses/lessons/progress, and the built Next.js app's `/health` returned HTTP 200 against that temporary copy. See `PHASE_21_BACKUP_RESTORE_TEST.md`.

## Incident disclosure and limits

The current DB already received additive demo curriculum data, a Prisma schema push, and named demo learner QA fixture writes. The QA writer reported fixture progress/XP for `ivan.petrov`, `mei.chen`, `daniel.kim`, and `lena.torres` (`@demo.example`). Those rows are explicitly test/demo records, not real learner outcomes. A later access verification also upserted and deleted a temporary `mei.chen` → B1 course assignment, and created/deleted a synthetic organization, custom level and course. It did not check for a pre-existing inactive assignment before the upsert; if one existed, it may have been replaced and deleted. The target's pre-write isolation and affected-row baseline were not established before any of these operations. No restoration/rollback was performed; cleanup only removed explicitly created test rows. Do not infer that all writes were harmless to other records merely because global integrity checks pass.

A post-change backup at `backups/phase20-local-dev-db-post-change-20261005.sqlite` has the same selected counts and hash recorded in the recovery report; it is not a pre-incident backup and cannot establish the prior state.

## Constraints and safeguards observed

- Foreign keys are declared through Prisma relations and cascade/`SetNull`/`Restrict` behavior; the SQLite FK check found no invalid references at this point in time.
- Important uniqueness controls exist for login identifiers, one lesson-progress row per student/lesson, XP transaction source/rule, exam attempt number per student/assessment, certificate identifiers, and many junction tables.
- User deactivation/archival is modeled as status/soft fields in key flows; many dependent tables still intentionally use cascades. Hard-delete behavior requires per-entity policy review.
- Most primary business tables have `createdAt`/`updatedAt`; append-only/audit or junction records sometimes omit `updatedAt` by design. This report did not exhaustively compare every model's timestamps.
- No reviewed migration chain was found; schema push history cannot be used as a reproducible migration audit.

## Not verified

- Pre-incident row-level diff, provenance of pre-existing data, account/password field diffs, actual historic backup restore, production orphan records, delayed/cross-tenant referential semantics, all business-level invariants, exam/certificate eligibility, and data-retention requirements.
- No automated scheduled integrity checker or alerting job is configured.
- `PRAGMA foreign_key_check` validates relational references, not business rules such as a student having a level in their tenant or a certificate being eligible.

## Recommended non-destructive follow-up

1. Preserve the post-change snapshot and any earlier `prisma/dev.db.phase20.bak` file; do not overwrite them.
2. Ask the database owner to identify the intended source of truth and a pre-incident snapshot. Compare hashes/counts first, then a redacted row-level diff under a reviewed plan.
3. Run future integrity checks against a separate read-only snapshot/staging DB. Log check ID/time/result; alert on differences without auto-repair.
4. Add business checks for orphaned student profile levels, teacher assignments to invalid roles/organizations, progress referencing unpublished/deleted lessons, duplicate/unreconciled XP awards, certificates without eligible completions, and workflow runs stuck in retry states.
5. Run business repair only as an explicit, reviewed migration with before/after evidence and a verified restore path.
