# Phase 23 — Content Engine Report

**Status: BLOCKED.** Phase 23 is not ready for release. This is an evidence-based audit plus a small, write-free book-import preview foundation and a teacher-scope security correction. The acceptance set is not fully implemented or demonstrated.

## Scope and safety
- Existing application, routes, ORM/schema, accounts, sessions and content tables were retained; no system rebuild or replacement was attempted.
- No Phase 23 write, seed, reset, destructive test, or demo-data insert was made against `prisma/dev.db`. The existing post-change backup is not a pre-incident restore point and was not used as a Phase 23 target.
- `prisma validate`, TypeScript typecheck, and the isolated book-import preview unit script passed. These do not certify a live workflow or migration.
- `npm ci --ignore-scripts`, `prisma generate`, and `npm audit` were run; these do not intentionally access the database. npm install reported 7 vulnerabilities (1 critical, 6 high) for the full dependency tree; the production-only audit reported 1 critical and 1 high. No dependency upgrade was made because the reported remediation entails major framework/toolchain changes and requires a separately reviewed compatibility/security change.

## Architecture audit — reuse confirmed
| Concern | Existing source of truth / evidence | Phase 23 finding |
|---|---|---|
| Curriculum/course hierarchy | `Curriculum`, `Course`, `Module`, `Unit`, `Lesson` in `prisma/schema.prisma`; `src/lib/content/service.ts` | Existing hierarchy is reusable; model path is curriculum → course → module → unit → lesson (unit link on lesson is optional). No replacement schema was introduced. |
| Skills and learning outcomes | `LearningObjective`, `SkillMapping`, lesson objectives and skill fields; `src/lib/content/service.ts` | Reusable building blocks exist, but full authoring/coverage validation and analytics are not verified. |
| Lifecycle and student visibility | `LessonDraft`, `ContentReview`, workflow states, `src/lib/content/lessons.ts`, `src/lib/content/access.ts`, `src/lib/learning.ts` | Draft → review → approval → publish and teacher preview are implemented for lessons. Student course queries filter published courses/modules/lessons. Whole-curriculum workflow parity is not demonstrated. |
| Sequencing and locks | `ContentPrerequisite`, `ContentRelease`, `ContentOverride`; `src/lib/content/access.ts`, `src/lib/learning.ts` | Prerequisites, scheduled/sequential/teacher release, and override paths exist. Required-vs-optional lesson semantics and cycle-safe authoring are not fully surfaced/validated. |
| Versioning | curriculum/course versions and `ContentVersion`; `src/lib/content/versions.ts` | Versions exist, but lesson snapshot coverage is limited to title, goal, and blocks; it does not freeze every related content type. Full restore/release workflow is unverified. |
| Activities and subjects | Existing `Activity`/attempts, `Vocabulary`, `GrammarContent`, reading/listening/speaking/writing content and skill links | The requested subject matter is represented by existing types rather than requiring a second content store. Full cross-type curriculum authoring is not demonstrated. |
| Assessments/question bank | `Assessment`, `Question`, `AssessmentQuestion`, `QuestionBankMeta`, `QuestionVersion`, quality/analytics models and `/teacher/questions` | Question authoring, filtering, tags/meta, difficulty, review states, assessment types and statistics foundations exist. Quality lifecycle and evidence sufficiency have not been acceptance-tested. |
| Books | `Book`, `BookVersion`, `BookContentNode`; `src/lib/books/service.ts` | Book metadata and hand-authored nodes exist. There is no end-to-end book file importer. |
| Evidence/adaptation | `LearningEvent`, `StudentSkillState`, `DiagnosticProfile`, `PlacementResult`, adaptive sessions; `src/lib/assessment/intelligence/diagnostic.ts`, `placement.ts`, `adaptive.ts` | Diagnostic evidence and basic recommendations exist. Placement is a percent-threshold mapping, not a verified multi-skill/confidence model; adaptive selection is simple adjacent difficulty selection and currently diagnostic-only. |
| Existing demos | Phase 20 report documents original, tagged fixture/demo records; Pre-A1 source includes firefighter examples. | Protected DB contains prior Phase 20 changes. No Phase 23 demo write or DB inspection was done. Dedicated Phase 23 firefighter/day-worker mini-curricula and reporting isolation remain unverified. |

