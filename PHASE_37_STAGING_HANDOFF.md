# Phase 37 — Organizational Staging Handoff

**Phase 37 verdict:** `PHASE 37 BLOCKED / ORGANIZATIONAL STAGING INPUTS MISSING`
**Date:** 2026-10-25
**Nature of this document:** a precise, actionable checklist for the organization. Nothing here is a product defect. Everything here is an input that the repository cannot supply for itself.

---

## 0. How to read this

Phase 37 was authorized to onboard a **real organizational staging environment**. Stage A was executed and found that **none** of the required external inputs exist. Per the phase rules, no local cluster was substituted, no local TLS test was relabelled as staging, and no environment-dependent stage (B–G) was executed.

This handoff lists, for each missing input: **what is needed**, **who owns it**, **the exact action**, **how it will be verified**, and **how it must be handled** so that no secret ever enters the repository, a report, or a chat transcript.

A machine-checkable gate accompanies this document:

```bash
npm run staging:ready          # exits 0 only when every required input is present and structurally usable
```

It performs **no network I/O, no database connection, and no storage write**, and prints **no values** — only `provided` / `absent` and structural findings. Run it before attempting Phase 37 again; it will tell you exactly which items remain.

---

## 0.1 Gate variable reference

Every variable the gate reads, and the check it feeds. Nothing here is a secret; the *values* go
through the approved secure mechanism, never into a file in this repository.

| Variable | Required when | Feeds | Notes |
|---|---|---|---|
| `DATABASE_URL` | always | `DB-1`…`DB-5` | PostgreSQL URL. Must be non-loopback, carry `sslaccept=strict` **and** `sslcert=<CA>`, with `sslmode` ∈ `require`/`verify-ca`/`verify-full`. |
| `BACKUP_TOOLING_DATABASE_URL` | to pass the gate | `TOOL-1`…`TOOL-4` | libpq flavor for `pg_dump`/`pg_restore`: `sslmode=verify-full` + `sslrootcert=<CA>`. Must target the **same** database as `DATABASE_URL`. Must contain **no** `sslaccept`. |
| `BACKUP_RECOVERY_DATABASE_URL` | to pass the gate | `REC-1` | Separate disposable restore target; must be a **different** database from `DATABASE_URL`. |
| `STAGING_AUTHORIZED` | always | `AUTH-1` | Literal `yes`. Only after a named owner has authorized this database. |
| `STAGING_AUTHORIZATION_REF` | always | `AUTH-2` | Ticket/approval reference. Not a secret. |
| `STAGING_OWNER` | always | `AUTH-3` | Team or person accountable for the environment. |
| `STAGING_ENV_CLASS` | always | `ENV-1` | `organizational-staging` or `disposable-staging`. Anything else is refused. |
| `STORAGE_PROVIDER` | always | `STO-1` | Must be `local`. `s3` is blocked while the adapter is unimplemented. |
| `STORAGE_LOCAL_ROOT` | when `STORAGE_PROVIDER=local` | `STO-2` | Existing, writable directory — the staging volume mount point. |
| `STORAGE_DURABILITY_ATTESTED` | when `STORAGE_PROVIDER=local` | `STO-3` | Literal `yes`, **only** after an operator confirms the mount is a persistent volume with a snapshot arrangement. Never inferred from a successful write. |
| `STAGING_APP_BASE` | always | `APP-1` | Deployed staging base URL: HTTPS, non-loopback. |

Dependent checks that cannot run are reported as **`SKIPPED`** with the reason — never omitted and
never silently passed. A run always evaluates all 18 checks.

---

## 1. Missing inputs — the checklist

### ☐ I-1 — Dedicated, non-production PostgreSQL database

| | |
|---|---|
| **Status** | **MISSING** — no staging endpoint exists anywhere in the repository or environment |
| **Owner** | Organization / platform team |
| **Exact action** | Provision a dedicated staging PostgreSQL instance (or database) that is **not** production and **not** shared with production workloads. |
| **Verified by** | Gate check `DB-1`/`DB-2`: a PostgreSQL URL whose endpoint is **non-loopback**. A local disposable cluster is explicitly **not** acceptable as a substitute. |
| **Must not** | Use the production database. Use a local `127.0.0.1` cluster. Use a shared database that other teams depend on. |
| **Secret handling** | Delivered through the approved secure mechanism only. **Never** in this chat, a repository file, a report, or a shell argument that gets logged. |

### ☐ I-2 — Explicit authorization to use it for this phase

| | |
|---|---|
| **Status** | **MISSING** — no authorization exists |
| **Owner** | The named owner of the staging database |
| **Exact action** | Authorize Phase 37 against **this specific database**, in writing, naming: the database, the permitted operations (migrations, backup, restore into a separate disposable DB), and the time window. Record a reference (ticket/approval id — not a secret). |
| **Verified by** | Gate checks `AUTH-1` (`STAGING_AUTHORIZED=yes`), `AUTH-2` (`STAGING_AUTHORIZATION_REF`), `AUTH-3` (`STAGING_OWNER`). |
| **Why it gates everything** | Phase 37 rules forbid migrating an existing staging database until its ownership, isolation, backup, purpose, and authorization are explicitly verified. Without I-2, **Stage C cannot start**. |

