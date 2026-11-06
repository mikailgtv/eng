# Phase 35 — Real Staging Environment Readiness, TLS, Storage & Operational Validation

**Status: `PHASE 35 PARTIAL / EXTERNAL STAGING CONFIGURATION PENDING`**

**Date:** 2026-10-25
**Phase 36 started:** no.

---

## 0. Verdict

The organization has **not supplied a staging environment**. No staging host, credential,
certificate, secret-manager reference, staging application URL, or object-storage bucket was
provided, and this phase is forbidden from inventing them. None were invented.

Everything that can be validated without organizational infrastructure **was** validated — and two
of the findings below are serious enough that they would have caused a failed staging deployment
even if a staging database had been handed over. In particular, the TLS configuration recommended
in Phase 34 was **silently not authenticating the server**, and the application's own backup
feature **breaks under properly authenticated TLS**.

### Environment labels used throughout this report

Every result is tagged with the environment it applies to. Results from different environments are
**never** combined into a single PASS.

| Label | Environment | Available this phase? |
|---|---|---|
| **E1** | SQLite disposable copy (migrated copies only) | yes |
| **E2** | Local disposable PostgreSQL 17.11, **no TLS** (Phase 34) | historical evidence only |
| **E3** | Local disposable PostgreSQL 17.11, **real TLS with a private CA** (Phase 35) | yes |
| **E4** | **Organizational staging PostgreSQL** | **NO — not supplied** |
| **E5** | **Organizational staging object storage (S3)** | **NO — not supplied** |

> E3 is *not* a substitute for E4. It is a local cluster on loopback with a throwaway CA. What it
> proves is that the application and its tooling behave correctly when TLS is real — which is a
> property of the code, not of the organization's network.

---

## 1. Headline results

| Gate | Environment | Result |
|---|---|---|
| PostgreSQL schema generation check | repo | **PASS** (1-line delta) |
| PostgreSQL workspace integrity | repo | **PASS** (0 problems) |
| PostgreSQL archive manifest | repo | **PASS** (4/4) |
| SQLite migration rehearsal | E1 | **PASS** 22/0 |
| SQLite migrated-DB verification | E1 | **PASS** 38/0 |
| TypeScript typecheck | repo | **PASS** (exit 0) |
| Project test chain / storage / backup / IDOR-simple | repo | **PASS** (20/0, 22/0, 15/0) |
| Migrations applied from empty **over TLS** | **E3** | **PASS** 5/5 |
| Migration drift **over TLS** | **E3** | **PASS** — "No difference detected" |
| Structural verification **over TLS** | **E3** | **PASS** 40/40 |
| TLS certificate + hostname authentication | **E3** | **PASS** with `sslaccept=strict`; **FAILS SILENTLY** with `sslmode=verify-full` |
| Live 50-case security suite **over TLS** | **E3** | **PASS** 50/50 |
| Backup + isolated restore at representative volume | **E3** | **PASS** (see §7) |
| Database-loss failure behaviour | **E3** | **PASS** — fail-closed, no silent fallback |
| **Organizational staging validation** | **E4** | **BLOCKED** — no environment supplied |
| **Organizational object storage** | **E5** | **BLOCKED** — no bucket; **and the S3 adapter is unimplemented** |

---

