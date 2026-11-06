# Phase 35 — Backup and Restore Report

Scope: 35H. Database backup/restore at representative volume, the TLS interaction defect, and
object-storage coverage boundaries.

**Environment key:** **E3** local disposable PostgreSQL 17.11 + real TLS · **E4** organizational
staging PostgreSQL (**NOT SUPPLIED**) · **E5** organizational object storage (**NOT SUPPLIED**)

---

## 1. Bottom line

| Question | Answer |
|---|---|
| Does `pg_dump`/`pg_restore` work correctly over verified TLS? | **Yes (E3)** |
| Does the **application's own** backup feature work under authenticated TLS? | **No — it returns 500** (PG-35-03) |
| Was restore validated at representative volume? | **Yes (E3)** — 20k users / 200k audit rows / 78 MB |
| Is object storage covered by this backup? | **No** |
| Is an RPO/RTO claimed? | **No** |

---

## 2. Finding PG-35-03 — in-app backup is incompatible with authenticated TLS

### 2.1 Observed

With the application running against E3 using correctly authenticated TLS
(`sslmode=require&sslcert=<ca>&sslaccept=strict`):

```
POST /api/admin/backups/database → HTTP 500
```

Server log: `{"level":"error","event":"api.unhandled","requestId":"cd10faca-…","errorType":"Error"}`

The backup drill reported 5 failures, all downstream of the same cause:

```
✗ backup endpoint returned 201 — HTTP 500
✗ backup verified by the application — status=undefined
✗ backup has a size — undefined bytes
✗ backup has an id
✗ dump file exists on disk — not found
```

### 2.2 Root cause

`src/lib/backup/database.ts` executes:

```js
const args = ["--dbname", url, "--format", "custom", "--file", destPath, "--no-password", "--verbose"];
await execFileAsync("pg_dump", args, …);
```

`pg_dump` is a **libpq** client and rejects Prisma-only URI parameters. Reproduced directly:

| URL flavor | `pg_dump` result |
|---|---|
| app / Prisma flavor (`sslmode=require&sslcert=…&sslaccept=strict`) | **exit 1** — `pg_dump: error: invalid URI query parameter: "sslaccept"` |
| tooling / libpq flavor (`sslmode=verify-full&sslrootcert=…`) | **exit 0** — 576,663 bytes, archive listed successfully |

### 2.3 Why this is a genuine deployment blocker

The application now has a hard conflict on a single `DATABASE_URL`:

- **Authenticated TLS requires** `sslaccept=strict` (finding PG-35-01) — without it, TLS is
  encrypted but unauthenticated.
- **`pg_dump` cannot parse** `sslaccept`, so with `sslaccept=strict` the in-app backup always fails.

An organization must therefore choose between an unauthenticated (MITM-vulnerable) database
connection and a broken backup feature — unless the backup code is fixed.

### 2.4 Remediation options (not implemented in Phase 35)

| Option | Assessment |
|---|---|
| **A. Translate the URL in `src/lib/backup/database.ts`** — parse `DATABASE_URL`, map `sslaccept=strict`/`sslcert` → `sslmode=verify-full`/`sslrootcert`, pass the derived URL to `pg_dump`/`pg_restore`, or pass `PGHOST`/`PGUSER`/`PGPASSWORD`/`PGSSLMODE`/`PGSSLROOTCERT` via environment instead of `--dbname` | **Recommended.** Small, contained, no behavioural change to backups other than making them work. Requires its own regression test. |
| B. Second env var for backups (e.g. `BACKUP_DATABASE_URL` in libpq flavor) | Works, but duplicates a secret and invites drift between the two URLs. |
| C. Accept unauthenticated TLS for the app | **Rejected** — defeats PG-35-01 mitigation. |

Option A was **not** applied: it changes application behaviour, which this phase's scope excludes.
It is recorded as an open blocker with a precise fix.

---

## 3. Backup and restore at representative volume (environment: E3)

Because the in-app path is blocked by PG-35-03, restore was validated at the **tooling** layer using
the libpq-flavor URL, which genuinely verifies TLS (rejecting an unrelated CA is proven in
`PHASE_35_STAGING_VALIDATION.md` §2.2).

### 3.1 Test conditions

| Parameter | Value |
|---|---|
| Server | PostgreSQL 17.11 (Debian 13), local disposable |
| Transport | TLSv1.3, `sslmode=verify-full` with a private CA |
| Host | 2 vCPU, 1.98 GB RAM, no swap |
| Database size | **78 MB** |
| Rows | **20,011 users**, **200,002 audit rows**, 2 organizations, 213 tables |
| Data type | **synthetic** only (no production data) |
| Dump | `pg_dump --format custom --compress=6` |
| Restore target | isolated database `lms_staging_restore_drill`, created for the drill and dropped after |

### 3.2 Results

