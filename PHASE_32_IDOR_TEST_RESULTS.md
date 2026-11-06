# PHASE 32 — IDOR / Object-Level Authorization Test Results

**Date:** 2026-10-25
**Result: 50 of 50 live HTTP cases passed (0 failed).** Plus 15 helper-level checks, 20 storage, 22 backup — all passing.

## How these were tested (and why the earlier "verified" claim was wrong)

Previous Phase 32 reported "15 passed, IDOR VERIFIED" from `scripts/test-idor-simple.mjs`, which only **greps source files for expected code patterns**. That is not proof a route is safe, and in this case it concealed three real problems:

1. `src/lib/communication/messages.ts:301` had a **syntax error**, so the application did not compile at all (`tsc` and `next dev` both failed).
2. `SessionUser` had **no `organizationId` field**, so every `viewer.organizationId && ...` tenant check evaluated `undefined` and silently passed.
3. Real cross-tenant requests returned **200 with another tenant's data** (four separate routes).

The new suite fixes the method: it authenticates through the real `POST /api/auth/login`, then drives the real route handlers over HTTP against an isolated database seeded with two synthetic tenants. Nothing is mocked.

## Environment

| Item | Value |
|---|---|
| App | `next dev` on `127.0.0.1:4032`, source compiled normally |
| Database | `e2e/e2e.db` — an isolated **copy** of `prisma/dev.db` (source untouched, hash verified) |
| Storage | `e2e/storage` (local adapter), synthetic files |
| Tenants | `E2E_ALPHA` (a) and `E2E_BRAVO` (b) |
| Users per tenant | admin, super admin, teacher, 2 learners = 10 accounts |
| Seed records per tenant | 1 level, 1 class/group, 1 course, 1 module, 1 lesson, 1 assigned exam, 1 homework, 1 class session + attendance, 1 private PDF, 1 conversation + private attachment |
| Auth | real login (`e2e.admin.a`, `e2e.teacher.a`, … / test-only password) |
| Runner | `node scripts/test-idor-live.mjs` → `e2e/live-results.json` |

## Allowed operations — must keep working (Phase 32H)

| ID | Case | Expected | Actual | |
|---|---|---|---|---|
| L01 | admin A lists users in own tenant | 200 | 200 | PASS |
| L01b | list contains no tenant-B user | clean | clean | PASS |
| L02 | admin A reads own learner | 200 | 200 | PASS |
| L03 | teacher A reads learner in assigned group | 200 | 200 | PASS |
| L04 | admin A reads own organization | 200 | 200 | PASS |
| L05 | teacher A downloads own tenant media | 200 | 200 | PASS |
| L06 | student A downloads own message attachment | 200 | 200 | PASS |
| L07 | admin A views backup status | 200 | 200 | PASS |
| L08 | student A records progress on own lesson | 200 | 200 | PASS |
| L09 | teacher A saves attendance on own session | 200 | 200 | PASS |
| L10 | teacher A publishes own homework | 200 | 200 | PASS |
| L11 | teacher A opens own exam builder | 200 | 200 | PASS |
| L12 | admin A renames own class | 200 | 200 | PASS |
| L13 | admin A edits own learner | 200 | 200 | PASS |
| L14 | admin A exports own course | 200 | 200 | PASS |
| L15 | **SUPER_ADMIN** crosses tenants (intended exception) | 200 | 200 | PASS |

The SUPER_ADMIN exception is audited: two `CROSS_TENANT_ACCESS` rows exist in `audit_logs` with metadata `{context, actorOrg, targetOrg}` only — no PII, no tokens.

## Denied operations — another tenant's objects

