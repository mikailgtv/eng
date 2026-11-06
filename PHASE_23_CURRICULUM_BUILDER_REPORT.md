# Phase 23 — Curriculum Builder Report

**Status: BLOCKED (partial reuse confirmed).** No schema replacement or database writes were made.

## Existing implementation
- Reusable tree in `prisma/schema.prisma`: `Curriculum → Course → Module → Unit → Lesson`, with optional `Lesson.unitId`, plus content blocks.
- Teacher authoring surfaces: `src/app/(app)/teacher/content/page.tsx`, `builder/[id]`, `course/[id]`, `preview/[id]`; admin curriculum surfaces under `src/app/(app)/admin/curriculum/`.
- Existing service/API methods cover curriculum/course/module/unit/lesson creation, curriculum duplication, objective/skill mapping, prerequisites, release modes, draft save, quality check, submit-for-review, reviewer decision, preview and publish.
- Lesson publishing checks for visible lesson blocks and latest approval when review is required. Student course reads restrict access to published course/module/lesson rows; access also considers course assignment, release and prerequisites.
- Versions exist for courses, curricula and lesson snapshots. Lesson snapshot currently captures title, goal and blocks, not a full frozen copy of every linked content type.

## Gaps against requested builder
- `createModule`/`createUnit` append order, but a complete reorder UI/API and ordering integration tests were not found.
- Curriculum duplication is implemented, but it copies a subset of hierarchy/content and does not demonstrate complete copying of objectives, prerequisites, releases, all activity/content records, or references. Deep duplicate correctness is not certified.
- A Unit exists, but its relationship to a lesson is optional; required/optional policy is not an explicit generalized curriculum rule.
- Prerequisites/releases provide sequencing foundations, but cycle prevention across multi-node dependency graphs and all flexible/sequential behaviors are not demonstrated.
- Draft lesson preview exists; an isolated draft quiz/practice runtime was not verified.
- Lifecycle/archive and approval parity across curriculum, course, module, unit, lesson, question, and book entities needs a single acceptance suite.
- Existing content/review settings and services require integration verification before assertion of complete approval control.

## Safety and next steps
No `prisma/dev.db` read/write or seed was used for this report. Implement missing UI/API only on current source-of-truth tables. Before release, exercise create → edit → reorder → duplicate → preview → submit → approve/reject → publish/archive in a disposable DB; verify student queries never reveal drafts and that published edits preserve restorable versions.

**Blocker:** High severity — incomplete reorder/deep-duplicate/optional-sequencing acceptance. Root cause is partial feature coverage across existing content services. Required fix: add the missing interactions and isolated tests without changing the real DB architecture.