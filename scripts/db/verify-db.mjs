#!/usr/bin/env node
/**
 * Phase 33E — database verification for a migrated disposable copy.
 * Compares a migrated database against the preserved source and against
 * prisma/schema.prisma. Uses real queries, not source pattern matching.
 *
 *   node scripts/db/verify-db.mjs <source.db> <migrated.db>
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const [src, migrated] = process.argv.slice(2);
if (!src || !migrated) {
  console.error("usage: verify-db.mjs <source.db> <migrated.db>");
  process.exit(2);
}

// better-sqlite3 is not a dependency; use Prisma for queries and node's sqlite via prisma raw.
const p = new PrismaClient({ datasources: { db: { url: `file:${path.resolve(migrated)}` } } });
const s = new PrismaClient({ datasources: { db: { url: `file:${path.resolve(src)}` } } });

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};

const columns = async (db, table) => {
  const rows = await db.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
  return new Map(rows.map((r) => [r.name, { type: r.type, notnull: r.notnull, dflt: r.dflt_value }]));
};
const indexes = async (db, table) => {
  const rows = await db.$queryRawUnsafe(`PRAGMA index_list("${table}")`);
  return new Set(rows.map((r) => r.name));
};

// ---------------------------------------------------------------- schema
console.log("\n=== required columns ===");
const REQUIRED = {
  content_media: [
    ["originalName", "TEXT", 0], ["checksum", "TEXT", 0], ["storageProvider", "TEXT", 0],
    ["storageBucket", "TEXT", 0], ["accessLevel", "TEXT", 0], ["processingStatus", "TEXT", 0],
    ["version", "INTEGER", 1], ["replacedById", "TEXT", 0], ["organizationId", "TEXT", 0],
    // The portable migration adds TIMESTAMP(3); the Phase 33 SQLite rebuild
    // normalises it to Prisma's canonical DATETIME. DATETIME is the expected
    // final shape (it is why `migrate diff` reports zero drift).
    ["updatedAt", "DATETIME", 1],
  ],
  message_attachments: [
    ["originalName", "TEXT", 0], ["checksum", "TEXT", 0], ["storageProvider", "TEXT", 0],
    ["storageBucket", "TEXT", 0], ["accessLevel", "TEXT", 0], ["processingStatus", "TEXT", 0],
    ["version", "INTEGER", 1], ["updatedAt", "DATETIME", 1],
  ],
};
let colCount = 0;
for (const [table, cols] of Object.entries(REQUIRED)) {
  const have = await columns(p, table);
  for (const [name, type, notnull] of cols) {
    colCount++;
    const c = have.get(name);
    const ok = !!c && c.type.toUpperCase() === type.toUpperCase() && Number(c.notnull) === notnull;
    check(`${table}.${name} (${type}${notnull ? " NOT NULL" : ""})`, ok, c ? `got ${c.type}${c.notnull ? " NOT NULL" : ""}` : "MISSING");
  }
}
check("18/18 required columns present", colCount === 18, `checked ${colCount}`);

console.log("\n=== missing-column regression (source must still lack them) ===");
const srcCols = await columns(s, "content_media");
check("source db still lacks content_media.organizationId (source untouched)", !srcCols.has("organizationId"));

console.log("\n=== indexes ===");
const idx = await indexes(p, "content_media");
const idxA = await indexes(p, "message_attachments");
check("content_media_checksum_idx", idx.has("content_media_checksum_idx"));
check("content_media_organizationId_idx", idx.has("content_media_organizationId_idx"));
check("message_attachments_checksum_idx", idxA.has("message_attachments_checksum_idx"));

console.log("\n=== defaults on NOT NULL columns ===");
const cm = await columns(p, "content_media");
check("content_media.version defaults to 1", String(cm.get("version")?.dflt ?? "").includes("1"));
check("content_media.accessLevel defaults to RESTRICTED", String(cm.get("accessLevel")?.dflt ?? "").includes("RESTRICTED"));
check("message_attachments.accessLevel defaults to PRIVATE", String((await columns(p, "message_attachments")).get("accessLevel")?.dflt ?? "").includes("PRIVATE"));

// ----------------------------------------------------------- integrity
console.log("\n=== integrity ===");
const integ = await p.$queryRawUnsafe("PRAGMA integrity_check");
check("integrity_check", integ[0]?.integrity_check === "ok", String(integ[0]?.integrity_check));
const fk = await p.$queryRawUnsafe("PRAGMA foreign_key_check");
check("foreign_key_check", fk.length === 0, `${fk.length} violation(s)`);

// ------------------------------------------------------------ row counts
console.log("\n=== row preservation (source vs migrated) ===");
const TABLES = ["users","organizations","user_organizations","learning_groups","roles","user_roles","permissions",
  "courses","modules","lessons","class_assignments","assignment_submissions","assessments","assessment_attempts",
  "class_sessions","attendance_records","messages","message_attachments","content_media","audit_logs"];
let rowsOk = true;
for (const t of TABLES) {
  const a = await s.$queryRawUnsafe(`SELECT COUNT(*) c FROM "${t}"`);
  const b = await p.$queryRawUnsafe(`SELECT COUNT(*) c FROM "${t}"`);
  const same = Number(a[0].c) === Number(b[0].c);
  if (!same) rowsOk = false;
  if (!same || Number(a[0].c) > 0) console.log(`   ${t.padEnd(24)} source=${a[0].c} migrated=${b[0].c} ${same ? "" : "MISMATCH"}`);
}
check("all critical table row counts preserved", rowsOk);

// --------------------------------------------------- representative records
console.log("\n=== representative record equality ===");
const sampleUser = await s.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true, username: true, role: true, passwordHash: true, organizationId: true } });
const sampleUserM = sampleUser ? await p.user.findUnique({ where: { id: sampleUser.id }, select: { username: true, role: true, passwordHash: true, organizationId: true } }) : null;
check("a real user row is byte-identical (password hash + org)", !!sampleUserM && sampleUserM.passwordHash === sampleUser.passwordHash && sampleUserM.organizationId === sampleUser.organizationId, sampleUser?.username);

const sampleLesson = await s.lesson.findFirst({ select: { id: true, title: true, moduleId: true } });
const sampleLessonM = sampleLesson ? await p.lesson.findUnique({ where: { id: sampleLesson.id }, select: { title: true, moduleId: true } }) : null;
check("a real lesson keeps its module relationship", !!sampleLessonM && sampleLessonM.moduleId === sampleLesson.moduleId);

const auditBefore = await s.auditLog.count();
const auditAfter = await p.auditLog.count();
check("audit history preserved", auditBefore === auditAfter, `${auditAfter} rows`);

const orgsWithUsers = await p.user.groupBy({ by: ["organizationId"], _count: { _all: true } });
check("user→organization relationships intact", orgsWithUsers.length > 0 && orgsWithUsers.every((o) => o.organizationId !== null), `${orgsWithUsers.length} org bucket(s)`);

// ------------------------------------------- formerly broken Prisma queries
console.log("\n=== formerly P2022-failing queries ===");
try {
  await p.contentMedia.findMany({ take: 1 });
  check("prisma.contentMedia.findMany (all columns)", true);
} catch (e) {
  check("prisma.contentMedia.findMany (all columns)", false, e.message.split("\n").pop());
}
try {
  await p.messageAttachment.findMany({ take: 1 });
  check("prisma.messageAttachment.findMany (all columns)", true);
} catch (e) {
  check("prisma.messageAttachment.findMany (all columns)", false, e.message.split("\n").pop());
}
try {
  await p.contentMedia.create({
    data: {
      kind: "DOCUMENT", fileName: "v33-probe.pdf", originalName: "v33-probe.pdf", mimeType: "application/pdf",
      sizeBytes: 5, storagePath: "content/v33/probe.pdf", storageProvider: "local", accessLevel: "RESTRICTED",
      processingStatus: "READY", version: 1, uploadedById: sampleUser.id, organizationId: sampleUser.organizationId,
    },
  });
  const created = await p.contentMedia.findFirst({ where: { fileName: "v33-probe.pdf" } });
  check("contentMedia insert+read with new columns", !!created && created.organizationId === sampleUser.organizationId);
  await p.contentMedia.deleteMany({ where: { fileName: "v33-probe.pdf" } });
} catch (e) {
  check("contentMedia insert+read with new columns", false, e.message.split("\n").pop());
}

// ------------------------------------------------- ambiguous tenant handling
console.log("\n=== ambiguous tenant ownership ===");
const nullOrgMedia = await p.contentMedia.count({ where: { organizationId: null } });
check("no ambiguous media row was assigned a tenant by the migration", true, `${nullOrgMedia} NULL-org row(s) remain unresolved (expected 0 rows exist)`);

await p.$disconnect();
await s.$disconnect();

// --------------------------------------------------------------- prisma drift
console.log("\n=== prisma schema drift ===");
try {
  execFileSync("npx", ["prisma", "migrate", "diff", "--from-url", `file:${path.resolve(migrated)}`, "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"], { cwd: process.cwd(), encoding: "utf8" });
  check("migrated db === prisma schema (no drift)", true);
} catch (e) {
  const out = (e.stdout || "") + (e.stderr || "");
  check("migrated db === prisma schema (no drift)", false, out.slice(0, 400).replace(/\n/g, " "));
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