### ☐ I-3 — Endpoint and connection configuration

| | |
|---|---|
| **Status** | **MISSING** |
| **Owner** | Organization / platform team |
| **Exact action** | Supply host, port, database name and database user through the approved secure mechanism. |
| **Verified by** | Gate checks `DB-1` … `DB-5`. |
| **Must not** | Be pasted into chat or committed. |

### ☐ I-4 — The actual trusted CA certificate

| | |
|---|---|
| **Status** | **MISSING** — no certificate material exists in the workspace (verified: 0 `.pem`/`.crt`/`.cer`/`.key` files) and no CA path is configured |
| **Owner** | Organization / PKI or DBA |
| **Exact action** | Make the CA certificate that actually signed the staging server certificate available **to the application process** (an approved file path, or the system trust store). Two consumers need it, and they name it differently: `sslcert=<CA>` for Prisma, `sslrootcert=<CA>` for libpq tooling. |
| **Verified by** | Gate check `DB-4` (file exists, is a regular file, is readable) and `TOOL-1`. Then, at Stage B, the live **rogue-CA probe** must show the unrelated CA is **rejected**. |
| **Critical requirement** | The server certificate must chain to this CA **and** carry a SAN matching the endpoint the application actually uses. A certificate for the wrong hostname will (correctly) fail and must not be worked around. |
| **Must not** | Disable verification, use `sslaccept=accept_invalid_certs`, or add an unrelated CA to make a connection succeed. |

### ☐ I-5 — Least-privilege application role

| | |
|---|---|
| **Status** | **MISSING** — no role exists to inspect |
| **Owner** | Organization / DBA |
| **Exact action** | Provide an application role that is **not** a superuser and has no `CREATEDB`, no `CREATEROLE`, no replication privilege, and no `BYPASSRLS`. |
| **Verified by** | Stage B live role-privilege checks (the Phase 35/36 checks: `rolsuper`, `rolcreatedb`, `rolcreaterole`, `rolreplication`, RLS bypass). |
| **Note** | Runtime database access must not use administrative privileges. |

### ☐ I-6 — Separate tooling connection for migration and backup

| | |
|---|---|
| **Status** | **MISSING** |
| **Owner** | Organization / DBA |
| **Exact action** | Supply a tooling connection that is libpq-parseable **for the same database**: `sslmode=verify-full` + `sslrootcert=<CA>`. It must contain **no** `sslaccept` (pg_dump rejects unknown parameters — this was PG-35-03). |
| **Verified by** | Gate checks `TOOL-1` … `TOOL-4`, including that the tooling URL targets the **same database** as the application URL. |
| **Why** | Prisma's URL and libpq's URL cannot be the same string: Prisma needs `sslaccept=strict`; libpq rejects it. libpq's `sslcert` means *client certificate*, not CA. |

### ☐ I-7 — An application deployment target, or an approved way to run it

| | |
|---|---|
| **Status** | **MISSING** — no deployment configuration of any kind exists (no container manifest, no orchestrator config, no target URL) |
| **Owner** | Organization / ops |
| **Exact action** | Either supply the deployed staging application base URL (HTTPS, non-loopback), or explicitly approve running the application against the staging database from a controlled host. |
| **Verified by** | Gate check `APP-1`. |
| **Note** | The probe wiring itself (`livenessProbe` → `/health/live`, `readinessProbe` → `/health`) must be verified **in the orchestrator**, not only at the endpoint. |

### ☐ I-8 — The storage decision, plus the persistent-volume configuration

| | |
|---|---|
| **Status** | **MISSING** — the decision is still open; `PHASE_36_STORAGE_DECISION.md` is unanswered |
| **Owner** | Organization (decision) |
| **Exact action** | Choose **Option A** (persistent local volume) or **Option B** (authorize a full S3-compatible adapter implementation). If A: name the volume, its mount path, the snapshot schedule, and accept the single-instance constraint. If B: name the provider, the disposable **test** bucket, and the secret-manager entries — and treat the adapter as its own phase of work. |
| **Verified by** | Gate checks `STO-1` … `STO-3`. Option A additionally requires an **operator attestation** that the mount is a real persistent volume, because durability **cannot** be proven from inside the process — a successful write only proves the filesystem is writable. |
| **Hard constraint** | `STORAGE_PROVIDER=s3` **cannot be used**: the adapter is a stub and the application refuses to start with it. Do not bypass startup validation. |

---

## 2. Two additional Stage C/F prerequisites (checked at the gate, not by I-1…I-8)

### ☐ C-1 — Non-destructive assessment first

The staging database **must not be assumed empty**. Stage C inspects `_prisma_migrations`, the existing object inventory, and schema drift **read-only** before anything is applied. If the database is not empty, or its purpose is uncertain, Stage C stops and asks.

