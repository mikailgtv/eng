#!/usr/bin/env node
/**
 * Phase 33D — migration rehearsal on a disposable copy.
 *
 * Proves, on a byte-identical copy of prisma/dev.db:
 *   1. the source is never opened for writing and its hash is unchanged;
 *   2. the baseline is marked applied (supported mechanism), then the three
 *      migrations are deployed by Prisma itself;
 *   3. rows that exist BEFORE the file-table rebuild still exist AFTER it,
 *      with identical values, including pre-existing file metadata;
 *   4. the resulting database matches prisma/schema.prisma exactly (no drift);
 *   5. integrity + foreign keys are clean.
 *
 * Synthetic rows are inserted into the COPY ONLY, never into the source.
 *
 *   node scripts/db/rehearse-migration.mjs
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "prisma", "dev.db");
const WORK = path.join(ROOT, "e2e", "mig33");
const COPY = path.join(WORK, "rehearsal-clean.db");
const BASELINE = "20261001000000_sqlite_baseline";

const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const run = (args, env) =>
  execFileSync("npx", args, { cwd: ROOT, encoding: "utf8", env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
const log = (m) => console.log(`[33d] ${m}`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { console.log(`${ok ? "✓" : "✗"} ${n}${d ? ` — ${d}` : ""}`); ok ? pass++ : fail++; };

const srcHash = sha(SRC);
const srcSize = statSync(SRC).size;
log(`source ${srcHash} (${srcSize} bytes)`);

mkdirSync(WORK, { recursive: true });
rmSync(COPY, { force: true });
copyFileSync(SRC, COPY);
check("working copy hash equals source", sha(COPY) === srcHash);
check("working copy is the only migration target", path.resolve(COPY).startsWith(path.resolve(WORK)));

// ---------------------------------------------------------- synthetic rows
const db = new PrismaClient({ datasources: { db: { url: `file:${COPY}` } } });
const uploaderWithOrg = await db.user.findFirst({ where: { organizationId: { not: null } }, select: { id: true, organizationId: true } });
let uploaderNoOrg = await db.user.findFirst({ where: { organizationId: null }, select: { id: true } });
if (!uploaderNoOrg) {
  // Synthetic orphan uploader so the "ambiguous ownership must stay NULL" rule is
  // genuinely exercised. Created in the disposable COPY only.
  const id = "rehearsal-orphan-user";
  await db.$executeRawUnsafe(
    `INSERT INTO "users" ("id","employeeCode","firstName","lastName","username","passwordHash","role","status","organizationId","createdAt","updatedAt")
     VALUES (?,?,?,?,?,?,?,?,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
    id, "REHEARSAL_ORPHAN", "Orphan", "Uploader", "rehearsal.orphan", "$2a$04$notarealhashnotarealhashno", "STUDENT", "ACTIVE"
  );
  uploaderNoOrg = { id };
  log("created synthetic NULL-organization uploader in the disposable copy");
}
if (!uploaderWithOrg) throw new Error("no user with an organization — cannot rehearse");

// Legacy rows must be written with raw SQL: the CURRENT Prisma client always
// writes every schema column, but this database predates those columns. This is
// exactly how the old application created these rows.
const conv = await db.conversation.create({ data: { kind: "DIRECT", createdById: uploaderWithOrg.id } });
const msg = await db.message.create({ data: { conversationId: conv.id, senderId: uploaderWithOrg.id, body: "phase33 rehearsal message" } });

const attachId = "rehearsal-attach-1";
await db.$executeRawUnsafe(
  `INSERT INTO "message_attachments" ("id","messageId","fileName","mimeType","sizeBytes","storagePath","createdAt")
   VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
  attachId, msg.id, "pre-migration.pdf", "application/pdf", 11, "message_attachment/rehearsal/pre-migration.pdf"
);

const mediaA = "rehearsal-media-1";
await db.$executeRawUnsafe(
  `INSERT INTO "content_media" ("id","kind","fileName","mimeType","sizeBytes","storagePath","uploadedById","createdAt")
   VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
  mediaA, "DOCUMENT", "reliable-owner.pdf", "application/pdf", 12, "content/rehearsal/reliable-owner.pdf", uploaderWithOrg.id
);

let mediaB = null;
if (uploaderNoOrg) {
  mediaB = "rehearsal-media-2";
  await db.$executeRawUnsafe(
    `INSERT INTO "content_media" ("id","kind","fileName","mimeType","sizeBytes","storagePath","uploadedById","createdAt")
     VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
    mediaB, "DOCUMENT", "ambiguous-owner.pdf", "application/pdf", 13, "content/rehearsal/ambiguous-owner.pdf", uploaderNoOrg.id
  );
}
log(`seeded pre-migration rows: media=${mediaA}${mediaB ? `,${mediaB}` : ""} attachment=${attachId}`);

await db.$disconnect();

// ------------------------------------------------------------- migrations
log("marking baseline as applied (supported baselining, not a fabricated run record)");
const resolveOut = run(["prisma", "migrate", "resolve", "--applied", BASELINE], { DATABASE_URL: `file:${COPY}` });
check("baseline marked applied", /marked as applied/i.test(resolveOut));

log("deploying pending migrations with the Prisma migration engine");
let deployOut = "", deployOk = true;
try {
  deployOut = run(["prisma", "migrate", "deploy"], { DATABASE_URL: `file:${COPY}` });
} catch (e) {
  deployOk = false;
  deployOut = (e.stdout || "") + (e.stderr || "");
}
check("migrate deploy exited 0", deployOk, deployOk ? "" : deployOut.slice(0, 300));
const applied = [...deployOut.matchAll(/Applying migration `([^`]+)`/g)].map((m) => m[1]);
check("expected migrations applied", applied.length === 3, applied.join(", "));

const statusOut = run(["prisma", "migrate", "status"], { DATABASE_URL: `file:${COPY}` });
check("migrate status reports up to date", /up to date/i.test(statusOut));

// ---------------------------------------------------------------- verify
const db2 = new PrismaClient({ datasources: { db: { url: `file:${COPY}` } } });
const after = await db2.contentMedia.findMany({ where: { storagePath: { startsWith: "content/rehearsal/" } }, orderBy: { fileName: "asc" } });
check("pre-existing media rows survived the rebuild", after.length === (mediaB ? 2 : 1), `${after.length} row(s)`);

const reliable = after.find((r) => r.fileName === "reliable-owner.pdf");
check("reliable-owner row kept its checksum/metadata", !!reliable && reliable.sizeBytes === 12);
check("reliable-owner gained the tenant from its uploader", reliable?.organizationId === uploaderWithOrg.organizationId);
if (mediaB) {
  const ambiguous = after.find((r) => r.fileName === "ambiguous-owner.pdf");
  check("ambiguous-owner left WITHOUT a tenant (never guessed)", ambiguous?.organizationId === null);
}
const attachAfter = await db2.messageAttachment.findUnique({ where: { id: attachId } });
check("pre-existing attachment survived the rebuild", !!attachAfter && attachAfter.fileName === "pre-migration.pdf" && attachAfter.messageId === msg.id);
check("attachment default accessLevel applied", attachAfter?.accessLevel === "PRIVATE", String(attachAfter?.accessLevel));
check("media default accessLevel applied", reliable?.accessLevel === "RESTRICTED", String(reliable?.accessLevel));
check("updatedAt backfilled (not NULL) on pre-existing rows", !!reliable?.updatedAt && !!attachAfter?.updatedAt);

try {
  await db2.contentMedia.findMany({ take: 1 });
  await db2.messageAttachment.findMany({ take: 1 });
  check("all-column Prisma reads succeed (no P2022)", true);
} catch (e) {
  check("all-column Prisma reads succeed (no P2022)", false, e.message.split("\n").pop());
}

const integ = await db2.$queryRawUnsafe("PRAGMA integrity_check");
check("integrity_check", integ[0].integrity_check === "ok");
const fk = await db2.$queryRawUnsafe("PRAGMA foreign_key_check");
check("foreign_key_check", fk.length === 0, `${fk.length} violation(s)`);

const migrations = await db2.$queryRawUnsafe(`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at`);
check("migration history recorded 4 rows (baseline + 3)", migrations.length === 4, migrations.map((m) => m.migration_name).join(", "));
check("every recorded migration finished and none rolled back", migrations.every((m) => m.finished_at && !m.rolled_back_at));

// cleanup the synthetic rehearsal rows so the copy is pure for runtime tests
await db2.contentMedia.deleteMany({ where: { storagePath: { startsWith: "content/rehearsal/" } } });
await db2.messageAttachment.deleteMany({ where: { storagePath: { startsWith: "message_attachment/rehearsal/" } } });
await db2.message.deleteMany({ where: { body: "phase33 rehearsal message" } });
await db2.conversation.deleteMany({ where: { id: conv.id } });
await db2.$executeRawUnsafe(`DELETE FROM "users" WHERE "id" = 'rehearsal-orphan-user'`);
await db2.$disconnect();

// --------------------------------------------------------------- drift check
try {
  execFileSync("npx", ["prisma", "migrate", "diff", "--from-url", `file:${COPY}`, "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  check("migrated db matches prisma/schema.prisma (zero drift)", true);
} catch (e) {
  const out = ((e.stdout || "") + (e.stderr || "")).toString();
  check("migrated db matches prisma/schema.prisma (zero drift)", false, out.slice(0, 300).replace(/\n/g, " "));
}

const finalSrc = sha(SRC);
check("source database hash unchanged after rehearsal", finalSrc === srcHash, finalSrc);
check("source database size unchanged", statSync(SRC).size === srcSize);

console.log(`\n=== rehearsal: ${pass} passed, ${fail} failed ===`);
console.log(`migrated copy: ${path.relative(ROOT, COPY)}`);
process.exit(fail ? 1 : 0);
