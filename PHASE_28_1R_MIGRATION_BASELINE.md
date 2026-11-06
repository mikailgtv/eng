# PHASE 28.1R — Migration Baseline

**Date:** 2026-10-07 (Asia/Tehran)

## Repository artifacts prepared

- `prisma/schema.postgresql.prisma` — candidate PostgreSQL schema derived from the existing Prisma model schema. The primary `prisma/schema.prisma` was left on SQLite and its SHA-256 remained `559a211a8e79be6d0946a629c7e6cf52cdeb8c713298ce4e0d1590c942088431`.
- `prisma/migrations/migration_lock.toml` — provider set to `postgresql`.
- `prisma/migrations/20261007183000_postgresql_baseline/migration.sql` — versioned initial baseline.

Candidate schema SHA-256: `3e148aca1380240b28979239ae610a971e7c5eca73bda10f13f89a483e7d7965`.  
Migration SQL SHA-256: `a0467ca334cdb6dd9e32d821d32f98795b1d262bf6cfeb1bdf915e4117f5bc4a`; size 191,516 bytes.

## Generation and validation evidence

- Prisma CLI/client version: 5.22.0.
- `prisma validate --schema=prisma/schema.postgresql.prisma`: passed.
- Generated baseline with `prisma migrate diff --from-empty --to-schema-datamodel ... --script`.
- Baseline contains 213 table definitions, 277 foreign-key additions, and 389 secondary/unique index definitions; PostgreSQL also created primary-key indexes.
- `prisma migrate deploy --schema=...`: passed on the disposable PostgreSQL database.
- `prisma migrate status --schema=...`: schema up to date.
- Database-to-schema `migrate diff`: no drift.
- No `prisma db push` was used.

## Cutover guard

The candidate schema and migration files are a reviewable rehearsal baseline; the default project datasource remains SQLite. The production target is not configured. Before a real deployment, review/approve this baseline, confirm the production PostgreSQL version and URL outside chat, configure a persistent backup destination, and explicitly update deployment/build configuration to generate/deploy using the PostgreSQL schema. In particular, the existing package build script invokes default `prisma generate`, so future PostgreSQL deployment configuration must be deliberate. No production migration was run.
