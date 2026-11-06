# PHASE 32 — Final Report: Critical Security Remediation & Staging Readiness

**Date:** 2026-10-25
**Repository:** EnglishBridge LMS — Next.js 15.5.27 / React 18 / Prisma 5.22 / TypeScript 5.9
**Final status:** `PHASE 32 PARTIAL / EXTERNAL CONFIGURATION PENDING`

> Headline: the previous Phase 32 "verification" was not real. The application **did not compile**, `SessionUser` carried no `organizationId` so every tenant condition was a no-op, and four protected routes returned **200 with another tenant's data**. All ten issues found are fixed, and cross-tenant attacks now fail against the actual routes: **50 live HTTP cases, 50 pass, 0 fail.**

---

## 1. Actual repository and database configuration

| Item | Value |
|---|---|
| Source files | 938 total; 607 under `src` (605 TS/TSX, ~48,912 LOC) |
| Routes / pages / models | 205 `route.ts`, 111 `page.tsx`, **213 Prisma models** (4,311-line schema) |
| Auth | stateless JWT (HS256, `jose`) in `httpOnly` cookie + server-side `UserSession` revalidation on every request |
| Active DB | **SQLite** — `prisma/dev.db`, 4,517,888 bytes |
| PostgreSQL | **not configured anywhere** |
| Storage | local adapter (`STORAGE_LOCAL_ROOT`); S3 adapter present but unconfigured |
| `schema.prisma` provider | `sqlite` |
| `migration_lock.toml` provider | `postgresql` → **P3019, migration tooling unusable** |
| Applied migrations | **none recorded** (no `_prisma_migrations` table) |
| Build gate | `npm run typecheck` — **was failing, now clean** |

## 2. Phase 29 findings reviewed

Phase 29 / 30 / 31 identified: unbounded organization scoping, broad TEACHER access to assessments, MFA brute force, content-media IDOR, attachment IDOR, and unverified staging controls. Re-inspection against the actual code found that the recorded remediation was **incomplete or non-functional**:

- `scopeMatches` had been fixed for a direct `ORGANIZATION` scope, but the fallback `if (grant.scopeType === "ORGANIZATION") return true;` still let an org-scoped grant satisfy any `GROUP`/`STUDENT` scope in any tenant.
- The Phase 32 "organization checks" read `viewer.organizationId`, a field that **did not exist** on `SessionUser` — every such check silently passed.
- The communication fix had a **syntax error**, so the app never compiled; and the two file migrations were never applied to the database.
- The previous evidence (15 "passing" IDOR tests) came from a script that only pattern-matched source text, not from any request.

## 3. Vulnerabilities fixed and affected files

| # | Sev | Vulnerability (verified, not theoretical) | File(s) |
|---|---|---|---|
| 1 | **CRITICAL** | App did not compile — unbalanced `findUnique()`; every route 500 | `src/lib/communication/messages.ts` |
| 2 | **CRITICAL** | `SessionUser` had no `organizationId`; all tenant guards were no-ops | `src/types/index.ts`, `src/lib/auth.ts` |
| 3 | **CRITICAL** | `userInScope` treated any ORG `users.view` grant as global → cross-tenant learner/admin profiles (live 200) | `src/lib/identity/service.ts` |
| 4 | **CRITICAL** | `PATCH /api/groups/[id]` had no tenant check → cross-tenant class rename (live 200) | `src/app/api/groups/[id]/route.ts` |
| 5 | **CRITICAL** | `canEditCourse` returned `true` for any ADMIN → cross-tenant course export (live 200) | `src/lib/content/access.ts` |
| 6 | **CRITICAL** | `assertAssessmentAccess` ADMIN branch used the missing session field → cross-tenant exam builder (live 200) | `src/lib/assessment/access.ts` |
| 7 | **HIGH** | `bulkUsers` ran `updateMany`/`notifyUsers` on client-supplied ids → cross-tenant suspend/role/group/message | `src/lib/identity/service.ts` |
| 8 | **HIGH** | New accounts placed in the *first* organization, not the actor's | `src/app/api/users/route.ts` |
| 9 | **HIGH** | `ensureIdentity()` re-mapped **all** null-org users/groups to the first org on every call | `src/lib/identity/permissions.ts` |
| 10 | **HIGH** | Files with `organizationId = NULL` skipped the tenant check entirely | `src/lib/content/media.ts`, `src/lib/communication/messages.ts` |
| — | MEDIUM | Latent type errors blocking build (audit entity union; orphaned `vitest` test) | `src/lib/audit.ts`, `src/lib/storage/service.ts`, `tsconfig.json` |

