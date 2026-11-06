#!/usr/bin/env node
/**
 * Phase 34B — build the isolated PostgreSQL migration workspace.
 *
 * Layout produced:
 *   prisma/postgresql/schema.prisma      (GENERATED — see generate-postgres-schema.mjs)
 *   prisma/postgresql/migrations/        (PostgreSQL history ONLY)
 *     migration_lock.toml                provider = "postgresql"
 *     20261007183000_postgresql_baseline/
 *     20261010000000_phase30_storage_metadata/
 *     20261010000001_phase32_tenant_isolation/
 *     20261010000003_phase34_content_media_fk/   (new: PG parity fix)
 *
 * Why a sub-directory tree: Prisma 5.22 uses exactly one migrations directory
 * per schema, always `<schemaDir>/migrations`. Giving PostgreSQL its own schema
 * in `prisma/postgresql/` therefore gives it its own isolated history without
 * touching `prisma/migrations` (SQLite) or the active provider.
 *
 * The three archived files are copied byte-for-byte from
 * prisma/migrations.postgresql/ and verified against MANIFEST.sha256 both
 * before and after the copy. Nothing in the archive is modified.
 *
 *   node scripts/db/build-postgres-workspace.mjs [--verify]
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARCHIVE = path.join(ROOT, "prisma", "migrations.postgresql");
const WS = path.join(ROOT, "prisma", "postgresql");
const WS_MIGRATIONS = path.join(WS, "migrations");
const verifyOnly = process.argv.includes("--verify");

const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const log = (m) => console.log(`[34b] ${m}`);
let fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) fail++;
};

// ------------------------------------------------ 1. archive must be intact
const manifest = readFileSync(path.join(ARCHIVE, "MANIFEST.sha256"), "utf8").trim().split("\n");
for (const line of manifest) {
  const [hash, file] = line.trim().split(/\s+/);
  check(`archive intact: ${file}`, sha(path.join(ARCHIVE, file)) === hash);
}

const ARCHIVED = [
  "20261007183000_postgresql_baseline",
  "20261010000000_phase30_storage_metadata",
  "20261010000001_phase32_tenant_isolation",
];

/**
 * PostgreSQL parity migration.
 * The archived Phase 32 PostgreSQL migration adds `content_media.organizationId`
 * and its index but NEVER the foreign key — the baseline could not, because the
 * column did not exist yet. On PostgreSQL that leaves the database drifted from
 * schema.prisma (missing `content_media_organizationId_fkey`). This migration
 * closes that gap. It does not edit any archived file.
 */
const FK_MIGRATION = "20261010000003_phase34_content_media_fk";
const DEFAULT_MIGRATION = "20261010000004_phase34_drop_updatedat_default";
const FK_SQL = `-- Phase 34B — PostgreSQL parity fix (found by offline analysis, not by running PG).
--
-- The archived Phase 32 PostgreSQL migration adds "content_media"."organizationId"
-- and its index, but never the FOREIGN KEY. The baseline could not add it either,
-- because the column did not exist when the baseline ran. Result: a PostgreSQL
-- database built from the archive is missing
--   content_media_organizationId_fkey
-- and therefore does not match prisma/schema.prisma.
--
-- This is an ADDITIVE migration in the PostgreSQL workspace only. No archived
-- file is modified; the SQLite history is untouched (SQLite needed a table
-- rebuild instead, which is migration 20261010000002 in prisma/migrations).
--
-- Safety: the constraint can only fail to validate if some row already points at
-- a deleted organization. On a fresh staging database there are no rows. On an
-- existing database, run
--   SELECT count(*) FROM "content_media" c LEFT JOIN "organizations" o
--     ON o."id" = c."organizationId"
--    WHERE c."organizationId" IS NOT NULL AND o."id" IS NULL;
-- first; a non-zero result must be remediated, never force-validated.

ALTER TABLE "content_media"
  ADD CONSTRAINT "content_media_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
`;

/**
 * PostgreSQL parity migration #2.
 * Phase 30 added `updatedAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`.
 * prisma/schema.prisma declares `updatedAt DateTime @updatedAt` with NO database
 * default, so Prisma's canonical DDL has no default. PostgreSQL therefore
 * reports drift (`default changed from Some(Now) to None`), which would make
 * `migrate dev` emit a spurious migration on every run and make `migrate diff`
 * fail in CI. Prisma sets the value client-side for @updatedAt, so dropping the
 * server default restores parity without changing application behaviour.
 */
