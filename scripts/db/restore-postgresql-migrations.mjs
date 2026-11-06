#!/usr/bin/env node
/**
 * Phase 33G — restore the preserved PostgreSQL migration history.
 *
 * Run this ONLY when a PostgreSQL deployment is actually being prepared.
 * The current SQLite history is moved aside (never deleted) first.
 *
 *   node scripts/db/restore-postgresql-migrations.mjs --dry-run
 *   node scripts/db/restore-postgresql-migrations.mjs --force
 */
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ARCHIVE = path.join(ROOT, "prisma", "migrations.postgresql");
const LIVE = path.join(ROOT, "prisma", "migrations");
const dryRun = process.argv.includes("--dry-run");
const force = process.argv.includes("--force");

const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const fail = (m) => { console.error(`REFUSED: ${m}`); process.exit(2); };

if (!existsSync(path.join(ARCHIVE, "MANIFEST.sha256"))) fail("no manifest in prisma/migrations.postgresql");

// 1. verify every archived file against the manifest before trusting it
const manifest = readFileSync(path.join(ARCHIVE, "MANIFEST.sha256"), "utf8").trim().split("\n");
for (const line of manifest) {
  const [hash, file] = line.trim().split(/\s+/);
  const full = path.join(ARCHIVE, file);
  if (!existsSync(full)) fail(`archived file missing: ${file}`);
  if (sha(full) !== hash) fail(`hash mismatch for ${file} — archive is corrupt`);
}
console.log(`[restore] manifest verified: ${manifest.length} file(s), all hashes match`);

const entries = readdirSync(ARCHIVE, { withFileTypes: true }).filter((e) => e.isDirectory() || e.name === "migration_lock.toml");
const liveNonEmpty = existsSync(LIVE) && readdirSync(LIVE).length > 0;

const backupDir = path.join(ROOT, "prisma", `migrations.sqlite-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`);

if (dryRun) {
  console.log(`[restore] DRY RUN — would:`);
  if (liveNonEmpty) console.log(`          1. move ${path.relative(ROOT, LIVE)} -> ${path.relative(ROOT, backupDir)}`);
  console.log(`          ${liveNonEmpty ? 2 : 1}. copy ${entries.length} PostgreSQL entr(ies) into ${path.relative(ROOT, LIVE)}`);
  console.log(`          ${liveNonEmpty ? 3 : 2}. remind you to confirm schema.prisma provider = "postgresql"`);
  process.exit(0);
}

if (liveNonEmpty && !force) {
  fail(`prisma/migrations is not empty. Re-run with --force to move it aside to prisma/migrations.sqlite-backup-<timestamp>/.`);
}


if (liveNonEmpty) {
  renameSync(LIVE, backupDir);
  console.log(`[restore] moved current history -> ${path.relative(ROOT, backupDir)} (nothing deleted)`);
}
mkdirSync(LIVE, { recursive: true });

function copyTree(src, dst) {
  if (statSync(src).isDirectory()) {
    mkdirSync(dst, { recursive: true });
    for (const e of readdirSync(src, { withFileTypes: true })) {
      if (e.name === "MANIFEST.sha256" || e.name === "README.md") continue;
      copyTree(path.join(src, e.name), path.join(dst, e.name));
    }
  } else {
    copyFileSync(src, dst);
  }
}
for (const e of entries) copyTree(path.join(ARCHIVE, e.name), path.join(LIVE, e.name));

// verify the restore
for (const line of manifest) {
  const [hash, file] = line.trim().split(/\s+/);
  if (sha(path.join(LIVE, file)) !== hash) fail(`restored file does not match manifest: ${file}`);
}
console.log(`[restore] restored and verified ${entries.length} entr(ies) into prisma/migrations`);
console.log(`[restore] REMINDER: set schema.prisma datasource provider = "postgresql" and a PostgreSQL DATABASE_URL.`);
console.log(`[restore] REMINDER: this history has NEVER been executed on a real PostgreSQL server — NOT VERIFIED.`);
