# Phase 34 — PostgreSQL Migration Compatibility Report

**Question this answers:** can the archived PostgreSQL migration history reproduce
`prisma/schema.prisma` exactly, on a real server, from empty — and if not, where exactly does it
diverge?

**Answer:** yes, after two additive parity migrations (PG-34-01, PG-34-02). Verified on real
PostgreSQL **17.11** from an empty schema: `migrate diff` → *"No difference detected"*,
`pg-verify-structure.mjs` → **40/40**.

---

## 1. Why SQLite passing was never evidence

Phase 33 proved that the PostgreSQL baseline is **not** SQLite-portable, and Phase 34 confirmed
the converse: a PostgreSQL-only defect can be completely invisible from SQLite. `content_media`
had no tenant foreign key in the PostgreSQL history — SQLite could not have revealed that,
because SQLite's Phase 33 migration rebuilt the whole table and got the FK by construction.

So the two histories are **not** transcriptions of each other. They are two implementations
that must each be validated on their own engine:

| | SQLite | PostgreSQL |
|---|---|---|
| History location | `prisma/migrations/` | `prisma/migrations.postgresql/` (archive, immutable) + `prisma/postgresql/migrations/` (workspace, deployable) |
| Migration count | 4 | 5 |
| `ADD COLUMN … NOT NULL DEFAULT` | rebuilds the table (non-constant default limitation) | native `ALTER TABLE ADD COLUMN` |
| Status | established, 22/0 + 38/0 + 50/50 | **validated in this phase**: 40/40 + 50/50 + 20/20 |

---

## 2. Construct classification of the archived baseline

File: `prisma/migrations.postgresql/20261007183000_postgresql_baseline/migration.sql`
(5,259 lines). **Every one of the 879 statements falls into four plain kinds** — there are no
triggers, functions, sequences, extensions, `DO` blocks, or procedural constructs anywhere:

| Construct | Count |
|---|---:|
| `CREATE TABLE` | 213 |
| `CREATE INDEX` | 287 |
| `CREATE UNIQUE INDEX` | 102 |
| `ALTER TABLE … ADD CONSTRAINT` (all foreign keys) | 277 |
| **Total** | **879** |

The arithmetic is itself a consistency check: **277 foreign keys in the archive + 1 added by
PG-34-01 = 278**, which is exactly the number of foreign keys the schema requires. The single
missing key was the tenant FK on `content_media` — the gap is now accounted for to the row.

### 2.1 Column types

| Type | Count | Notes |
|---|---:|---|
| `TEXT` | 1,321 | includes the 198 `id` surrogate primary keys (CUID strings) |
| `TIMESTAMP(3)` | 404 | all date/time columns; no `timestamptz` |
| `INTEGER` | 165 | counters, version, enum-as-int |
| `BOOLEAN` | 92 | |
| `DOUBLE PRECISION` | 18 | Prisma `Float` |
| `BYTEA` | 2 | **only** `certificates.pdfBytes` — the one justified case of file bytes in the database |

