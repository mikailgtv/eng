# PostgreSQL Staging Runbook (Phase 34)

A safe, ordered procedure to stand up a **staging** PostgreSQL database for this application and
prove it works before anything depends on it.

**Read §0 first.** It contains the rules that make the rest of this document safe.

Validated end-to-end on PostgreSQL **17.11** (local, disposable): 5/5 migrations, zero drift,
40/40 structure checks, 50/50 security suite, 20/20 backup drill.

---

## 0. Rules that are not negotiable

1. **Never point any command in this runbook at production.** Every script here refuses
   production-like targets, but the guard is a safety net, not a substitute for knowing your target.
2. **Never put a connection string in the repository, a report, a ticket, a chat, or a log.**
   It goes in your secret manager and is exported into the shell only.
   All Phase 34 scripts **redact** the URL in their output — keep it that way.
3. **Never run `prisma migrate reset`, `prisma db push`, or `--accept-data-loss`.** They are banned.
   `pg-migrate.mjs` does not implement them and cannot be made to.
4. **`prisma/dev.db` is read-only.** The guarded scripts exit `2` if you aim at it. Do not work
   around that guard.
5. **Prove the target first.** `pg-preflight.mjs` must print `STATUS: READY` before any migration.
   If it prints anything else, **stop** and resolve it — do not proceed.
6. **Backups before anything destructive.** No destructive operation on a database with data whose
   backup you have not verified.
7. **Never invent credentials.** If you do not have a URL, the answer is "blocked", not "make one up".

**Exit-code vocabulary** used by every script in this runbook:

| Exit | Meaning | What to do |
|---:|---|---|
| `0` | success / passed | continue |
| `1` | **failed** or **UNSAFE target** | stop, read the output, do not continue |
| `2` | **BLOCKED** — required input missing (no URL, not confirmed disposable) | supply the input or stop |

---

## 1. Prerequisites

| Requirement | Check |
|---|---|
| A **staging** PostgreSQL that is not production and not shared with production | confirm with the owner, in writing |
| A dedicated application role, `NOSUPERUSER NOCREATEDB NOCREATEROLE` | see §2 |
| TLS enabled on the server | see §2 |
| A database owned by that role, empty or staging-only | see §2 |
| Node 20+, repo dependencies installed | `node -v`, `npm ci` |
| `pg_dump` / `pg_restore` on the app host, **matching the server major version** | `pg_dump --version` |

`pg_dump` refuses to dump from a server newer than the client. If the server is 17, the client
tools must be ≥ 17.

---

## 2. Provision (owner / DBA)

Run as a privileged database user. Replace every `<…>` placeholder.

```sql
-- a dedicated, least-privilege application role
CREATE ROLE <app_role> LOGIN PASSWORD '<generated-strong-password>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;

-- a staging database owned by that role
CREATE DATABASE <staging_db> OWNER <app_role> ENCODING 'UTF8';
```

Verify least privilege (this is the exact check Phase 34 used):

```sql
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole
  FROM pg_roles WHERE rolname = '<app_role>';
-- expect: rolsuper=f, rolcreatedb=f, rolcreaterole=f
```

TLS: obtain the server CA certificate and confirm the server presents a certificate whose name
matches the host you connect to. **Do not use `sslmode=disable` outside loopback.**

> ### ⚠️ CORRECTED IN PHASE 35 — read this before configuring TLS
>
> The original Phase 34 guidance in this section recommended `?sslmode=verify-full`. **That is
> wrong for this application and it fails silently.** Prisma's engine only understands
> `disable | prefer | require`; it downgrades any other value — including `verify-full` — to
> `prefer`, which encrypts the connection but **does not validate the certificate or hostname**.
> Phase 35 proved this against a real TLS server: with `sslmode=verify-full` and a CA that never
> signed the server certificate, both Prisma Client and the Prisma CLI **connected successfully**.
>
> The parameter that actually authenticates the server is **`sslaccept=strict`**, with the CA
> supplied via **`sslcert`**. Verified behaviour: `strict` rejects an unrelated CA and rejects a
> hostname mismatch; `accept_invalid_certs` (the default) accepts both.
>
> Because `psql` and `pg_dump` reject `sslaccept`/`sslcert` as unknown URI parameters, two URL
> forms are required. See §3.1 below.

