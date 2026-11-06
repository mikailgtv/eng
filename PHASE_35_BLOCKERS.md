# Phase 35 — Blockers and Open Items

**Phase 35 status:** `PHASE 35 PARTIAL / EXTERNAL STAGING CONFIGURATION PENDING`

Severity: **CRITICAL / HIGH / MEDIUM / LOW / INFO**. Status: **OPEN / MITIGATED / ACCEPTED / CLOSED**.

Nothing here is hidden. Each item states what would unblock it, and each distinguishes "we were not
allowed to do this" from "this is broken".

---

## B1 — No organizational staging PostgreSQL exists — **HIGH** — OPEN

**Blocks:** the `READY FOR PHASE 36` verdict and every claim about a real staging environment.

**Established by inspection, not assumption:** zero `PG_STAGING_*`, `S3_*`, `AWS_*`, or `STAGING_*`
variables; `.env` contains only a local SQLite URL; no secret-manager reference, staging URL,
certificate, or bucket was supplied. `.env.example` documents the configuration surface with
placeholders only.

**What was done instead:** a local disposable PostgreSQL 17.11 with **real TLS** (E3) was built and
fully validated. It is **not** staging and is not reported as staging.

**Unblocked by:** an owner/DBA supplying one non-production PostgreSQL with TLS, a least-privilege
role, and a CA certificate on the application host; then following the operator checklist in
`PHASE_35_FINAL_REPORT.md` §10.

**Do not resolve by** inventing a host/credential, pointing at production, or relabelling a local
cluster as staging.

---

## B2 — S3 object storage is unimplemented — **HIGH** — OPEN

**Finding PG-35-02.** `src/lib/storage/s3.ts` is a 105-line stub. **8 of 8 operations throw.**
No `@aws-sdk`, `s3`, or `minio` package is installed.

**Aggravating:** configuration validation accepts it. `server-env.ts` and
`scripts/production/check-env.mjs` both **pass** with `STORAGE_PROVIDER=s3` and all variables set,
so a deployment would start "healthy" and fail at the first upload.

**Blocks:** any S3-backed staging or production deployment; all Phase 35F S3 checks (upload,
download, delete, signed URLs, cross-tenant object access, interrupted uploads, object-byte
backup).

**Unblocked by (a decision, then optionally code):**
- **Either** authorize implementing the adapter (`@aws-sdk/client-s3`, implement the interface,
  re-run storage validation) — this is functional development, outside Phase 35 scope;
- **or** decide staging uses `STORAGE_PROVIDER=local` on a persistent volume and accept, in
  writing, the durability/replication/backup limitations in `PHASE_35_STORAGE_VALIDATION.md` §4.1.

---

## B3 — In-app backup fails under authenticated TLS — **HIGH** — OPEN (workaround known)

**Finding PG-35-03.** `src/lib/backup/database.ts` runs `pg_dump --dbname $DATABASE_URL`.
`pg_dump` rejects Prisma's `sslaccept` parameter:

```
pg_dump: error: invalid URI query parameter: "sslaccept"
```

With `sslaccept=strict` (required for real TLS authentication), `POST /api/admin/backups/database`
returns **500**. With the libpq-flavor URL it succeeds (3 MB dump, exit 0).

**Blocks:** the application's own scheduled/manual backup feature in any TLS-authenticated
deployment.

**Workaround in force:** backups are taken with the tooling-flavor URL (`psql`/`pg_dump`), which
*does* verify TLS. This is a legitimate path but it is **outside** the application, so automated
in-app backups remain broken.

**Unblocked by:** deriving a libpq-compatible URL (or `PG*` environment) inside
`src/lib/backup/database.ts`, adding a regression test that runs the backup under
`sslaccept=strict`. Small and contained; **not applied in Phase 35** because it changes application
behaviour.

---

## B4 — TLS verification is not enforced at startup — **HIGH** — MITIGATED (tooling + docs)

**Finding PG-35-01.** Prisma silently downgrades any `sslmode` other than `disable|prefer|require`
to `prefer`, producing an **encrypted but unauthenticated** connection. Proven: an unrelated CA and
a hostname mismatch were both accepted by Prisma Client **and** the Prisma CLI; `sslmode=<garbage>`
was accepted too. Only `sslaccept=strict` authenticates the server.

**Mitigated by:**
1. `scripts/db/pg-tls-check.mjs` — new; performs a rogue-CA probe and **fails** when the configured
   URL accepts an untrusted certificate.
2. `_STAGING_RUNBOOK.md` — the Phase 34 TLS guidance is now explicitly marked wrong and corrected.
3. `pg-preflight.mjs` — optional `PG_APP_DATABASE_URL` parity check.

**Still open:** nothing prevents an operator from deploying with `sslmode=verify-full` and no
`sslaccept`. The tooling catches it only if it is run.

**Unblocked by:** a startup assertion in `src/lib/server-env.ts` that refuses to boot in production
unless the PostgreSQL URL contains `sslaccept=strict`, with a unit test. Recommended as the first
task of the next phase.

---

## B5 — `/health` conflates liveness and readiness — **MEDIUM** — OPEN

**Finding PG-35-04.** With PostgreSQL stopped, `/health` returns **503** while the process is alive
(`GET /` → 307 in 280 ms) and recovers to 200 without a restart when the database returns.