## Phase 23 changes made
1. **Placement override scope guard.** `src/app/api/assessments/placement/override/route.ts` now calls `assertStudentInScope` before the override service. This blocks teachers from changing a student outside their assigned group; admins remain permitted by the existing helper. Typecheck passed after this change. No endpoint integration test against a database was run.
2. **Write-free import preview foundation.** Added `src/lib/books/import-preview.ts`: CSV (quoted fields/newlines) and structured JSON decoding; strict row validation; duplicate-key, missing-parent, self-parent and cycle checks; content rows require source, rights note and explicit submitter rights confirmation; proposed results are always `DRAFT`; the function explicitly performs no DB writes. XLSX requires a separately supplied decoder because the project has no workbook parser dependency.
3. Added `scripts/test-book-import-preview.ts` and `test:book-import-preview` npm script. Tests passed for CSV quoting, draft-only previews, rights-required behavior, explicit false, cycles and XLSX refusing to proceed without a decoder.

This preview utility is deliberately not connected to an upload/API, existing `ImportBatch`, `Book` creation, node mapping, review queue, or version preservation; therefore it is an architectural slice, not a delivered import workflow.

## Acceptance coverage matrix (24 criteria)
Legend: **Existing** = source code evidence located; **Partial** = foundation present but acceptance not demonstrated; **Blocked** = requirement absent or not safe to certify.

| # | Criterion | State | Evidence / gap |
|---:|---|---|---|
| 1 | Audit and reuse existing data structures | Existing | Schema/source audit above; no replacement architecture. |
| 2 | Teacher/admin curriculum and lesson authoring | Partial | Teacher content builder and admin curriculum pages/API exist; full requested scope not verified. |
| 3 | Course/module/unit/lesson hierarchy and reorder/duplicate | Partial | Hierarchy and curriculum duplication exist; reorder and lossless deep duplication across all related types not demonstrated. |
| 4 | Draft/review/approval/publish/archive lifecycle | Partial | Lesson workflow is implemented; whole hierarchy lifecycle/archive equivalence is not proven. |
| 5 | Objectives, prerequisites, required/optional, sequence/flexible controls | Partial | Objective/prerequisite/release models and service actions exist; required/optional behavior and cycle validation are incomplete/unverified. |
| 6 | Student preview and safe draft testing | Partial | Preview route/page exists; end-to-end draft assessment sandbox not certified. |
| 7 | Evidence-derived progress per student and skill | Partial | Diagnostic answers become per-skill observed evidence; full coverage across all activity types and quality/recency weighting is not verified. |
| 8 | CEFR-aligned level with confidence and no certification claim | Blocked | Placement maps overall percentage only; no confidence/sample adequacy stored/displayed. Placement stops at C1 although seed level catalog includes C2. |
| 9 | Adaptive placement, “Estimated Level,” teacher override/reason | Blocked | Basic adaptive diagnostic exists, but placement is not adaptive, student label is “Recommended starting level,” no confidence, and there is no placement-flow acceptance test. Override reason exists; group-scope guard was added. |
| 10 | Configurable level transitions | Partial | Org level access policy/configuration exists; transition rules are not certified as a content-release policy. |
| 11 | Original Pre-A1 demo curriculum | Partial | Existing Pre-A1 seed course exists; Phase 23 demo isolation and reporting are not verified. |
| 12 | Original firefighter-English mini-curriculum | Blocked | Firefighter vocabulary/examples exist in Pre-A1 material; a separately marked, bounded mini-curriculum is not evidenced. |
| 13 | Original day-worker mini-curriculum | Blocked | No dedicated day-worker curriculum was found. |
| 14 | Question bank, tags and difficulty | Partial | Existing question bank/meta/tags/difficulty and filters; whole-bank authoring and tag coverage not tested. |
| 15 | Quiz/exam/practice separation and quality analytics | Partial | Registry explicitly separates practice from quiz/exam; item-quality analytics structures exist, but sample-size safeguards/real analytics need acceptance tests. |
| 16 | Content review, validation and publishing safeguards | Existing/Partial | Lesson quality checks, review and confirmation before publish exist; coverage across all content kinds not verified. |
| 17 | Version preservation | Partial | Course/curriculum/question/book version structures exist; end-to-end immutable restore and complete snapshot coverage are not verified. |
| 18 | Recommendations and teacher analytics | Partial | Student review/recommendation and content/assessment analytics pages/services exist; usefulness, skill evidence, and demo exclusion are not verified. |
| 19 | Lawful CSV/XLSX/JSON/structured book import with preview/mapping/review/versioning | Blocked | New preview helper supports CSV/JSON and injected XLSX decoder only; no UI/API, mapping wizard, draft creation, review, or version-preserving commit. No copyrighted content imported. |
| 20 | Individual learning path, weak-skill recommendations, review queue, daily UI | Partial | Student plan/review/learning pages and evidence services exist; daily learning flow and end-to-end weak-skill correctness not validated. |
| 21 | Dependency locks and teacher override | Partial | Existing lock and override records/query behavior exist; coverage and auditability not fully tested. |
| 22 | Content search and duplicate suggestions | Partial | Library search exists; duplicate suggestions/near-duplicate review are not evidenced. |
| 23 | Teacher/student onboarding, responsive authoring, mascot reactions | Partial/Blocked | Existing student mascot reactions are visible on dashboard; no authoring reactions or Phase 23 onboarding acceptance evidence. Mobile/responsive authoring was not device-tested. |
| 24 | AI drafts labeled and held from student access until teacher review | Existing/Partial | AI draft service records labeling and does not publish the model response; complete access isolation across all student views is not acceptance-tested. |