| Measurement | Value |
|---|---|
| `pg_dump` duration | **389 ms** |
| Dump size | **3,028,320 bytes** (≈ 2.9 MB compressed from 78 MB) |
| `pg_restore` duration | **1,768 ms** |
| Restore exit code | **0** |

### 3.3 Integrity checks on the restored database

| Check | Expected | Actual | Status |
|---|---|---|---|
| Application tables | 213 | **213** | PASS |
| `users` | 20,011 | **20,011** | PASS (exact) |
| `audit_logs` | 200,002 | **200,002** | PASS (exact) |
| `organizations` | 2 | **2** | PASS (exact) |
| `content_media` | 2 | **2** | PASS (exact) |
| Foreign keys | 278 | **278** | PASS |
| Invalid / not-validated constraints | 0 | **0** | PASS |
| Orphaned `content_media` rows | 0 | **0** | PASS |
| `NULL`-tenant media | 0 | **0** | PASS |
| Tenant partition preserved | ~half each | **10,006 / 10,005** | PASS |
| Restore target ≠ source database | required | asserted | PASS |
| Throwaway restore DB dropped | required | **dropped** | PASS |

### 3.4 Authorization (negative testing)

| Actor | `POST /api/admin/backups/database` |
|---|---|
| Admin (own tenant) | attempted → 500 due to PG-35-03 |
| Learner | **403** |
| Teacher | **403** |
| Unauthenticated (`GET /api/admin/backups/list`) | **401** |

Backup creation is correctly restricted to administrators. Note that the positive case could not be
verified through the app under TLS, for the PG-35-03 reason.

### 3.5 Audit logging

`api.unhandled` error records carry `requestId` and `errorType` only — no connection string, no
credentials, no data. Denied storage downloads emit structured `DOWNLOAD_AUTH_FAILURE` events with
actor and file identifiers. No secrets or PII appear in any log line reviewed.

---

## 4. Comparison with Phase 34

| Metric | Phase 34 (E2, no TLS) | Phase 35 (E3, verified TLS) |
|---|---|---|
| Database size | 577 KB dump | **78 MB database / 2.9 MB dump** |
| Rows | ~11 users | **20,011 users, 200,002 audit rows** |
| `pg_restore` | 669 ms | **1,768 ms** |
| In-app backup | **worked (201)** | **fails (500)** — PG-35-03 |
| Verdict | functional proof | functional proof at volume, **but the app path regressed under TLS** |

Phase 34's measurement did not contradict Phase 35's: Phase 34 used `sslmode=disable`, so `pg_dump`
never saw the Prisma-only parameters. The defect only becomes visible once TLS is configured
correctly — which is itself an argument for doing TLS validation early.

---

## 5. Recovery objectives — deliberately not claimed

**No RPO and no RTO are stated.** Reasons:

- One restore, on one machine, of a 78 MB synthetic dataset.
- No backup schedule, retention policy, or off-host copy was exercised.
- No target hardware, no network transfer, no concurrent load.
- Object bytes are not covered by this backup at all (§6).
- The organization has defined no service-level objectives, so there is no agreed target to measure
  against.

A defensible objective requires: a drill on real volume, the actual backup cadence, restore to
target hardware, and an agreed tolerance — and, for media, a separate object-storage recovery
procedure.

---

## 6. Coverage boundary — what this backup does **not** protect

| Asset | Covered? | Consequence if only this backup is restored |
|---|---|---|
| Database schema and rows | **Yes** | — |
| Object bytes (local filesystem) | **No** | `content_media` / `message_attachments` rows survive but the referenced files may not |
| Object bytes (S3) | **No** | provider unimplemented (PG-35-02) |
| Backups themselves' encryption keys | Not in scope here | `BACKUP_ENCRYPTION_KEY` must be managed separately from the backups |
| Application secrets / `.env` | **No** | not in the database, by design |

A restore drill that only restores PostgreSQL can therefore produce a **silently inconsistent**
system: metadata present, bytes absent. This must be treated as an integrity risk in the recovery
plan, not as a detail.

---

## 7. Requirements before a staging restore drill (E4)

- [ ] Staging PostgreSQL with TLS, and a way for the app role to reach a **separate** restore target
      (either `CREATEDB`, or a DBA pre-creates the drill database owned by the app role).
- [ ] PG-35-03 resolved, or the drill explicitly run at the tooling layer with the libpq-flavor URL.
- [ ] A dataset of representative size — not the 78 MB synthetic set used here.
- [ ] Object-storage recovery decision recorded (§6).
- [ ] Backup encryption key stored and escrowed independently of the backups.
- [ ] Restoration performed into an isolated target; **never** over a populated shared staging
      database and never into production.
- [ ] Durations and dataset size recorded at the time of the drill, with the RPO/RTO only stated
      afterwards.
