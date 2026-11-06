# Phase 34 — Blockers and Open Items

**Phase 34 status:** `PHASE 34 PARTIAL / POSTGRESQL CONFIGURATION PENDING`

Nothing in this file is a hidden failure. Every item below is either (a) something this phase was
not permitted to do, (b) something that requires an organizational decision or credential, or
(c) a limitation of the environment in which the validation ran.

Severity: **CRITICAL / HIGH / MEDIUM / LOW / INFO**. Status: **OPEN / CLOSED / ACCEPTED (with reason)**.

---

## B1 — No organizational staging PostgreSQL exists — **HIGH** — OPEN

**Blocks:** the `READY FOR PHASE 35` verdict, and any claim that staging is provisioned.

**What is true instead:** a **local, disposable** PostgreSQL 17.11 cluster was provisioned on the
build machine, under explicit user authorization, on loopback with TLS disabled. It was used to
validate the entire path for real: 5/5 migrations from empty, zero drift, 40/40 structure,
50/50 security, 20/20 backup/restore.

**Why it is still open:** the phase asks for a *staging* environment. The validated target is not
it. It has no TLS, no backup schedule, no monitoring, no network policy, and it disappears with
the sandbox. Presenting it as staging would be a false claim.

**Unblocked by:** an owner/DBA creating one non-production PostgreSQL with a least-privilege
application role and TLS enabled, then running §14 of `PHASE_34_FINAL_REPORT.md` unchanged. The
runbook (`_STAGING_RUNBOOK.md` §2–§11) is the complete procedure. **No code change is required.**

**Do not resolve this by:** inventing a host, a URL, or credentials; pointing at production; or
declaring a local cluster to be staging.

---

## B2 — TLS was never exercised — **HIGH** (for cutover) — OPEN

**Blocks:** any claim that the staging connection is encrypted or that certificate validation works.

**Evidence of the gap:** the entire Phase 34 validation ran with `sslmode=disable` on `127.0.0.1`.
No handshake was performed, no CA was validated, no hostname was checked.

**Why it matters:** TLS misconfiguration is one of the most common production cutover failures, and
its failure mode in staging is frequently "it worked because we disabled it" — meaning the failure
is deferred to production. `sslmode=require` without CA verification is also a silent
MITM exposure that looks "encrypted" in logs.

**Unblocked by:** running the runbook against a server with `sslmode=verify-full` and a trusted CA,
and confirming both the successful handshake **and** a deliberate failure with a wrong CA or
mismatched hostname (negative test).

---

## B3 — `prisma/dev.db` is still un-migrated (P2022 ×2) — **MEDIUM** — ACCEPTED (carried from Phase 33)

**Facts:** `prisma/dev.db` fails two Prisma queries with `P2022` (`content_media.originalName`,
`message_attachments.originalName` do not exist in that file). Its hash is unchanged:
`e9b4eac119cc44941d7cdea88c1429945fce40dd1ee7c548759bcfbc68f7fb02`, 4,517,888 bytes.

**Why accepted:** that file is **read-only by standing rule**. Migrating it is explicitly forbidden,
and Phase 30/32 migrations were never applied to it. The correct target for verification is a
migrated copy, which is exactly what `rehearse-migration.mjs` produces and what `verify-db.mjs`
checks (38/0).

**Why it still matters:** the default developer database has a stale schema. Any developer who runs
the app against `prisma/dev.db` will hit `P2022` on the two file tables. This is a **developer
experience** issue, not a PostgreSQL readiness issue.

**Unblocked by:** an explicit owner decision to migrate the development database (or to retire it in
favour of a migrated copy). **Requires authorization; not done here.**

---

## B4 — Object storage (S3) unvalidated on PostgreSQL — **HIGH** (for cutover) — OPEN

**Facts:** only `local` filesystem storage was exercised. `BYTEA` is used only for
`certificates.pdfBytes`; media and attachments store bytes in object storage and metadata in the
database.

**Why it matters:** the database and the object store are one logical unit. A PostgreSQL restore
drill that does not also restore/verify the object store proves roughly half of recoverability.
A staging app pointed at a production bucket is also an explicit prohibited risk.

**Unblocked by:** configuring staging S3 (separate bucket, restricted credentials) and re-running
the upload/download/download-other-tenant cases from the security suite against it, plus a
storage-side restore or at minimum an inventory reconciliation.

---

## B5 — RPO / RTO unmeasured — **MEDIUM** — OPEN (deliberately not claimed)

**Facts:** one `pg_dump` of **576,948 bytes** and one `pg_restore` in **669 ms** into a throwaway
database on the same machine. That is a *functional* proof, not a recovery objective.

**Why it is not claimed:** a single local restore of a small database on the same disk, with no
backup schedule, no off-host copy, no retention policy, and no target hardware, cannot extrapolate
to an RPO or RTO. Quoting one would be fabrication.