## 2. Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| **PG-35-01** | **CRITICAL** | Prisma **silently ignores `sslmode`**. `sslmode=verify-full` (the setting Phase 34 recommended, and the libpq-idiomatic choice) produces an **encrypted but unauthenticated** connection. Proven: an unrelated CA and a hostname mismatch were both accepted; `sslmode=<garbage>` was also accepted. Only `sslaccept=strict` + `sslcert` authenticates the server. | Mitigated by tooling + runbook correction; **code guard still open** |
| **PG-35-02** | **HIGH** | The **S3 storage adapter is a stub**. All 8 operations (`upload`, `download`, `exists`, `getMetadata`, `generateSignedUrl`, `delete`, `copy`, `verifyChecksum`) throw. No @aws-sdk package is installed. Yet `STORAGE_PROVIDER=s3` **passes** both `server-env` validation and the production preflight → the app starts "healthy" and fails on the first upload. Phase 34 reported S3 as "unvalidated"; the accurate description is **unimplemented**. | **OPEN — blocks any S3-backed deployment** |
| **PG-35-03** | **HIGH** | The in-app backup (`pg_dump --dbname $DATABASE_URL`) **cannot parse Prisma's TLS parameters**: `pg_dump: error: invalid URI query parameter: "sslaccept"`. With properly authenticated TLS the backup endpoint returns **500**. One `DATABASE_URL` cannot serve both Prisma and libpq. | **OPEN — workaround documented** |
| **PG-35-04** | **MEDIUM** | `/health` conflates **liveness and readiness**. With PostgreSQL down the endpoint returns **503** while the process is demonstrably alive (`GET /` → 307 in 280 ms). A liveness probe wired to this endpoint would restart healthy pods during a DB blip. It also reports "File storage: NOT_CONFIGURED" unconditionally, even when local storage is configured and working. | **OPEN** |
| **PG-35-05** | **LOW** | Local cluster defaults: `statement_timeout=0`, `idle_in_transaction_session_timeout=0`. Not a defect in the app; a staging configuration recommendation. | Guidance |
| **PG-35-06** | **LOW** | HTTP harnesses read the base URL from different variables (`E2E_BASE` vs `BASE`). Carried over from Phase 34. | Documented |
| **PG-35-07** | **INFO** | `src/lib/storage/__tests__/storage.test.ts` requires `vitest`, which is not installed. The suites must run via `npx tsx scripts/test-storage-regression-simple.mjs` and `npx tsx scripts/test-backup-recovery.mjs`. My first attempt ran them with `node` and failed — that was my error, not a regression. | Documented |

### PG-35-01 in detail — the most important finding

Empirically measured against E3 with a private CA, a server certificate for `CN=localhost`,
SAN `DNS:localhost`, and a second unrelated CA:

| Client | Configuration | Server cert trusted? | Result |
|---|---|---|---|
| psql | `sslmode=verify-full` + correct CA | yes | **connects**, TLSv1.3 |
| psql | `sslmode=verify-full` + **unrelated CA** | — | **rejected**: `certificate verify failed` |
| psql | `sslmode=verify-full` + hostname `127.0.0.1` (not in SAN) | — | **rejected**: `does not match host name` |
| Prisma Client | `sslmode=verify-full` + **unrelated CA** | — | ⚠️ **CONNECTS** (TLSv1.3, `ssl=true`) |
| Prisma Client | `sslmode=verify-full` + wrong hostname | — | ⚠️ **CONNECTS** |
| Prisma Client | `sslmode=totally-bogus-mode` | — | ⚠️ **CONNECTS** |
| Prisma CLI (`migrate status`) | `sslmode=verify-full` + **unrelated CA** | — | ⚠️ **CONNECTS** |
| **Prisma Client** | **`sslaccept=strict` + correct CA** | yes | ✅ **connects**, TLSv1.3 |
| **Prisma Client** | **`sslaccept=strict` + unrelated CA** | — | ✅ **REJECTED** (`certificate verify failed`) |
| **Prisma Client** | **`sslaccept=strict` + wrong hostname** | — | ✅ **REJECTED** |
| **Prisma CLI** | **`sslaccept=strict` + unrelated CA / wrong host** | — | ✅ **REJECTED** (`P1011`) |