## Blockers and required fixes
| Severity | Affected module | Root cause | Required fix / evidence to close |
|---|---|---|---|
| **Critical — release/security** | Web platform dependencies | `npm audit` reports one critical production dependency issue in Next.js; the supported fix shown by audit is a major framework upgrade. | Security owner must identify the applicable advisory, upgrade in an isolated branch, run compatibility/security tests, then stage and deploy through normal review. Do not blindly apply a major upgrade during this content phase. |
| **High — learner assessment** | Placement | Percent-only thresholds, no adaptive placement sequence, no skill profile/confidence evidence, C1 ceiling, no explicit Estimated Level experience. | Implement and calibrate a multi-skill placement blueprint with sufficient question pool, confidence/coverage reporting, C2 handling only if valid evidence exists, transparent “Estimated Level” label, student flow and teacher override audit tests. Keep CEFR wording non-certifying. |
| **High — demos/reporting** | Demo curricula and analytics | Dedicated day-worker/firefighter demo packs are absent; demo marker is surfaced on assigned-course output but content/teacher analytics queries do not consistently exclude demo data. | Create small original draft fixtures in a segregated, disposable environment; mark `isDemo`; explicitly filter real-content reporting; test that fixture scores never appear as real outcomes. Do not write to `prisma/dev.db`. |
| **High — book import** | Books/content import | Preview-only utility has no upload route, XLSX parser, mapping UI, draft commit, review/version integration or rights review workflow. | Add isolated upload staging/preview, strict size/format limits, parser review, mapping and validation, user rights attestation plus human review, draft-only commit, version snapshots and safe integration tests. |
| **High — curriculum acceptance** | Curriculum authoring | Existing workflows cover much of lesson authoring but full reorder/deep duplicate, cross-type objectives, optionality and safe draft test behavior are not acceptance-proven. | Complete the builder interactions and validation using existing models; add isolated CRUD/review/publish/visibility tests covering original lesson structures and rollback. |
| **High — content data quality** | Question bank/content analytics | Quality/statistics foundations exist, but sample-size, demo separation, tagging coverage and recommendation quality are unverified. | Add deterministic tests with synthetic isolated data only; label insufficient samples, keep recommendations evidential, and prove demo/real separation. |
| **High — QA/deployment** | Phase 23 release | No staging/isolated DB integration run, migration restore rehearsal, responsive-device QA, or complete acceptance suite was performed. | Provision disposable/staging DB from a validated snapshot; rehearse migration and restore, execute acceptance tests with fixture markers, and retain logs. Never target protected `prisma/dev.db`. |

## Verification log
- `npm ci --ignore-scripts` — completed; npm reported 7 vulnerabilities overall (1 critical, 6 high).
- `npx prisma generate` — passed against schema only.
- `npx prisma validate` — passed; no database mutation.
- `npm run typecheck` — passed.
- `npm run test:book-import-preview` — passed, explicitly write-free.
- `npm audit --omit=dev` — 2 production dependency findings: 1 critical, 1 high.
- No full application build, browser workflow, database integration, restore/migration test, or end-to-end Phase 23 suite was run.

**Conclusion:** substantial reusable LMS infrastructure is present and the two incremental changes passed local static/pure-function checks. The 24-item request is not complete. Do not report the engine as ready or use the protected local database for further work.