**Two connection URLs are needed.** Prisma and the libpq tools (`psql`, `pg_dump`, `pg_restore`)
accept different TLS parameter names. Use one URL per stack:

```
# app / Prisma flavor — authenticates the server (use for DATABASE_URL and migrations)
postgresql://<app_role>:<password>@<staging-host>:5432/<staging_db>?sslmode=require&sslcert=/etc/ssl/certs/<ca>.pem&sslaccept=strict

# tooling / libpq flavor — psql & pg_dump DO verify verify-full correctly
postgresql://<app_role>:<password>@<staging-host>:5432/<staging_db>?sslmode=verify-full&sslrootcert=/etc/ssl/certs/<ca>.pem
```

Export the app flavor as `PG_APP_DATABASE_URL` / `PG_STAGING_PRISMA_URL` and the tooling flavor as
`PG_STAGING_DATABASE_URL`. `pg-preflight.mjs` now verifies that **both target the same
host:port/database**, so you cannot migrate one database while the app serves another.

> **Known limitation (Phase 35, finding PG-35-03):** the application's own backup feature shells
> out to `pg_dump --dbname $DATABASE_URL`. Given the app flavor above, `pg_dump` fails with
> `invalid URI query parameter: "sslaccept"`. With verified TLS, **in-app backups do not work**
> until `src/lib/backup/database.ts` translates the URL for libpq. Use the tooling flavor for
> backups meanwhile — see `PHASE_35_BACKUP_RESTORE_REPORT.md`.

> **Do not add `?schema=public`.** That parameter is understood by Prisma Client but **rejected by
> `psql`**, which the Phase 34 scripts use for verification. Adding it breaks the tooling.

---

## 3. Export the environment (every shell that runs a script)

```bash
export PG_STAGING_DATABASE_URL='postgresql://…'   # from your secret manager; never commit
export PG_STAGING_DISPOSABLE=yes                   # required by destructive-capable commands
export PG_STAGING_LABEL='org-staging-pg17'         # printed in evidence lines; not a secret
# optional: only if the restore-drill owner must differ from the URL's user
# export PG_STAGING_OWNER_ROLE='<app_role>'
```

Keep these in an untracked, mode-600 file outside the repository (Phase 34 used `/tmp/<file>.env`,
mode `600`), then `source` it. Confirm before you go on:

```bash
umask 077; ls -l "$PG_STAGING_ENV_FILE"    # must be -rw------- and outside the repo
```

---

## 4. Step 1 — prove the target is disposable (read-only)

```bash
node scripts/db/pg-preflight.mjs
```

Expect:

```
STATUS: READY — a positively-identified disposable staging target is configured.
```

It verifies connectivity, that the URL is not SQLite, that the host is not production-like, that
`PG_STAGING_DISPOSABLE=yes`, that the server version is readable, and that `pg_dump`/`pg_restore`
exist. It also prints a **host fingerprint** so you can tell two targets apart without ever
printing the URL.

**Stop if it does not say READY.** Exit `2` = missing confirmation; exit `1` = unsafe target.

---

## 5. Step 2 — schema hygiene (read-only; run these in CI too)

```bash
node scripts/db/generate-postgres-schema.mjs --check
node scripts/db/build-postgres-workspace.mjs --verify
```

- `--check` fails if `prisma/postgresql/schema.prisma` has drifted from `prisma/schema.prisma`.
  The only permitted difference is the single `provider` line. If it fails, regenerate — never
  hand-edit the generated file:

  ```bash
  node scripts/db/generate-postgres-schema.mjs          # write
  node scripts/db/generate-postgres-schema.mjs --check  # prove
  ```