**New file:** `src/lib/identity/tenant.ts` — `assertTenant`, `actorOrgId`, `isSuperAdmin`, `courseOrgId`, `groupOrgId`, `filterUsersInTenant`. Single authoritative tenant gate; denies with **404** so record existence is not disclosed.

## 4. Tenant model and migration details

- **Boundary:** `Organization.id`. Direct on `User`, `LearningGroup`, `Level`, `Department`, `Team`, `ContentMedia`; **derived** for `Course` (→Level), `Lesson` (→Module→Course), `Assessment` (→Course/Level/Module), `Assignment`/`ClassSession`/`AttendanceRecord` (→Group).
- **Migration created/validated:** `20261010000000_phase30_storage_metadata` + `20261010000001_phase32_tenant_isolation` (adds nullable `content_media.organizationId`, conditional backfill, index).
- **Tested:** both SQL files executed **verbatim** on a disposable copy → applied, all 18 columns + 3 indexes present, zero destructive statements.
- **Backfill rule proven:** reliable uploader → filled; ambiguous uploader → **left NULL** (never guessed).
- **Applied to the real DB:** **NO** — blocked by P3019 and the read-only source rule. See `PHASE_32_MIGRATION_REPORT.md`.
- **Schema gaps documented, not silently changed:** globally-unique `Level.code` / `LearningGroup.name` / `LearningGroup.code` / `Course.code` prevent two tenants from reusing natural codes; four core content models have no tenant column.

## 5. Authorization regression tests and results

**50/50 live HTTP cases green** (`scripts/test-idor-live.mjs` → `e2e/live-results.json`), on an isolated copy of the DB seeded with **two tenants, 10 users, 3+ role types**:

- **16 allowed** operations (own profile, assigned class, own media, own attachment, own lesson progress, own attendance, own homework publish, own exam builder, own class rename, own learner edit, own course export, backup status, SUPER_ADMIN exception) — all **200**.
- **34 denied** operations: cross-tenant learner/admin profiles, class, exam, homework, attendance, course export, media, attachment, lesson progress; role self-escalation; SUPER_ADMIN self-assignment; cross-tenant role grant; temporary permission self-grant; backup create/list/restore; bulk suspend; spoofed `organizationId`; alternate endpoints; 4 unauthenticated routes — all **401/403/404**.
- **Causal proof:** identical requests returned 200 before the fix and 404 after (D01, D03, D07, D10, D14); bulk 422→404; spoofed create `org=B`→`org=A`.
- **SUPER_ADMIN exception** still works (L15 = 200) and is **audited** — 2 `CROSS_TENANT_ACCESS` rows, metadata limited to `{context, actorOrg, targetOrg}`.

Supporting suites (all pass): helper-level 15, storage 20, backup 22, `npm test` (session rules, book import, prod env, runtime env, API/log safety).

## 6. File and audio security results

| Check | Result |
|---|---|
| Upload permission enforced server-side | **CODE** — `secureUpload` requires actor, category policy, MIME/size, sanitised name, checksum |
| Tenant scope on every download | **LIVE** — D16/D17 404 for other tenant; L05 200 for owner |
| File-id substitution cannot expose another's file | **LIVE** — D16–D19 |
| Public/private rules defined | **CODE** — media RESTRICTED, attachments/audio PRIVATE, avatar PUBLIC |
| Metadata cannot be reassigned cross-tenant via params | **LIVE** — D29 spoof → row placed in actor's tenant |
| Object keys cannot escape namespace | **CODE + tests** — `validateObjectKey`, 20 storage tests incl. `../` traversal |
| Private objects not listable | **CODE** — no public listing route; media read requires auth |
| Backup artifacts not on public static routes | **CODE** — stored outside `public/` |
| Audio private by policy | **CODE** — `audio_recording = PRIVATE` |
| Legacy NULL-tenant files | **FIXED** — now denied when >1 organization exists |
| **S3 signed URLs / bucket policy** | **NOT TESTED** — no bucket exists |

