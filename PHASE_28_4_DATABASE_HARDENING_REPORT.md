# Phase 28.4 — Database Hardening Report

## Change control

No database/runtime change was safe or possible: no active STAGING PostgreSQL endpoint, database tools, prior archive, or generated client is present. SQLite source remains read-only. No Production target was accessed. No index was added/removed; no role/grant/TLS/pool/migration configuration was applied. `prisma db push` was not used.

| Problem | Evidence | Change | Validation |
|---|---|---|---|
| Stage runtime is unavailable | no PG process/tool/cluster/archive; current DB config is SQLite-file scheme | none | environment audit; source read-only hash/integrity pass |
| Default Prisma generation targets SQLite | `schema.prisma` is SQLite; build/postinstall use plain `prisma generate` | none pending staging build review | historical PG client generation only; current build NOT VERIFIED |
| Privilege/TLS/pool baseline unknown | no current database catalog or endpoint | none | NOT VERIFIED |
| N+1/query/index concerns | static code/schema review only | no speculative index/cache changes | live plans and usage stats NOT MEASURED |

## Proposed controlled hardening sequence (STAGING only)

1. Restore access to a dedicated STAGING PostgreSQL instance and verify its version/schema, TLS and ownership through a secret-managed connection.
2. Provision separate non-superuser runtime, migration, backup and read-only audit identities; test prohibited operations.
3. Add an explicit PostgreSQL Prisma generate/build/deploy path; compare generated schema/client to the versioned baseline.
4. Capture actual pool settings and run 10/25/50/100 staged concurrency, then safe `EXPLAIN (ANALYZE, BUFFERS)` reads.
5. Exercise race/idempotency workflows and tenant boundaries with synthetic records.
6. Create an encrypted persistent staging backup, restore into a separate database and validate data/catalog/workflows.
7. Decide on measured N+1, search/pagination and index changes. Do not change production or delete real data.

No unverified PASS is asserted.