- `--verify` re-hashes the archived history against `MANIFEST.sha256` and asserts the PostgreSQL
  migration lock has not leaked into the SQLite directory. The archive is **immutable**: if the
  manifest fails, the archive was modified and you must stop and investigate.

---

## 6. Step 3 — migrate (this changes the database)

> ### Prerequisites — all three must be true before running anything in this section
>
> 1. **Authorization.** A named owner has authorized migrating **this specific database**, recorded
>    with a reference (`STAGING_OWNER`, `STAGING_AUTHORIZATION_REF`). No authorization → stop.
> 2. **Read-only assessment completed.** The target was inspected non-destructively (§4 disposability
>    proof, §5 schema hygiene) and is **not assumed empty**. If it holds unexpected objects or its
>    purpose is unclear, stop and ask — do not migrate over it.
> 3. **Authorized recovery point exists.** A verified backup of the target, or an explicitly approved
>    equivalent recovery mechanism. "It looked empty" is not a recovery point.
>
> **Never** use `DROP SCHEMA`, `prisma migrate reset`, `prisma db push`, or any data-loss flag against
> organizational staging. There is no situation in this runbook where that is correct.

**Dry run first.** `deploy` refuses to run without `--yes`, so an accidental invocation is inert:

```bash
node scripts/db/pg-migrate.mjs deploy            # exit 2 — nothing happens
```

**Then execute:**

```bash
node scripts/db/pg-migrate.mjs deploy --yes
```

Expect `All migrations have been successfully applied.` and **exit 0**.

- Applies the 5 migrations in `prisma/postgresql/migrations/` in order.
- Uses `prisma migrate deploy` — versioned migrations only, no `db push`, no reset.
- Writes `_prisma_migrations` rows itself; **never** insert rows into that table by hand.
- Safe to re-run: already-applied migrations are skipped.
- If a migration fails, the wrapper exits non-zero. **Do not** hand-patch the database to force it
  through. Diagnose, fix forward with a new migration, and re-run.

**Known quirk, not an error:** `prisma migrate status` exits `1` when migrations are merely
*pending*. The wrapper reports that as "pending". Do not "fix" it.

---

## 7. Step 4 — prove there is no drift (read-only)

```bash
node scripts/db/pg-migrate.mjs diff
node scripts/db/pg-verify-structure.mjs
```

Expect, in order:

```
No difference detected.
=== 40 passed, 0 failed ===
```

`diff` compares the **live database** against `prisma/postgresql/schema.prisma`. This is the gate
that caught defect PG-34-02, which no static check found.

`pg-verify-structure.mjs` asserts, against PostgreSQL catalogs (not by pattern-matching DDL):

- 213 application tables, `_prisma_migrations` present;
- the 18 Phase 30 columns with their **exact** types (`text`, `integer`,
  `timestamp without time zone`);
- `content_media.updatedAt` has **no** database default;
- the access-level defaults (`RESTRICTED`, `PRIVATE`) and `version NOT NULL DEFAULT 1`;
- `content_media_organizationId_fkey` exists, targets `organizations`, `ON DELETE SET NULL`;
- 278 foreign keys, 102 non-PK unique indexes, **0 invalid constraints**;
- every table has a primary key;
- 5 migrations recorded, **all finished, none rolled back**.

If any check fails, **stop**. Do not seed, do not start the app, do not proceed.

---

## 8. Step 5 — seed fixtures (this writes data)

```bash
SEED_TARGET_URL="$PG_STAGING_DATABASE_URL" npx tsx e2e/seed.ts
```

- On a PostgreSQL target the seed performs **no copy and no DDL** — it verifies the schema is
  already managed and writes fixtures only. It asserts `content_media` exists and fails if not.
- It writes `e2e/fixtures.json`, which the HTTP suites read. **The suite does not create its own
  fixtures** — if you seed one database and run the suite against another, you get `404 User not
  found` on every case. That is a stale fixture pointer, not an application defect. The fix is to
  seed the database you are actually testing.
