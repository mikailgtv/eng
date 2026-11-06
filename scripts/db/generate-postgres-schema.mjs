#!/usr/bin/env node
/**
 * Phase 34B — generate the PostgreSQL Prisma schema from the single source of truth.
 *
 * Design: `prisma/schema.prisma` (provider = "sqlite") stays the ONLY schema that
 * is edited by hand. The PostgreSQL schema is a generated artifact that differs
 * from it by exactly one line (the datasource provider). This avoids maintaining
 * two copies of 4,300 lines / 213 models while still giving Prisma a valid
 * separate schema, which in turn gives PostgreSQL its own migrations directory
 * (`prisma/postgresql/migrations`) — Prisma 5.22 supports exactly one migrations
 * directory per schema, and this is how the two providers stay isolated.
 *
 * The script HARD-FAILS if the generated file differs by anything other than the
 * provider line, so the artifact can never silently drift from the real schema.
 *
 *   node scripts/db/generate-postgres-schema.mjs [--check]
 *
 *   --check : verify the committed artifact is current; do not write
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "prisma", "schema.prisma");
const OUT_DIR = path.join(ROOT, "prisma", "postgresql");
const OUT = path.join(OUT_DIR, "schema.prisma");
const checkOnly = process.argv.includes("--check");

const sha = (s) => createHash("sha256").update(s).digest("hex");
const source = readFileSync(SRC, "utf8");

// ---------------------------------------------------------------- transform
const DATASOURCE = /datasource\s+db\s*\{[^}]*\}/m;
const block = source.match(DATASOURCE);
if (!block) throw new Error("datasource block not found in prisma/schema.prisma");
if (!/provider\s*=\s*"sqlite"/.test(block[0])) {
  throw new Error(`expected provider = "sqlite" in the datasource block, got:\n${block[0]}`);
}
const replaced = block[0].replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
const generatedBody = source.replace(DATASOURCE, replaced);

// ------------------------------------------------------------- self-checks
const a = source.split("\n");
const b = generatedBody.split("\n");
if (a.length !== b.length) throw new Error("line count changed — refusing to write");
const changed = a.map((line, i) => (line === b[i] ? null : { i, from: line, to: b[i] })).filter(Boolean);
if (changed.length !== 1) {
  throw new Error(`expected exactly 1 changed line, found ${changed.length}: ${JSON.stringify(changed)}`);
}

const header =
  `// ⚠️  GENERATED FILE — DO NOT EDIT.\n` +
  `// Source of truth: prisma/schema.prisma (provider = "sqlite"), sha256 ${sha(source).slice(0, 16)}…\n` +
  `// Regenerate: node scripts/db/generate-postgres-schema.mjs\n` +
  `// The ONLY difference from the source is the datasource provider line.\n` +
  `// PostgreSQL migrations live in prisma/postgresql/migrations/ (separate tree).\n\n`;
const output = header + generatedBody;

if (checkOnly) {
  if (!existsSync(OUT)) {
    console.error("✗ prisma/postgresql/schema.prisma is missing — run the generator");
    process.exit(1);
  }
  const current = readFileSync(OUT, "utf8");
  if (current !== output) {
    console.error("✗ prisma/postgresql/schema.prisma is STALE — regenerate it");
    process.exit(1);
  }
  console.log("✓ PostgreSQL schema artifact is current (1-line delta vs prisma/schema.prisma)");
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, output);
console.log(`[34b] source     prisma/schema.prisma (${a.length} lines, sqlite)`);
console.log(`[34b] generated  prisma/postgresql/schema.prisma (${b.length + header.split("\n").length - 1} lines, postgresql)`);
console.log(`[34b] delta      exactly 1 line: ${changed[0].from.trim()}  ->  ${changed[0].to.trim()}`);
console.log(`[34b] provider-neutral check: @db.* annotations = ${(source.match(/@db\./g) ?? []).length}, enums = ${(source.match(/^enum /gm) ?? []).length}`);
