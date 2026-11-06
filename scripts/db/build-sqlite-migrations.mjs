#!/usr/bin/env node
/**
 * Phase 33C — build the SQLite variants of the portable migrations from the
 * preserved PostgreSQL originals, applying ONLY documented repairs.
 *
 * Originals live in prisma/migrations.postgresql/ and are never modified.
 * The output must differ from them solely by the substitutions listed below;
 * the script asserts that, so the delta is auditable and cannot drift silently.
 *
 *   node scripts/db/build-sqlite-migrations.mjs
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PG = path.join(ROOT, "prisma", "migrations.postgresql");
const SQLITE = path.join(ROOT, "prisma", "migrations");
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const log = (m) => console.log(`[33c] ${m}`);

/**
 * SQLite rejects `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT CURRENT_TIMESTAMP`
 * the moment the table contains a row ("Cannot add a column with non-constant
 * default"), so the column is added nullable, filled from createdAt, and the
 * NOT NULL constraint is applied by the Phase 33 table rebuild.
 */
function repairUpdatedAt(sql, table) {
  const from = `ALTER TABLE "${table}" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`;
  const to =
    `-- Phase 33 SQLite repair: a non-constant DEFAULT (CURRENT_TIMESTAMP) is rejected by\n` +
    `-- SQLite ADD COLUMN as soon as "${table}" contains a row, so the column is added\n` +
    `-- nullable, backfilled from createdAt, and made NOT NULL by the Phase 33 rebuild.\n` +
    `ALTER TABLE "${table}" ADD COLUMN "updatedAt" DATETIME;\n` +
    `UPDATE "${table}" SET "updatedAt" = COALESCE("createdAt", CURRENT_TIMESTAMP) WHERE "updatedAt" IS NULL;`;
  if (!sql.includes(from)) throw new Error(`expected updatedAt statement not found in ${table}`);
  return sql.replace(from, to);
}

const BUILDS = [
  {
    name: "20261010000000_phase30_storage_metadata",
    repairs: [
      { label: "content_media.updatedAt non-constant default", apply: (s) => repairUpdatedAt(s, "content_media") },
      { label: "message_attachments.updatedAt non-constant default", apply: (s) => repairUpdatedAt(s, "message_attachments") },
    ],
  },
  { name: "20261010000001_phase32_tenant_isolation", repairs: [] },
];

for (const build of BUILDS) {
  const src = path.join(PG, build.name, "migration.sql");
  if (!existsSync(src)) throw new Error(`missing preserved original ${src}`);
  const original = readFileSync(src, "utf8");
  let out = original;
  for (const r of build.repairs) out = r.apply(out);

  const header =
    `-- Phase 33C SQLite variant of ${build.name}.\n` +
    `-- Source of truth (PostgreSQL original): prisma/migrations.postgresql/${build.name}/migration.sql\n` +
    `-- Original sha256: ${sha(src)}\n` +
    `-- DELTA: ${build.repairs.length === 0 ? "none — byte-identical apart from this header" : build.repairs.map((r) => r.label).join("; ")}\n` +
    `-- Every other statement is unchanged. Applies to SQLite only.\n\n`;

  const dir = path.join(SQLITE, build.name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "migration.sql"), header + out);
  log(`${build.name}: ${build.repairs.length} repair(s)`);
}

// The remaining migration is a pure SQLite reconciliation, not derived from PG.
const reconcile = path.join(SQLITE, "20261010000002_phase33_sqlite_file_integrity", "migration.sql");
if (!existsSync(reconcile)) throw new Error("phase33 reconciliation migration missing — regenerate it first");
log(`20261010000002_phase33_sqlite_file_integrity: SQLite-only (${readFileSync(reconcile, "utf8").split("\n").length} lines)`);

// Prove the originals are untouched.
for (const entry of readFileSync(path.join(PG, "MANIFEST.sha256"), "utf8").trim().split("\n")) {
  const [hash, file] = entry.split(/\s+/);
  if (sha(path.join(PG, file)) !== hash) throw new Error(`PostgreSQL original modified: ${file}`);
}
log("PostgreSQL originals verified against MANIFEST.sha256 (unchanged)");