- It prints a fixture summary. Confirm the storage root it reports matches what you pass to the app
  in §9.

> `SEED_TARGET_DB` (different variable) seeds an **already-migrated SQLite copy**. `SEED_TARGET_URL`
> seeds a non-SQLite database. Do not confuse them.

---

## 9. Step 6 — start the app against staging

Both variables are required:

```bash
DATABASE_URL="$PG_STAGING_DATABASE_URL" \
STORAGE_LOCAL_ROOT="$PWD/e2e/storage" \
npx next dev -p 4035
```

> **`STORAGE_LOCAL_ROOT` is mandatory and this is a known footgun (finding PG-34-04).** Without it,
> `getStorageRoot()` falls back to `<cwd>/storage`, the fixture objects are not there, and every
> own-tenant download returns **404** — which looks exactly like an authorization failure. If
> downloads 404 while everything else passes, check this first.

Replace `next dev` with your normal staging start command. Then regenerate the client for
PostgreSQL if your workflow pins it:

```bash
npx prisma generate --schema prisma/postgresql/schema.prisma
```

For staging, point storage at a **staging-only** location (a staging bucket or a dedicated local
root). **Never** point a staging app at a production bucket: a staging test must not be able to
write to production files.

---

## 10. Step 7 — security suite (read-only against the app, writes fixtures/audit)

```bash
E2E_BASE=http://127.0.0.1:4035 node scripts/test-idor-live.mjs
```

Expect `Results: 50 passed, 0 failed`, exit 0.

| Group | Count | Meaning |
|---|---:|---|
| `L*` | 16 | authorized workflows must still work (a lock-out is a regression too) |
| `D*` | 34 | cross-tenant and privilege denials |

Results are written to `e2e/live-results.json`. Archive it per run; do not overwrite a previous
run's evidence without keeping a copy.

> **Variable name conflict (finding PG-34-03):** this suite reads **`E2E_BASE`**. The backup drill
> in §11 reads **`BASE`**. They are different on purpose and must not be "unified" without
> re-running the evidence.

To prove the writes really landed in PostgreSQL rather than a local file:

```bash
psql "$PG_STAGING_DATABASE_URL" -c '
  SELECT (SELECT count(*) FROM users)            AS users,
         (SELECT count(*) FROM organizations)    AS orgs,
         (SELECT count(*) FROM content_media)    AS media,
         (SELECT count(*) FROM message_attachments) AS attach;'
```

You should see your fixtures, not zero.

---

## 11. Step 8 — backup and restore drill (writes a dump; creates and drops a throwaway DB)

```bash
BASE=http://127.0.0.1:4035 node scripts/db/pg-backup-drill.mjs
```

Expect `20 passed, 0 failed`.

The drill asks the **running app** to produce a backup (this exercises the real application
backup path, not a hand-rolled `pg_dump`), then restores it into a **separate throwaway database**
and compares row counts. It requires the role to be able to `CREATE DATABASE` to make that
throwaway — if your staging role is `NOCREATEDB` (correctly least-privilege), run the drill with a
role that can create databases, **or** have a DBA pre-create an empty `<staging_db>_restore_drill`
owned by the app role and re-run.

What it asserts:

- the dump exists, is non-zero, and is reported `VERIFIED` by the app;
- the restore target is **not** the source database;
- `pg_restore` completes without error;
- **stable** tables restore exactly;
- **volatile** tables (`user_sessions`, `audit_logs`) fall between pre- and post-dump counts —
  the drill itself logs in while running, so exact equality would be a false expectation;
- the restored schema has 213 tables, the tenant FK, tenant data still partitioned, no orphaned
  `content_media`, no `NULL`-tenant media;
- the throwaway database is dropped afterwards.

**Do not quote an RPO or RTO from this drill.** It is one restore of a small database on one
machine. A recovery objective requires a drill on representative volume with the real backup
schedule and target hardware.