**Unblocked by:** a drill on representative volume, restoring to the actual target hardware, with
the real backup cadence and retention, measuring both the data-loss window and the restore time.

---

## B6 — No rehearsal on a copy of real data — **HIGH** (for cutover) — OPEN

**Facts:** all validation used **synthetic fixtures** (2 tenants, 11 users, a handful of media and
attachments). No real dataset was migrated from SQLite to PostgreSQL in this phase.

**Why it matters:** real data surfaces things fixtures never do — orphaned rows that make
`ADD CONSTRAINT` fail, `NULL` values in columns assumed non-null, case/whitespace duplicates that
collide with a unique index, and timestamps outside the expected range. The pre-flight query in
`_MIGRATION_COMPATIBILITY.md` §5 exists precisely because adding the tenant FK can fail on
existing data.

**Unblocked by:** a rehearsal on an anonymized copy of real data, in a disposable environment,
running the pre-flight queries first and then the full migration chain.

---

## B7 — Only PostgreSQL 17.11 was exercised — **MEDIUM** — OPEN

**Facts:** the server was 17.11 on Debian 13. No other major version, no managed service, no
connection pooler, no replica, no failover.

**Why it matters:** managed offerings differ in connection limits, statement timeouts, extension
availability, and available privileges (some forbid `CREATE` on `public`). The schema needs no
extensions and no superuser (`_MIGRATION_COMPATIBILITY.md` §2.2), which reduces the risk — but does
not eliminate it.

**Unblocked by:** running the same chain against the actual target service once B1 is resolved.

---

## B8 — Build OOMs on small machines — **LOW** — OPEN

**Facts:** `npm run build` died with SIGABRT at ~925 MB JS heap on a 1.98 GB / 2-core box with no
swap. It succeeded (exit 0) with `NODE_OPTIONS=--max-old-space-size=1400` after PostgreSQL was
stopped. `npm run typecheck` is OOM-killed if run concurrently with the build.

**Why it matters:** CI sizing and reproducibility, not correctness.

**Unblocked by:** CI runners with ≥ 4 GB RAM (recommended), and running build and typecheck
sequentially. No application change is implied.

---

## B9 — Two HTTP harnesses use different base-URL variables — **LOW** — OPEN

**Facts:** `scripts/test-idor-live.mjs` reads `E2E_BASE`; `scripts/db/pg-backup-drill.mjs` reads
`BASE`. Using the wrong one silently sends the suite to the default port and produces
`ECONNREFUSED`.

**Why not fixed now:** changing either name would invalidate the exact commands that produced this
phase's evidence. It is documented in the runbook instead.

**Unblocked by:** a small, separately-reviewed cleanup that accepts both names and prefers one, with
a re-run of both suites as the regression test.

---

## B10 — `STORAGE_LOCAL_ROOT` default is a silent footgun — **MEDIUM** — OPEN

**Facts:** `getStorageRoot()` falls back to `<cwd>/storage` when the variable is unset. During this
phase that produced **own-tenant download 404s** that looked exactly like an authorization failure
(two suite cases failed for this reason before being diagnosed).

**Why it matters:** a misconfigured staging app does not fail loudly; it fails as a *security-looking*
symptom, which invites the wrong remedy (weakening a check, or "fixing" the authorization code).
That is a dangerous failure mode, and it cost real time in this phase.

**Not fixed here:** changing application startup behaviour is a code change outside Phase 34's
scope, and the phase forbids unrelated changes.

**Unblocked by:** a dedicated small change that **fails fast at startup** when the storage root is
missing, a directory, empty, or resolves outside an allow-listed parent. Recommended as the first
task of a later phase, with a test that asserts the process refuses to boot.

---

## Summary

| ID | Item | Severity | Blocks Phase 35? | Blocks cutover? | Status |
|---|---|---|---|---|---|
| B1 | No organizational staging PostgreSQL | HIGH | **yes** (verdict is PARTIAL) | yes | OPEN |
| B2 | TLS never exercised | HIGH | no | **yes** | OPEN |
| B3 | `prisma/dev.db` un-migrated (P2022 ×2) | MEDIUM | no | no (dev only) | ACCEPTED |
| B4 | S3 storage unvalidated on PostgreSQL | HIGH | no | **yes** | OPEN |
| B5 | RPO/RTO unmeasured | MEDIUM | no | **yes** | OPEN |
| B6 | No real-data rehearsal | HIGH | no | **yes** | OPEN |
| B7 | Only PG 17.11 exercised | MEDIUM | no | conditional | OPEN |
| B8 | Build OOM on small machines | LOW | no | no | OPEN |
| B9 | `E2E_BASE` vs `BASE` | LOW | no | no | OPEN |
| B10 | `STORAGE_LOCAL_ROOT` footgun | MEDIUM | no | no | OPEN |

**The only item that stands between this phase and a `READY` verdict is B1** — and it is an
organizational provisioning step, not an engineering one. Everything else is a limitation that must
be disclosed and measured, not a defect that was left unfixed.