**Risk:** a Kubernetes liveness probe pointed at `/health` would restart healthy pods during a
database outage, turning a recoverable dependency failure into a crash loop. Secondary: the
endpoint reports `File storage: NOT_CONFIGURED` unconditionally, even when local storage is
configured and working.

**Unblocked by:** a liveness route performing no I/O, with `/health` retained as readiness; and a
storage component that reflects the configured provider. Requires a code change and tests; not in
Phase 35 scope.

---

## B6 — No real-data migration rehearsal — **HIGH** (for cutover) — OPEN

**Facts:** all Phase 34 and Phase 35 validation used **synthetic** data (2 tenants, 20k synthetic
users, 200k synthetic audit rows). No real dataset has been migrated from SQLite to PostgreSQL.

**Why it matters:** real data exposes orphaned foreign keys that make `ADD CONSTRAINT` fail, `NULL`s
in columns assumed non-null, uniqueness collisions, and out-of-range timestamps. The pre-flight
query in `_MIGRATION_COMPATIBILITY.md` §4 exists precisely because adding the tenant FK can fail on
existing data.

**Unblocked by:** a rehearsal on an anonymized copy of real data in a disposable environment,
running the pre-flight queries first.

---

## B7 — Object bytes are outside database backup — **HIGH** (for recovery) — OPEN

**Facts:** the database backup covers metadata only. Object bytes live on the filesystem (local
provider) or in S3 (unimplemented). A database-only restore can yield metadata rows pointing at
files that do not exist.

**Unblocked by:** a separate object-storage backup/recovery mechanism with its own drill, or a
written acceptance that object loss is tolerated in staging.

---

## B8 — RPO / RTO unmeasured — **MEDIUM** — OPEN (deliberately not claimed)

**Facts:** one dump (389 ms, 2.9 MB) and one restore (1,768 ms) of a 78 MB synthetic database on one
machine. No schedule, no off-host copy, no target hardware, no defined objective.

**Unblocked by:** a drill on representative volume with the real backup cadence, restoring to target
hardware, against an agreed tolerance.

---

## B9 — Only PostgreSQL 17.11 and a local service were exercised — **MEDIUM** — OPEN

No other major version, no managed service, no connection pooler, no replicas, no failover, no
network latency. The schema needs no extensions and no superuser (`_MIGRATION_COMPATIBILITY.md`
§2.2), which lowers the risk but does not remove it.

**Unblocked by:** running the same chain against the real staging service once B1 is resolved.

---

## B10 — Staging defaults for timeouts — **LOW** — OPEN (guidance)

Observed on the local cluster: `statement_timeout=0`, `idle_in_transaction_session_timeout=0`.
Neither is an application defect, but both allow a runaway query or a stuck transaction to hold
locks indefinitely.

**Unblocked by:** setting conservative values on the staging server (e.g. a statement timeout
appropriate to the slowest legitimate report, and a non-zero idle-in-transaction timeout) and
verifying they are visible to the application role.

---

## B11 — Harness base-URL variables differ — **LOW** — OPEN

`scripts/test-idor-live.mjs` reads `E2E_BASE`; `scripts/db/pg-backup-drill.mjs` reads `BASE`. Using
the wrong one silently targets the default port and yields `ECONNREFUSED`. Carried from Phase 34;
not changed to avoid invalidating recorded evidence.

---

## B12 — Storage unit tests require an uninstalled runner — **INFO** — OPEN

`src/lib/storage/__tests__/storage.test.ts` imports `vitest`, which is not installed. The suites
must run via `npx tsx scripts/test-storage-regression-simple.mjs` and
`npx tsx scripts/test-backup-recovery.mjs`. Running them with `node` fails with
`ERR_UNKNOWN_FILE_EXTENSION` — an operator error, not a defect.

**Unblocked by:** adding `vitest` as a dev dependency, or documenting the `tsx` invocation in
`package.json`. Documented in the runbook meanwhile.

---

## Summary

| ID | Item | Severity | Blocks Phase 36? | Blocks deployment? | Status |
|---|---|---|---|---|---|
| B1 | No organizational staging | HIGH | **yes** (verdict PARTIAL) | yes | OPEN |
| B2 | S3 adapter unimplemented | HIGH | no | **yes** (if S3 required) | OPEN |
| B3 | In-app backup breaks under `sslaccept=strict` | HIGH | no | **yes** | OPEN (workaround) |
| B4 | TLS verification not enforced at startup | HIGH | no | **yes** (silent risk) | MITIGATED |
| B5 | `/health` liveness/readiness conflation | MEDIUM | no | no (operational) | OPEN |
| B6 | No real-data rehearsal | HIGH | no | **yes** | OPEN |
| B7 | Object bytes outside DB backup | HIGH | no | **yes** (recovery) | OPEN |
| B8 | RPO/RTO unmeasured | MEDIUM | no | **yes** | OPEN |
| B9 | Only PG 17.11 / local service | MEDIUM | no | conditional | OPEN |
| B10 | Staging timeout defaults | LOW | no | no | OPEN (guidance) |
| B11 | `E2E_BASE` vs `BASE` | LOW | no | no | OPEN |
| B12 | Storage tests need `tsx` | INFO | no | no | OPEN |

**Only B1 prevents a `READY` verdict**, and it is a provisioning/authorization step rather than an
engineering one.

**But B2, B3 and B4 must be settled before any staging deployment**, independent of B1: each of them
would produce a system that appears healthy while failing at a critical function — first upload,
first backup, or database authentication.