This matches the documented behavior of Prisma's query engine, which recognizes only
`disable | prefer | require` and treats everything else as `prefer`
([client matrix](https://layerbase.com/blog/postgres-sslmode-client-matrix),
[engine parser](https://github.com/app-vitals/shipwright/pull/3719),
[provider guidance](https://www.scaleway.com/en/docs/serverless-sql-databases/api-cli/secure-connection-ssl-tls/)).

**Why this is CRITICAL rather than MEDIUM:** the failure mode is *silent success*. An operator who
writes `sslmode=verify-full&sslrootcert=…` sees a working, encrypted, TLSv1.3 connection and
concludes that the database is authenticated. It is not — any party able to intercept the
connection can present any certificate and be accepted. The connection *looks* protected in every
log and monitoring signal.

**What this phase changed to mitigate it:**

1. `scripts/db/pg-tls-check.mjs` — a new checker that does not merely ask "is it encrypted?" but
   performs a **rogue-CA probe** and fails when the configured URL accepts a certificate that did
   not sign the server's. It fails the Phase-34-style URL with an explicit message.
2. `_STAGING_RUNBOOK.md` — the Phase 34 TLS section was **corrected**, with the old advice marked
   as wrong so nobody follows it.
3. Recommended (not done — see blockers): a startup assertion that refuses to boot in production
   unless `sslaccept=strict` is present.

---

## 3. 35A — Repository state verified

| Check | Expected | Actual | Status |
|---|---|---|---|
| Git status / branch | available | **not a git repository** | NOT AVAILABLE |
| `prisma/schema.prisma` provider | `sqlite` | `sqlite` (line 18), 213 models | PASS |
| `prisma/dev.db` hash | `e9b4eac1…7fb02` | identical at start **and** end | PASS |
| SQLite migrations | 4 entries, lock `sqlite` | unchanged | PASS |
| PG workspace | 5 migrations, lock `postgresql` | unchanged | PASS |
| PG archive + manifest | 4/4 | 4/4 OK | PASS |
| Guided scripts present | all | `generate-postgres-schema`, `build-postgres-workspace`, `pg-preflight`, `pg-migrate`, `pg-verify-structure`, `pg-backup-drill` | PASS |
| Prisma Client provider at start | `sqlite` | `sqlite` (restored at end) | PASS |

---

## 4. 35B — Organizational staging discovery: **nothing supplied**

Checked, without printing any value:

| Requirement | Present? |
|---|---|
| `PG_STAGING_*` environment variables | **0** |
| `S3_*` / `AWS_*` environment variables | **0** |
| `STAGING_*` environment variables | **0** |
| Staging entries in `.env` | **none** (only `DATABASE_URL` → SQLite, `SESSION_SECRET`, `NEXT_PUBLIC_DEMO_HINTS`) |
| Secret-manager references | none |
| Staging application URL | none |
| Staging bucket / storage credentials | none |
| TLS/CA material for a real provider | none |
| `/tmp/pg34.env` | present — **but this is the Phase 34 local disposable cluster, not staging** |

`.env.example` documents the full configuration surface (`STORAGE_PROVIDER`, `STORAGE_S3_*`,
`BACKUP_*`, `PUBLIC_APP_URL`, …) with **placeholders only**. Documentation of a variable is not a
supplied value.

**Determination: E4 and E5 do not exist. No staging operation was performed, and no local server
was substituted for them.**

---

## 5. 35C / 35D — TLS and migration verification on E3

A real TLS server was constructed on the disposable cluster: private CA, server certificate with
`SAN=DNS:localhost` **only** (deliberately omitting an IP SAN so hostname validation can be proven),
`ssl = on`. Throwaway keys were deleted at the end of the phase.

`pg-tls-check.mjs` on the correct configuration — **11 passed, 0 failed**:

- connection TLS-encrypted, **TLSv1.3**, `TLS_AES_256_GCM_SHA384`, 256-bit;
- **rogue CA rejected** (the check that proves authentication);
- application role: `rolsuper=f`, `rolcreatedb=f`, `rolcreaterole=f`, `rolreplication=f`,
  `rolbypassrls=f`;
- `max_connections=100`, 2 connections in this database;
- `statement_timeout=0`, `idle_in_transaction_session_timeout=0` (warned).

The same tool on the Phase-34-style URL — **8 passed, 2 failed**:

```
✗ server certificate validation is enabled (sslaccept=strict)
  — sslmode alone is NOT enforced by Prisma — a rogue CA would be accepted. Set sslaccept=strict
✗ server certificate is actually verified (rogue CA rejected)
  — CONNECTED with a CA that did not sign the server certificate — TLS is encrypted but UNAUTHENTICATED
```

**Migrations over TLS, from an empty schema:**

| Command | Result |
|---|---|
| `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` | 0 tables |
| `pg-migrate.mjs deploy --yes` | 5 migrations applied, **exit 0** |
| `pg-migrate.mjs diff` | **"No difference detected."** |
| `pg-migrate.mjs status` | "Database schema is up to date!" |
| `pg-verify-structure.mjs` | **40 passed, 0 failed** |

Phase 34's two fixes confirmed present over TLS by direct SQL:

| Item | Value | Meaning |
|---|---|---|
| `content_media_organizationId_fkey` | exists | PG-34-01 fix intact |
| `confdeltype` | `n` | `ON DELETE SET NULL` |
| `content_media.updatedAt` default | **NONE** | PG-34-02 fix intact |
| `message_attachments.updatedAt` default | **NONE** | PG-34-02 fix intact |

---

## 6. 35E / 35G — Deployment, health and live security on E3

**Health, database up:** `GET /health` → **200** `{"status":"healthy"}`, headers
`Cache-Control: no-store`, `X-Content-Type-Options: nosniff`. The body exposes no component
diagnostics.

**Database down** (`pg_ctlcluster 17 main stop`), measured:

| Probe | Result | Interpretation |
|---|---|---|
| `GET /health` | **503** in 88 ms, `{"status":"unavailable"}` | readiness correctly fails |
| `GET /` | **307** in 280 ms | **process is alive** → PG-35-04 |
| `POST /api/auth/login` | **500** `{"success":false,"error":"Something went wrong on our side. Please try again.","errorCode":"INTERNAL_ERROR","requestId":"238073f8-…"}` | **fails closed** |
| Body leak scan | no `postgres`/`password`/`5432`/stack fragments | clean |

The **500 proves there is no silent SQLite fallback** — a fallback would have authenticated the
fixture account and returned 200. Server-side log entry for the same request:

```json
{"level":"error","event":"api.unhandled","requestId":"238073f8-f5e4-4630-97c0-b4d8c913af98","errorType":"PrismaClientKnownRequestError"}
```

No connection string, credential, token, email or learner data. The `requestId` matches the client
response, so the failure is observable and correlatable.

**Recovery** (database restarted, application **not** restarted): `/health` → 200 in 130 ms;
`POST /api/auth/login` → **200, `success: true`**.

**Provider fallback is blocked at startup.** Production preflight with a SQLite URL:

```
Production environment preflight failed. Values are intentionally not printed:
- DATABASE_URL: must target a non-local PostgreSQL database; SQLite is not approved for production.
```

Demo/fixture exposure gates exist and are enforced in production:
`NEXT_PUBLIC_DEMO_HINTS` must be exactly `false`; `ALLOW_DEMO_SEED` must not be `true`.

**Live 50-case security suite over verified TLS (E3): 50 passed, 0 failed.**

- `L*` (16): authorized workflows still work.
- `D*` (34): cross-tenant and privilege denials, all observed on the wire.
- Evidence: `e2e/pg35/live-results-tls-postgresql.json`.
- Independent confirmation that the app's traffic was encrypted:
  `pg_stat_ssl` reported **3 TLS connections out of 3** application connections.

**PG-35-04 confirmed:** while the process was alive and serving, `/health` reported 503.

---

## 7. 35H — Backup and restore at representative volume (E3)

The in-app backup endpoint **fails under authenticated TLS** (PG-35-03):

```
POST /api/admin/backups/database → HTTP 500
pg_dump: error: invalid URI query parameter: "sslaccept"
```

Backup/restore was therefore validated at the **tooling** layer using the libpq-flavor URL (which
*does* verify TLS). This is a genuine measurement of the database, not of the broken app path.

**Dataset:** synthetic, tenant-partitioned — **20,011 users**, **200,002 audit rows**, 2
organizations, 213 tables, database size **78 MB**.

| Measurement | Result |
|---|---|
| `pg_dump` (custom format, compress=6, `verify-full` TLS) | **389 ms**, **3,028,320 bytes** |
| `pg_restore` into an isolated empty database | **1,768 ms** |
| Restored tables | **213** |
| Restored users / audit rows / orgs | 20,011 / 200,002 / 2 (exact) |
| Foreign keys | **278** |
| Invalid constraints | **0** |
| Orphaned `content_media` rows | **0** |
| `NULL`-tenant media | **0** |
| Tenant partition preserved | 10,006 / 10,005 |
| Restore target ≠ source | asserted |
| Throwaway restore database | **dropped** |

Authorization was verified negatively: learner and teacher accounts receive **403** on backup
creation.

**No RPO or RTO is claimed.** These are single measurements on one machine with a 78 MB dataset, no
backup schedule, no off-host copy, and no target hardware. Phase 34's 577 KB / 669 ms measurement
is superseded by this one, not reaffirmed by it.

---

## 8. 35I — Operational baseline (E3, development server)

**This is not a capacity baseline.** The measurements were taken against `next dev`, which
compiles on demand and runs unoptimized React, on a **2-core / 1.98 GB** machine with no swap, with
TLS and no connection pooler, against a 20k-user dataset.

| Operation | n | p50 | p95 | Notes |
|---|---:|---:|---:|---|
| `GET /health` | 10 | 89 ms | 368 ms | p95 inflated by on-demand compilation |
| `GET /api/users` (page 1, limit 20) | 15 | 122 ms | 586 ms | all 200 |
| Pagination + filtering (pages 1/2/10, search, limit) | 9 | 122 ms | 628 ms | all 200 |
| `POST /api/users` (valid payload) | 10 | 392 ms | 802 ms | **all 201**; bcrypt dominates |
| 10 concurrent logins | 10 | 884 ms | 1,062 ms | all 200 |
| 10 concurrent reads | 10 | 987 ms | 991 ms | all 200 |

- Concurrency correctness: **no errors, no 5xx** under 10-way concurrency.
- **Production-build measurement: NOT RUN.** Building requires ~1.4 GB heap and dies with the
  database running on this 1.98 GB box (Phase 34 hit SIGABRT at ~925 MB). Reporting dev-server
  latency as production performance would be misleading, so it is not done.
- Connection exhaustion was **not** tested: deliberately, because it would disrupt the cluster and
  the value does not justify the risk on a shared-style target.
- **No service-level objective exists in the project, so no acceptance threshold is asserted.**

An early run of this harness reported user-creation latency from **422 validation rejections**
(the payload was missing `employeeCode`). That number was discarded and re-measured; the table
above contains only the corrected run.

---

## 9. Changed files

| File | Change | Reason |
|---|---|---|
| `scripts/db/pg-tls-check.mjs` | **new** (~215 lines) | Proves TLS *authentication* (rogue-CA probe), role privileges, limits. Closes the gap that let PG-35-01 pass unnoticed. |
| `scripts/db/pg-preflight.mjs` | added dual-URL parity check | When `PG_APP_DATABASE_URL` is set, guarantees app and tooling URLs target the same database — prevents migrating one DB while serving another. |
| `scripts/db/pg-migrate.mjs` | honour `PG_STAGING_PRISMA_URL` | Prisma and psql need different TLS parameter names; migrations must use the Prisma-flavor URL. |
| `_STAGING_RUNBOOK.md` | **corrected TLS section** | Phase 34 recommended `sslmode=verify-full`, which PG-35-01 proved is silently unauthenticated. Old text retained and explicitly marked wrong. |

**Deliberately NOT changed:** no application source, no schema, no migration history, no
`prisma/postgresql/` workspace, no `prisma/migrations/`, no `prisma/dev.db`, no security test, no
storage or backup implementation (PG-35-02/03/04 are reported, not patched — patching them would be
unrequested functional change).

**Final state:** Prisma Client regenerated for **sqlite**; PostgreSQL cluster **stopped**; TLS
configuration reset; throwaway keys deleted; `prisma/dev.db` hash unchanged; archive manifest 4/4.

---

## 10. Operator checklist (for when staging is supplied)

- [ ] A **non-production** PostgreSQL exists, not shared with production, TLS enabled.
- [ ] A least-privilege application role exists (`NOSUPERUSER NOCREATEDB NOCREATEROLE`).
- [ ] CA certificate available **on the application host** as a file.
- [ ] `DATABASE_URL` built with **`sslmode=require&sslcert=<ca>&sslaccept=strict`** — *not* `verify-full`.
- [ ] Tooling URL built with `sslmode=verify-full&sslrootcert=<ca>` for `psql`/`pg_dump`.
- [ ] `PG_APP_DATABASE_URL` and `PG_STAGING_DATABASE_URL` exported; preflight confirms same database.
- [ ] `node scripts/db/pg-tls-check.mjs` → **0 failed** (a PASS here is required, not optional).
- [ ] Confirm **negatively**: a rogue CA must be rejected. If it connects, stop.
- [ ] `pg-preflight.mjs` → READY; `pg-migrate deploy --yes`; `diff` → no difference; structure 40/40.
- [ ] Decide the storage story **before** deploying: S3 is **not implemented** (PG-35-02).
- [ ] Decide the backup story: in-app backup **fails under `sslaccept=strict`** (PG-35-03).
- [ ] Wire liveness to a route that does not depend on the database (PG-35-04).
- [ ] Set `statement_timeout` and `idle_in_transaction_session_timeout` on the staging server.
- [ ] `NEXT_PUBLIC_DEMO_HINTS=false`, `ALLOW_DEMO_SEED` unset.
- [ ] Staging storage/bucket is never a production bucket.

---

## 11. The single safest next action

> **Decide the object-storage question before provisioning anything: either commit to local
> persistent storage for staging, or authorize implementing the S3 adapter (PG-35-02).**

This is deliberately *not* "provision staging" first. The S3 adapter throws on every operation, and
`STORAGE_PROVIDER=s3` passes configuration validation anyway. An organization that provisions a
staging database and configures S3 in good faith would get an application that reports itself
healthy and then fails on the first file upload — with tenant media already depending on that path.
Resolving storage first is a decision and (optionally) a small, well-scoped piece of work; it costs
no infrastructure and removes the largest unknown from the deployment.

The second step is then the TLS verification above, and only then provisioning — because a staging
database whose TLS silently does not authenticate is worse than no staging database at all.