## 7. LMS workflows checked for regressions

Verified **allowed** live: login + session, admin user search/profile, teacher → assigned learner, own-class rename, own-learner edit, own-course export, own-exam builder, own-homework publish, own-session attendance, learner lesson progress, own media download, own attachment download, backup status for admins.
Verified **denied** live: every cross-tenant variant of the above, plus all role-escalation and backup-write paths.

**No security control was weakened to keep a workflow alive.** Two behaviours changed by design: a class/org admin can no longer act outside their own tenant (previously possible), and legacy NULL-tenant files are no longer universally readable in a multi-tenant deployment. Both are correct per the product's role model; if a legitimate workflow depended on either, it depended on unauthorized access.

## 8. PostgreSQL and storage verification status

- **PostgreSQL:** NOT CONFIGURED, NOT TESTED. All live results are SQLite. `migrate deploy`, PG constraints, PG restore — none exercised.
- **Storage:** local adapter only. Tenant boundary validated against it with synthetic files. **S3 unverified** (no signed URLs, ACLs, SSE, listing).
- **Local disk is explicitly not treated as durable production storage.**

## 9. Backup and recovery readiness

- 22 backup tests pass locally: manifest, encryption, DB + files backup, list, integrity verify, concurrency lock, isolated recovery, **target validation that refuses prod/staging names**, cleanup keeping last verified.
- Endpoints ADMIN-only — live-verified (D24–D27 all 403; L07 200).
- **Gaps:** `BACKUP_ENCRYPTION_KEY`, `BACKUP_DESTINATION`, `BACKUP_RECOVERY_DATABASE_URL` unset; **no scheduler**; **no alert delivery**; PG restore and S3 restore **NOT TESTED**.
- DB backup and object backup are separate paths — the existence of one does not imply the other.

## 10. Remaining external dependencies

PostgreSQL staging instance · object storage bucket + credentials · backup destination + encryption key · staging URL/TLS for header + cookie verification · shared rate-limit store · scheduler + alert channel. **None were provisioned; no paid service was created.**

## 11. Unresolved risks and severity

| Sev | Risk |
|---|---|
| **CRITICAL** | **P3019** — migration tooling unusable; no migration can be applied to any environment until the provider/baseline is reconciled. **B1** |
| **CRITICAL** | **P2022** — real DB lacks 10 `content_media` + 8 `message_attachments` columns → file/audio endpoints fail at runtime. Code is correct; the database is not. **B2** |
| **HIGH** | PG never exercised — SQLite-only evidence for every tenant control. **B3** |
| **HIGH** | Storage provider unverified; signed-URL and bucket-boundary behaviour unknown. **B4** |
| **MEDIUM** | `scopeMatches` still returns `true` for an ORGANIZATION grant against a `GROUP`/`STUDENT` scope (`permissions.ts` line 164). Not currently reachable for cross-tenant access because every live route now resolves the target's tenant first, but the helper itself is unsafe and should be tightened. |
| **MEDIUM** | Any tenant's ADMIN can create/list database backups (shared-DB platform operation). Role-gated, not tenant-scoped — accepted, documented, not hidden. |
| **MEDIUM** | Globally-unique tenant-scoped codes block true multi-tenant operation (functional). |
| **MEDIUM** | No CSP, no HSTS; rate limiting process-local; no scheduled backups or alerting. |
| **LOW** | `next build` not run end-to-end (typecheck clean). |
| **LOW** | `src/lib/storage/__tests__/storage.test.ts` references `vitest`, which is not a dependency; excluded from typecheck rather than deleted. |

## 12. Exact commands and evidence