**2,002 application columns** (2,010 including Prisma's 8-column `_prisma_migrations`).

### 2.2 Constructs that are absent — and why that matters

| Construct | Present? | Consequence |
|---|---|---|
| `SERIAL` / `BIGSERIAL` | **no** | no sequence state to migrate, no sequence ownership to lose on restore. 198 of the 213 tables use a `TEXT` `id` surrogate key; the other 15 are join/extension tables keyed naturally — `("userId","organizationId")`, `("roleId","permissionId")`, `("itemId","tagId")`, `studentId`, `userId`, `level`. **No table anywhere uses a sequence.** |
| `GENERATED … AS IDENTITY` | **no** | no identity-sequence reset needed after restore |
| `CREATE EXTENSION` (`pgcrypto`, `uuid-ossp`, `citext`, `hstore`) | **no** | no superuser-only install step; a non-superuser role can build the schema (verified — that is exactly the role used) |
| `JSONB` / native `JSON` columns | **no** | all JSON-shaped data is `TEXT`; no JSON-path indexes to recreate |
| `DECIMAL` / `NUMERIC` | **no** | no precision/scale divergence |
| Enum types (`CREATE TYPE … AS ENUM`) | **no** | enums are stored as `TEXT`/`INTEGER`; no type-evolution migration hazards |
| Arrays, `tsvector`, `geometry`, custom types | **no** | |
| Triggers / rules / functions | **no** | no `updatedAt` trigger to diverge from Prisma's client-side `@updatedAt` |
| `ON UPDATE NOW()` column clauses | **no** | |
| Partial / expression indexes | **no** | every index is a plain or plain-unique index on columns |
| Row-level security, policies | **no** | tenant isolation is enforced in the application layer, not by RLS |

This absence list is the reason the port is mechanically clean. It also means the honest statement
of the schema's shape is: **a conventional relational schema with string primary keys, timestamps,
integers, booleans, floats, and two byte columns — with no PostgreSQL-specific machinery.**

### 2.3 A false positive worth recording

Grepping the DDL for `SERIAL` and `IDENTITY` returns hits (6–7 lines). All of them are
**identifiers**: `pointBiserial`, `identityEnabled`, `external_identity_links`. A future automated
check must not flag these. The correct check is against `pg_attribute`/`information_schema` for
`is_identity = 'YES'` or `column_default LIKE 'nextval%'`, which returns zero.

---

## 3. The follow-on migrations

| Migration | Statements | Constructs | Compatibility |
|---|---:|---|---|
| `20261010000000_phase30_storage_metadata` | 19 | 18 `ALTER TABLE`, 3 `CREATE INDEX`, 1 `UPDATE` | native, applies cleanly |
| `20261010000001_phase32_tenant_isolation` | 4 | `ALTER TABLE` + index | native, applies cleanly |
| `20261010000003_phase34_content_media_fk` | 4 | `ALTER TABLE … ADD CONSTRAINT` | **new in 34B** — fixes PG-34-01 |
| `20261010000004_phase34_drop_updatedat_default` | 2 | `ALTER TABLE … ALTER COLUMN … DROP DEFAULT` | **new in 34B** — fixes PG-34-02 |

---

## 4. Defect PG-34-01 — missing tenant foreign key (HIGH)

**Observed.** Diffing the DDL produced by the archive against the DDL generated from
`prisma/schema.prisma` produced a **31-line difference**: 18 columns, 3 indexes, and **1 foreign
key**. The 18 columns and 3 indexes were expected (the Phase 30/32 migrations legitimately add
them). The foreign key was not.

**Root cause.** The baseline runs before the tenant column exists, so it cannot declare a foreign
key on it. The Phase 32 migration adds `"organizationId"` and its index — but never the
constraint. Nothing in the PostgreSQL history ever adds it.

**Impact.** A PostgreSQL database built from the archive has no referential integrity for
tenant-owned media: `content_media` rows can reference a deleted or wrong organization, and the
schema does not match `prisma/schema.prisma`. Tenant-scoped queries would still *behave*
(application-level filtering), which is exactly what makes this dangerous — the defect is
invisible at the API layer and surfaces later as orphaned rows.

**Fix.** `20261010000003_phase34_content_media_fk` — additive, PostgreSQL workspace only:

```sql
ALTER TABLE "content_media"
  ADD CONSTRAINT "content_media_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
```

**Pre-flight for existing data** (in the migration's header comment): adding the constraint fails
if any row already points at a missing organization. Before applying to a database that already
has data, run:

```sql
SELECT count(*) FROM "content_media" c
  LEFT JOIN "organizations" o ON o."id" = c."organizationId"
 WHERE c."organizationId" IS NOT NULL AND o."id" IS NULL;
```

A non-zero result must be **remediated**, never force-validated with `NOT VALID`.

**Verified after migration:** the constraint exists, targets `organizations`, is
`ON DELETE SET NULL`, and restored databases preserve it.

---

## 5. Defect PG-34-02 — undeclared `updatedAt` default (MEDIUM)

**Observed.** Only on real PostgreSQL: `prisma migrate diff` reported drift —
`updatedAt` had default `Some(Now)` in the database but `None` in the schema — on **both**
`content_media` and `message_attachments`.

**Root cause.** The Phase 30 migration adds the column in a way that requires a value for existing
rows:

```sql
ALTER TABLE "content_media" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
```

The default was a **migration-time convenience** for populating existing rows, but it was left
attached permanently. `prisma/schema.prisma` declares `@updatedAt` with **no** database default,
because Prisma Client sets the value on every insert and update.

**Impact.** Two consequences, both permanent:

1. `prisma migrate diff` reports drift forever, so a CI drift gate would either fail constantly or
   be disabled — and a disabled drift gate is what let PG-34-01 survive unnoticed.
2. `prisma migrate dev` would want to emit a no-op migration on every run, generating churn.

**Why SQLite did not see it.** SQLite solved the same problem by rebuilding the table (its
migration `20261010000002_phase33_sqlite_file_integrity`), producing the canonical column with no
default. The two engines reached the same schema by different routes — and only one of them
actually arrived.

**Fix.** `20261010000004_phase34_drop_updatedat_default` — no data change:

```sql
ALTER TABLE "content_media" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "message_attachments" ALTER COLUMN "updatedAt" DROP DEFAULT;
```

**Safety argument.** `@updatedAt` is client-applied on insert and update, so no row can end up
with an absent `NOT NULL` value. Dropping the default changes no existing data and is reversible
(the default can be re-added). Verified after migration: `content_media.updatedAt` has **no**
database default, and `migrate diff` is clean.

---

## 6. Deployment strategy chosen (and rejected alternatives)

| Option | Decision | Reason |
|---|---|---|
| Switch `prisma/schema.prisma` to `postgresql` in place | **Rejected** | would silently change which `migrations/` directory the tooling reads and break the established SQLite path; also makes the provider switch implicit |
| `prisma db push` against the staging database | **Rejected** | banned by standing constraint; bypasses versioned history entirely |
| `prisma migrate reset` | **Rejected** | banned; and unnecessary — dropping a *disposable* schema is an explicit, reviewed act |
| Edit the archived baseline to include the FK | **Rejected** | the archive is immutable evidence (`MANIFEST.sha256`); rewriting it would destroy the audit trail and invalidate Phase 33 |
| Squash into a single baseline | **Rejected** | no justification, high risk, and it would erase the record of the two defects |
| **Additive parity migrations in a separate workspace, archive untouched** | **Chosen** | preserves both histories, keeps one hand-edited schema, keeps the SQLite path live, and every change is a reviewable diff |

---

## 7. Reproducibility

The full history was applied to a **completely empty schema** (not an incremental upgrade) as the
final validation:

```
DROP SCHEMA public CASCADE; CREATE SCHEMA public;   -- disposable database only
node scripts/db/pg-migrate.mjs deploy --yes          → 5 migrations, exit 0
node scripts/db/pg-migrate.mjs diff                  → No difference detected.
node scripts/db/pg-verify-structure.mjs              → 40 passed, 0 failed
```

Result: 213 application tables, 2,002 application columns, 278 foreign keys, 102 non-PK unique
indexes, 0 invalid constraints, every table primary-keyed, 5 migration rows all finished with none
rolled back.

**Drift gate for CI** (recommended to run on every change):

```bash
node scripts/db/generate-postgres-schema.mjs --check   # fails if the PG schema is stale
node scripts/db/build-postgres-workspace.mjs --verify  # fails if the archive hash changed
node scripts/db/pg-migrate.mjs diff                    # fails if migrations drift from schema
```

---

## 8. What this does not cover

- Only PostgreSQL **17.11** was exercised. No other major version.
- TLS was not exercised (`sslmode=disable`, loopback).
- A managed service (connection pooling, statement timeouts, failover) was not exercised.
- **No real SQLite data was migrated.** Only synthetic fixtures. A rehearsal on a copy of real
  data — volume, nullability, orphan rows, and the pre-flight query in §4 — is still required
  before a production cutover.
- The two parity migrations are valid for a **fresh** database. Applying them to a database that
  already holds data requires the §4 pre-flight and, for PG-34-02, a decision about whether the
  existing server-side default is being relied upon by any non-Prisma writer (none is known to
  exist, but that must be confirmed by the owner).