---

## 12. Step 9 — return to the default state

```bash
npx prisma generate            # regenerate the client for the committed provider (sqlite)
```

Verify nothing was left changed:

```bash
git status --porcelain         # only intended Phase 34 additions
sha256sum prisma/dev.db        # must equal the pre-phase hash
(cd prisma/migrations.postgresql && sha256sum -c MANIFEST.sha256)   # 4/4 OK
cat prisma/migrations/migration_lock.toml                            # provider = "sqlite"
```

---

## 13. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `psql: invalid URI query parameter: "schema"` | `?schema=public` in the URL | remove it; it is Prisma-only |
| `pg-migrate status` exits `1` | migrations are pending | expected; run `deploy --yes` |
| Every suite case returns `404 User not found` | `e2e/fixtures.json` belongs to a different database | seed **this** database (§8) |
| Downloads 404 but everything else passes | app started without `STORAGE_LOCAL_ROOT` | set it (§9) |
| `pg_dump: server version … client version` | client tools older than the server | install matching `postgresql-client` |
| `pg_restore` cannot create objects | restore DB owned by a different role | `PG_STAGING_OWNER_ROLE` (§3) |
| `permission denied to create database` in the drill | app role is `NOCREATEDB` (correct) | DBA pre-creates the drill DB, or use an operator role |
| `migrate diff` reports drift | a migration does not match the schema | **do not** `db push`; write a new migration |
| `generate-postgres-schema.mjs --check` fails | someone hand-edited the generated schema | regenerate; never hand-edit |
| Build dies with a heap OOM | small machine, default heap | `NODE_OPTIONS=--max-old-space-size=1400 npm run build`, run sequentially with `typecheck` |

---

## 14. CI checklist

```bash
# read-only, safe on every commit
node scripts/db/generate-postgres-schema.mjs --check
node scripts/db/build-postgres-workspace.mjs --verify
node scripts/db/rehearse-migration.mjs          # SQLite path still works
node scripts/db/verify-db.mjs prisma/dev.db e2e/mig33/rehearsal-clean.db
npm run typecheck

# requires a staging target; run on the staging pipeline, never on a PR from a fork
node scripts/db/pg-preflight.mjs
node scripts/db/pg-migrate.mjs deploy --yes
node scripts/db/pg-migrate.mjs diff
node scripts/db/pg-verify-structure.mjs
```

Recommended gate: fail CI if `pg-migrate.mjs diff` reports **any** difference. That single check
would have caught defect PG-34-01 before Phase 34.

---

## 15. Health probes: liveness vs readiness (Phase 36, PG-35-04)

Two endpoints, two different questions. Do not point both probes at the same URL.

| Endpoint | Question | Depends on DB / storage | Status codes | Use for |
|---|---|---|---|---|
| `GET /health/live` | Is the process alive and serving? | **No. Zero I/O.** | 200 always (body `{"status":"alive"}`) | Kubernetes `livenessProbe`, container restart policy, load-balancer membership |
| `GET /health` | Can this instance actually serve traffic? | **Yes** — database *and* storage | 200 `{"status":"healthy"}` / 503 `{"status":"unavailable"}` | `readinessProbe`, taking an instance out of rotation |

Both send `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`, and neither body contains
connection strings, host names, credentials, tenant data, or stack traces.

```yaml
# Kubernetes shape — note the different targets
livenessProbe:  { httpGet: { path: /health/live, port: 4035 }, periodSeconds: 10 }
readinessProbe: { httpGet: { path: /health,      port: 4035 }, periodSeconds: 5 }
```

**Verified in Phase 36 (live):** with PostgreSQL stopped, `/health/live` returned **200** while
`/health` returned **503**; after PostgreSQL restarted, `/health` returned to **200** with no app
restart. A liveness probe on `/health` would have restarted a perfectly healthy process every time
the database hiccuped — that is the failure this separation prevents.