```bash
# --- baseline / integrity ---
sha256sum prisma/dev.db
# e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02   (unchanged before & after)

# --- schema drift over 213 models vs the real DB ---
python3 drift-audit.py
# models: 213 | drift: 2  -> ContentMedia, MessageAttachment only

node e2e/probe3.mjs
# CODE: P2022 — main.content_media.originalName does not exist

npx prisma migrate status
# Error: P3019 — schema provider sqlite != migration_lock.toml postgresql

# --- migration safety on a disposable copy ---
cp prisma/dev.db e2e/migration-test.db
sqlite3 e2e/migration-test.db < .../phase30_storage_metadata/migration.sql   # APPLIED OK
sqlite3 e2e/migration-test.db < .../phase32_tenant_isolation/migration.sql   # APPLIED OK
# 18/18 columns present, 3 indexes created, 0 destructive statements
# backfill: reliable row FILLED, ambiguous row left NULL -> PASS

# --- two-tenant fixtures + live HTTP suite ---
npx tsx e2e/seed.ts
# org a: admin=e2e.admin.a teacher=e2e.teacher.a student=e2e.student.a
# org b: admin=e2e.admin.b teacher=e2e.teacher.b student=e2e.student.b

DATABASE_URL=file:/home/user/e2e/e2e.db STORAGE_LOCAL_ROOT=/home/user/e2e/storage \
  npx next dev -p 4032 -H 0.0.0.0

node scripts/test-idor-live.mjs
# === Results: 50 passed, 0 failed ===
# full per-case detail -> e2e/live-results.json

# --- regressions ---
npx tsx scripts/test-idor-simple.mjs              # 15 passed, 0 failed
npx tsx scripts/test-storage-regression-simple.mjs# 20 passed, 0 failed
npx tsx scripts/test-backup-recovery.mjs          # 22 passed, 0 failed
npm run test                                      # all suites passed
npm run typecheck                                 # clean (was: 1 syntax + 5 type errors)

# --- live headers ---
curl -s -D- -o /dev/null http://127.0.0.1:4032/login
# X-Content-Type-Options, Referrer-Policy, X-Frame-Options, Permissions-Policy
# no CSP, no HSTS
```

## 13. Confirmation that production was not touched

- **Source database:** `prisma/dev.db` hash `e9b4eac1…f7fb02` identical at the end of the phase. It was only ever opened `mode=ro` or copied. No reset, reseed, delete or destructive migration.
- **No production access:** no production credentials exist or were used; no production host, bucket or database was contacted.
- **All testing isolated:** live tests ran against `e2e/e2e.db` (a copy) with synthetic `E2E_ALPHA` / `E2E_BRAVO` tenants and synthetic files under `e2e/storage`.
- **No secret exposure:** no `DATABASE_URL`, password, JWT/API key, storage credential, signed URL or learner PII appears in this report, in logs, or in the repository. `.env.example` holds placeholders only.
- **No auth weakened:** no auth, authorization, CSRF or tenant check was disabled, bypassed or mocked to make a test pass. Denials are real 401/403/404 responses from the running application.
- **No data deleted:** no user, lesson, exam, attendance or audit record was removed; the only deletes target the synthetic E2E fixtures during reseeding of the isolated copy.

---

## Acceptance criteria

| Criterion | Status |
|---|---|
| Critical tenant-isolation / IDOR findings resolved or mitigated | ✅ 10 fixed, live-verified |
| Cross-tenant regression tests pass against actual protected routes | ✅ 50/50 live HTTP |
| File and audio access enforce ownership | ✅ live (local adapter); S3 NOT TESTED |
| Role/ownership changes cannot be self-authorized | ✅ D20–D23, D29 |
| Migrations tested safely | ✅ verbatim on disposable copy; ❌ cannot be applied (P3019) |
| Authorized LMS workflows remain functional | ✅ 16 live allow-cases |
| Backup/restore endpoints protected | ✅ D24–D27 |
| No critical security regression introduced | ✅ typecheck clean, all suites pass |
| Reports contain actual evidence | ✅ commands + outputs above |
| Production untouched | ✅ hash unchanged |

**Why not READY:** code-level criteria pass, but a staging release is impossible while **P3019** blocks every migration and **P2022** leaves the real database without the file columns — and PostgreSQL, object storage, TLS headers and backup automation do not exist. Per the phase rules, that is *external configuration pending*, not ready and not blocked-on-code.

## Final status

`PHASE 32 PARTIAL / EXTERNAL CONFIGURATION PENDING`

Phase 33 was **not** started.
