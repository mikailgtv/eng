# Phase 28.4 — Database Security Report

**Assessment date:** 2026-10-08  
**Scope:** repository/static controls, Phase 28.3 evidence, active workspace environment. **No Production access or changes.**

## Phase 28.3 gate review

The prior `PHASE_28_3_FINAL_REPORT.md` reports **PASS — STAGING only** and proves 213 tables / 3,716 rows with matching counts and semantic fingerprints, 277 validated FKs, zero orphan rows, 315 unique indexes with no duplicate groups, JSON-text validation, and a local technical PostgreSQL dump/restore. The primary stage and restore were disposable local databases, not a persistent provider staging service. The historical PostgreSQL archive and cluster are no longer present in this workspace.

Five filenames listed by the Phase 28.4 request are absent verbatim; the equivalent Phase 28.3 evidence was reviewed: `PHASE_28_3_INTEGRITY_REPORT.md`, `PHASE_28_3_ROW_COUNTS.md`, `PHASE_28_3_FOREIGN_KEY_REPORT.md`, `PHASE_28_3_APPLICATION_VALIDATION.md`, and `PHASE_28_3_POSTGRES_BACKUP_RESTORE.md`. The phase is sufficient to confirm that the data migration completed, but it does **not** provide a live database for Phase 28.4 runtime hardening. The known slow `/teacher/attendance` cold-development compile and unconfirmed teacher exams/results remain recorded.


## Environment/security status

- Active PostgreSQL staging connection: **NOT CONFIGURED** in the current workspace; PostgreSQL tools, server process, cluster directory, and previous archive are absent. The only current `.env` database scheme is SQLite; its value is not reproduced.
- Historical Phase 28.3 PostgreSQL: **VERIFIED** as PostgreSQL 17.11, local disposable database, direct loopback connection and `public` schema at the time of the rehearsal. Current existence/availability: **NOT VERIFIED**.
- Database security controls (roles, grants, TLS, pool limits, monitoring): **NOT VERIFIED** against a live target.
- Static app controls observed: shared Prisma singleton; server-side environment validation; safe API error envelope; no raw-unsafe Prisma SQL call sites; password hashes use bcrypt; MFA and integration secrets have application-encryption code.

## Architecture found

```text
Browser
  ↓ HTTPS (deployment edge not configured/verified here)
Next.js Web App / server-rendered pages
  ↓ server Route Handlers and server-side services
Prisma singleton (`src/lib/prisma.ts`)
  ↓ Prisma Client / Prisma query engine pool (provider limits not configured/verified)
Database: SQLite by default in `schema.prisma` and local `.env`; PostgreSQL path exists in
`schema.postgresql.prisma` and a versioned baseline, but no active staging endpoint is present.
```

No PgBouncer, managed pool, or database provider was identified. Production topology is **NOT CONFIGURED**. The build pipeline currently invokes default `prisma generate`, which selects the primary SQLite schema unless deployment explicitly overrides it; no such override was found.

## Security findings

| Severity | Finding | Evidence / impact | Required action |
|---|---|---|---|
| HIGH | No live staging DB | Runtime grants, TLS, pool, query plans, concurrency and backup state cannot be measured. | Restore/provision the dedicated STAGING target and inject connection configuration through the deployment secret manager; never send values in chat. |
| HIGH | Runtime/migration/backup role separation not verified | No catalog connection; Phase 28.3 used a disposable import/test identity, not proof of least privilege. | Create separate `application_runtime`, `migration`, `backup`, `readonly_audit` roles on STAGING; capture catalog grants and negative privilege tests. |
| HIGH | PostgreSQL client generation is not selected by the default build | `package.json` build/postinstall use `prisma generate`; default `prisma/schema.prisma` is SQLite. | Add and validate an explicit PostgreSQL generate/build/deploy path before using the PostgreSQL runtime. |
| HIGH | TLS/certificate policy unknown | No endpoint or certificate available to test. | Require provider TLS and verify certificate/hostname through the staging client. |
| MEDIUM | App-level tenant checks are not database RLS | No RLS policies in the PostgreSQL baseline; organization/group scopes are enforced in application code. | Complete tenant-crossing tests and decide whether PostgreSQL RLS is required. |
| MEDIUM | Credential encryption key lifecycle needs review | MFA ciphertext is keyed from `SESSION_SECRET`; integration credential decryption accepts non-versioned plaintext legacy values. | Use versioned dedicated keys, inventory/rotate legacy values, and document key rotation/recovery. |

## Authorization boundary observed

The schema is multi-organization, but the PostgreSQL baseline contains no row-level security policies. Static app examples scope teachers through assigned group IDs (`src/lib/teaching/access.ts`), page routes use role guards (`src/lib/guards.ts`), and workflow access checks an organization and permission (`src/lib/workflows/access.ts`). This is application-layer authorization, not database isolation. Student-own-data, teacher-assigned-class and cross-tenant denial tests were NOT RUN against a live PostgreSQL target.

No application code, database, indexes, roles, or source data were changed in this phase. Detailed findings are in the other 20 reports.