**Do not** use `/health` for liveness. A database outage must remove an instance from rotation, not
kill and restart it.

---

## 16. Backups over authenticated TLS (Phase 36, PG-35-03)

`pg_dump`/`pg_restore` are libpq tools. They **reject** Prisma-only parameters:
`invalid URI query parameter: "sslaccept"`. And libpq's `sslcert` means the **client** certificate,
not the CA — the CA is `sslrootcert`. So the two consumers need two different URLs for the *same*
database:

```bash
# app / Prisma        — sslaccept=strict is the only knob Prisma honours for verification
DATABASE_URL='postgresql://…?sslmode=require&sslcert=/etc/lms/ca.pem&sslaccept=strict'

# tooling / libpq     — verify-full + sslrootcert is what pg_dump/psql/psql actually understands
BACKUP_TOOLING_DATABASE_URL='postgresql://…?sslmode=verify-full&sslrootcert=/etc/lms/ca.pem'
```

`BACKUP_TOOLING_DATABASE_URL` is **optional**. When unset, the application derives a libpq-safe URL
from `DATABASE_URL` (`toLibpqConnectionUrl()`), which never downgrades: a non-strict `DATABASE_URL`
produces an error, never an unauthenticated connection. When *set*, it is accepted only if it targets
the **same database** as `DATABASE_URL` — a mismatched tooling URL is refused, so a backup can never
silently dump the wrong database.

Rules:

- Never log, echo, or store either URL. Backup responses return an id, status, size and a relative
  path only.
- The dump is written only to the approved protected directory, with temp-file cleanup on both
  success and failure.
- Restores require `BACKUP_RECOVERY_DATABASE_URL` and **refuse the active database as a target**.

Live result in Phase 36: `POST /api/admin/backups/database` over strict TLS → **HTTP 201**,
status `VERIFIED`, 3,059,351 bytes, 771 ms (Phase 35: HTTP 500). Learner/teacher callers → **403**.

### Rogue-CA probe — required before staging approval

This is the check that proves TLS is *authenticated*, not merely encrypted. Keep it in the approval
gate; a green backup is meaningless if the connection would accept any certificate.

```bash
node scripts/db/pg-tls-check.mjs
# required output:
#   ✓ server certificate is actually verified (rogue CA rejected) — connection refused as required
# and the summary must read: 11 passed, 0 failed
```

A CA that did **not** sign the server certificate must be **rejected**. If that probe connects, TLS
is encrypted-but-unauthenticated and staging approval must be refused.

---

## 17. Related documents (Phase 36/37)

- `PHASE_36_FINAL_REPORT.md` — verdict, closure matrix, evidence.
- `PHASE_36_STORAGE_DECISION.md` — Option A (persistent local) vs Option B (S3 adapter). **Decision required; storage dependency BLOCKED.** `STORAGE_PROVIDER=s3` now fails fast at startup by design.
- `PHASE_36_DATABASE_TIMEOUTS.md` — `statement_timeout` / idle-in-transaction guidance. **Documentation only; no values applied.**

### Release verification (repository behaviour only)

```bash
npm run release:verify     # typecheck → aggregate tests → memory-safe build
```

Verifies what the **repository** does: types, the full test chain (including the staging-gate and
release-contract suites), and that the production build still succeeds. It requires no staging
credentials, contacts no database, and runs no migration.

**`release:verify` is not a staging check and not a deployment gate.** A green run says the code is
internally consistent; it says nothing about whether staging is ready. Those are different questions
and they have different commands — `npm run staging:ready` answers the second.

### Staging readiness gate

```bash
npm run staging:ready        # exit 0 = inputs usable; 2 = blocked; 3 = production-like, refused
```

Run this **before** provisioning anything against staging: it checks the required inputs, performs no
network/database/storage I/O, and prints no values. The authoritative list of variables and check
identifiers is in `PHASE_37_STAGING_HANDOFF.md` §2.1.