### ☐ C-2 — An authorized recovery point before any schema change

Before any approved migration, a recoverable state must exist and be authorized. Phase 37 forbids `DROP SCHEMA`, `migrate reset`, `db push`, and any data-loss operation against organizational staging — **regardless** of what the gate reports.

### ☐ C-3 — A separate disposable restore database

Stage F requires a **distinct** disposable target for the restore drill. Pointing the restore at the staging database is refused in code (`resolveRecoveryDatabaseUrl()`), and the gate flags it as `REC-1`.

---

## 3. Exact procedure once the inputs exist

1. **Populate the environment** through the approved secure mechanism (never a repository file).
2. **Run the gate:** `npm run staging:ready` → must exit **0** with every check `PASS`/`ATTESTED`.
3. **Stage B — authenticate the server:** run `node scripts/db/pg-tls-check.mjs` against the application URL. Required: **11 passed / 0 failed**, including `✓ server certificate is actually verified (rogue CA rejected)`.
   **If the rogue-CA probe connects, STOP.** Do not migrate, back up, or run acceptance tests. That is a TLS defect, not a configuration nuisance.
4. **Stage C — assess, then migrate:** read-only assessment first; then `pg-preflight`, then the approved migrations only; then drift check and `pg-verify-structure.mjs` (expect **40/0**).
5. **Stage D — storage:** Option A functional + restart + tenant-isolation + snapshot evidence; durability attested, never inferred.
6. **Stage E — application acceptance:** health probes in the real orchestrator, security regression, sanitized errors, no SQLite fallback.
7. **Stage F — backup and restore:** backup over strict TLS, restore into the separate disposable DB, integrity and tenant checks, cleanup. Report **database and file recovery separately**.
8. **Stage G — operational readiness:** mark anything unverified as BLOCKED, not assumed.

Full step-by-step commands: `_STAGING_RUNBOOK.md` §16–17.

---

## 4. What the organization must NOT send or do

- Do **not** paste connection strings, passwords, private keys, or certificate contents into this chat.
- Do **not** commit credentials to the repository or add them to `.env.example`.
- Do **not** point any Phase 37 work at production.
- Do **not** enable `STORAGE_PROVIDER=s3` to unblock staging — it is refused by design.
- Do **not** ask for TLS verification to be relaxed to make a connection succeed. If the certificate does not verify, the certificate or the CA path is wrong; the answer is the correct certificate, never a weaker check.
- Do **not** substitute a local cluster and call the blocker resolved.

---

## 5. Current gate output (actual, this environment)

```
$ npm run staging:ready
  DB-1    BLOCKED  DATABASE_URL is absent or not a URI
  DB-2    SKIPPED  prerequisite not met: DATABASE_URL is absent or not a PostgreSQL URL
  DB-3    SKIPPED  prerequisite not met: DATABASE_URL is absent or not a PostgreSQL URL
  DB-4    SKIPPED  prerequisite not met: DATABASE_URL is absent or not a PostgreSQL URL
  DB-5    SKIPPED  prerequisite not met: DATABASE_URL is absent or not a PostgreSQL URL
  TOOL-1  SKIPPED  prerequisite not met: BACKUP_TOOLING_DATABASE_URL is absent
  TOOL-2  SKIPPED  prerequisite not met: BACKUP_TOOLING_DATABASE_URL is absent
  TOOL-3  SKIPPED  prerequisite not met: BACKUP_TOOLING_DATABASE_URL is absent
  TOOL-4  SKIPPED  prerequisite not met: BACKUP_TOOLING_DATABASE_URL is absent
  REC-1   SKIPPED  prerequisite not met: DATABASE_URL is absent or not a PostgreSQL URL
  AUTH-1  BLOCKED  no explicit authorization to use the target for Phase 37
  AUTH-2  BLOCKED  no authorization reference
  AUTH-3  BLOCKED  no named owner of the staging environment
  ENV-1   BLOCKED  STAGING_ENV_CLASS must be organizational-staging or disposable-staging
  STO-1   BLOCKED  STORAGE_PROVIDER not set
  STO-2   SKIPPED  prerequisite not met: STORAGE_PROVIDER is not local
  STO-3   SKIPPED  prerequisite not met: STORAGE_PROVIDER is not local
  APP-1   BLOCKED  STAGING_APP_BASE absent — no approved deployment target

=== 18 checks: 0 ready / 7 blocked / 11 skipped ===
BLOCKED: Phase 37 cannot proceed. This is a configuration finding, not a product defect.
```

All 18 checks are always reported. Checks whose prerequisite is absent appear as `SKIPPED` with the
reason, so an unevaluated check can never be mistaken for a satisfied one.

---

## 6. Bottom line

Nothing in this phase is waiting on engineering. The repository is in a verified, healthy state (`npm run typecheck` exit 0, `npm test` exit 0, production build exit 0). What is missing is an environment, an authorization, and one organizational decision.

**The single fastest path to `PHASE 37 PASS` is to satisfy I-1, I-2 and I-4, then re-run `npm run staging:ready`.**