| ID | Case | Expected | Actual | |
|---|---|---|---|---|
| D01 | admin A → tenant-B learner profile | 404 | **404** (was 200) | PASS |
| D02 | teacher A → tenant-B learner | 404 | 404 | PASS |
| D03 | admin A → tenant-B admin profile | 404 | **404** (was 200) | PASS |
| D04 | teacher A → unassigned tenant-B teacher | 404 | 404 | PASS |
| D05 | organization list excludes tenant B | 1 org | 1 org | PASS |
| D06 | admin A patches tenant-B organization | 403/404 | 403 | PASS |
| D07 | admin A patches tenant-B class | 404 | **404** (was 200) | PASS |
| D08 | teacher A patches tenant-B class | 403 | 403 | PASS |
| D09 | teacher A opens tenant-B exam builder | 404 | 404 | PASS |
| D10 | admin A opens tenant-B exam builder | 404 | **404** (was 200) | PASS |
| D11 | teacher A publishes tenant-B homework | 404 | 404 | PASS |
| D12 | teacher A writes tenant-B attendance | 404 | 404 | PASS |
| D13 | teacher A exports tenant-B course | 404 | 404 | PASS |
| D14 | admin A exports tenant-B course | 404 | **404** (was 200) | PASS |
| D15 | student A records progress on tenant-B lesson | 404 | 404 | PASS |
| D16 | teacher A downloads tenant-B private media | 404 | 404 | PASS |
| D17 | admin A downloads tenant-B private media | 404 | 404 | PASS |
| D18 | student A downloads tenant-B attachment | 404 | 404 | PASS |
| D19 | teacher A downloads tenant-B attachment | 404 | 404 | PASS |
| D20 | learner self-promotes to ADMIN | 403 | 403 | PASS |
| D21 | teacher assigns itself SUPER_ADMIN | 403 | 403 | PASS |
| D22 | admin A grants SUPER_ADMIN to tenant-B user | 403 | 403 | PASS |
| D23 | learner grants itself a temporary permission | 403 | 403 | PASS |
| D24 | teacher creates a database backup | 403 | 403 | PASS |
| D25 | learner creates a database backup | 403 | 403 | PASS |
| D26 | teacher lists backup artifacts | 403 | 403 | PASS |
| D27 | teacher starts a restore drill | 403 | 403 | PASS |
| D28 | admin A bulk-suspends tenant-B users | 404 | **404** (was 422, request reached `updateMany`) | PASS |
| D29 | admin A creates user with spoofed tenant-B org id | refused / stays in A | **409** duplicate (earlier run: **201 with `organizationId = tenant A`**) | PASS |
| D30 | teacher reads tenant-B role matrix | 403 | 403 | PASS |
| D31 | unauthenticated user list | 401 | 401 | PASS |
| D32 | unauthenticated private media | 401 | 401 | PASS |
| D33 | unauthenticated tenant-B attachment | 401 | 401 | PASS |
| D34 | unauthenticated backup list | 401 | 401 | PASS |

**Causal evidence** — the same request, same ids, before and after the fix: D01 200→404, D03 200→404, D07 200→404, D10 200→404, D14 200→404, D28 422→404, D29 `org=B`→`org=A`. The 404s come from the new tenant checks, not from missing routes (the same routes returned 200 for the owning tenant).

## Vulnerabilities found and fixed

| # | Severity | Vulnerability | Fix |
|---|---|---|---|
| 1 | **CRITICAL** | Application did not compile — `messages.ts:301` unbalanced parens; every route returned 500 | rewrote the `findUnique` call |
| 2 | **CRITICAL** | `SessionUser` carried no `organizationId`; all tenant conditions were no-ops | field added + selected in `getSessionUser`; callers resolve from DB |
| 3 | **CRITICAL** | `userInScope` treated any ORGANIZATION `users.view` grant as global (D01/D03) | compare target `organizationId`; SUPER_ADMIN audited |
| 4 | **CRITICAL** | `PATCH /api/groups/[id]` had no tenant check (D07) | `assertTenant(actor, group.organizationId)` + teacher tenant validation |
| 5 | **CRITICAL** | `canEditCourse` returned `true` for any ADMIN (D14) | tenant derived from `Course → Level` |
| 6 | **CRITICAL** | `assertAssessmentAccess` ADMIN branch read the missing session field (D10) | org resolved from DB before comparing |
| 7 | **HIGH** | `bulkUsers` ran `updateMany`/`notifyUsers` on client-supplied ids (D28) | `filterUsersInTenant` runs before every branch; group/course targets tenant-checked |
| 8 | **HIGH** | New accounts were placed in `ensureIdentity()`'s first org, not the actor's (D29) | org from actor; group must match tenant |
| 9 | **HIGH** | `ensureIdentity()` re-assigned **every** null-org user/group to the first org on each call | backfill only while a single organization exists |
| 10 | **HIGH** | Files with `organizationId = NULL` skipped the tenant check entirely | fail closed when >1 organization (SUPER_ADMIN excepted) |

## Residual / not verified

- **Staging PostgreSQL: NOT TESTED.** No PG instance exists, so the same suite has not run against PG. All results above are SQLite (dev-parity) only.
- **S3: NOT TESTED.** Local adapter only. Signed-URL scope/lifetime, bucket policy and object-listing behaviour remain unverified.
- **Any tenant ADMIN can create/list database backups** (shared-DB platform operation). Role-gated but not tenant-scoped; accepted as a documented risk, not a code defect (see final report §11).
- **Lesson progress (L08) only passes with level-access context present** — the fixture sets it. A learner without `englishLevel`/policy is correctly denied; that path was not exercised.