const DEFAULT_SQL = `-- Phase 34B — PostgreSQL parity fix #2 (found by migrate diff on real PG 17).
--
-- Phase 30 introduced "updatedAt" ... NOT NULL DEFAULT CURRENT_TIMESTAMP.
-- prisma/schema.prisma declares @updatedAt with no database default, so the
-- canonical column is NOT NULL with NO default. Leaving the server default in
-- place makes every future prisma migrate diff report drift and makes
-- prisma migrate dev want to create a no-op migration forever.
--
-- @updatedAt is applied by Prisma Client on insert and update, so no row can end
-- up with a NULL/absent value. No data is changed by this statement.

ALTER TABLE "content_media" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "message_attachments" ALTER COLUMN "updatedAt" DROP DEFAULT;
`;

if (verifyOnly) {
  check("workspace schema exists", existsSync(path.join(WS, "schema.prisma")));
  check("workspace lock is postgresql", existsSync(path.join(WS_MIGRATIONS, "migration_lock.toml")) && /postgresql/.test(readFileSync(path.join(WS_MIGRATIONS, "migration_lock.toml"), "utf8")));
  for (const name of [...ARCHIVED, FK_MIGRATION, DEFAULT_MIGRATION]) {
    const f = path.join(WS_MIGRATIONS, name, "migration.sql");
    check(`workspace migration ${name}`, existsSync(f));
  }
  const lock = readFileSync(path.join(WS_MIGRATIONS, "migration_lock.toml"), "utf8");
  check("workspace lock does not leak into SQLite dir", readFileSync(path.join(ROOT, "prisma", "migrations", "migration_lock.toml"), "utf8").includes("sqlite"));
  void lock;
  console.log(`\n${fail ? "✗" : "✓"} workspace verification: ${fail} problem(s)`);
  process.exit(fail ? 1 : 0);
}

// ------------------------------------------------------ 2. build the tree
mkdirSync(WS_MIGRATIONS, { recursive: true });
for (const name of ARCHIVED) {
  const src = path.join(ARCHIVE, name, "migration.sql");
  const dir = path.join(WS_MIGRATIONS, name);
  mkdirSync(dir, { recursive: true });
  copyFileSync(src, path.join(dir, "migration.sql"));
  check(`copied ${name} verbatim`, sha(src) === sha(path.join(dir, "migration.sql")));
}
mkdirSync(path.join(WS_MIGRATIONS, FK_MIGRATION), { recursive: true });
writeFileSync(path.join(WS_MIGRATIONS, FK_MIGRATION, "migration.sql"), FK_SQL);
log(`added ${FK_MIGRATION} (PostgreSQL parity: missing tenant foreign key)`);

mkdirSync(path.join(WS_MIGRATIONS, DEFAULT_MIGRATION), { recursive: true });
writeFileSync(path.join(WS_MIGRATIONS, DEFAULT_MIGRATION, "migration.sql"), DEFAULT_SQL);
log(`added ${DEFAULT_MIGRATION} (PostgreSQL parity: drop undeclared updatedAt default)`);

writeFileSync(path.join(WS_MIGRATIONS, "migration_lock.toml"), 'provider = "postgresql"\n');
log('wrote prisma/postgresql/migrations/migration_lock.toml -> provider = "postgresql"');

// ------------------------------------------- 3. isolation assertions
const sqliteLock = readFileSync(path.join(ROOT, "prisma", "migrations", "migration_lock.toml"), "utf8");
check("SQLite lock untouched (sqlite)", /sqlite/.test(sqliteLock));
check("active schema provider untouched (sqlite)", /provider = "sqlite"/.test(readFileSync(path.join(ROOT, "prisma", "schema.prisma"), "utf8")));
check("no PostgreSQL migration leaked into the SQLite history", !existsSync(path.join(ROOT, "prisma", "migrations", FK_MIGRATION)));

for (const line of manifest) {
  const [hash, file] = line.trim().split(/\s+/);
  check(`archive still intact after build: ${file}`, sha(path.join(ARCHIVE, file)) === hash);
}

console.log(`\n${fail ? "✗" : "✓"} workspace built: ${fail} problem(s)`);
process.exit(fail ? 1 : 0);
