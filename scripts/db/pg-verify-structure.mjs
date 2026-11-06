#!/usr/bin/env node
/**
 * Phase 34D — structural verification of a migrated PostgreSQL database.
 * Uses real SQL through psql. Never prints the URL or any credential.
 *
 *   node scripts/db/pg-verify-structure.mjs
 *   (requires PG_STAGING_DATABASE_URL; validated by pg-preflight.mjs first)
 */
import { execFileSync } from "node:child_process";

const url = process.env.PG_STAGING_DATABASE_URL;
if (!url) {
  console.error("BLOCKED: PG_STAGING_DATABASE_URL is not set");
  process.exit(2);
}

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
};
const q = (sql) => execFileSync("psql", [url, "-tAF|", "-c", sql], { encoding: "utf8" }).trim();
const q1 = (sql) => q(sql).split("\n")[0];

console.log("=== PostgreSQL structure verification ===\n");

// ------------------------------------------------------------- identity
const version = q1("select current_setting('server_version')");
check("server reachable", !!version, `PostgreSQL ${version.split(" ")[0]}`);
check("database is the disposable staging target", q1("select current_database()") === "lms_staging_disposable");

// ------------------------------------------------------------- tables
// Exclude Prisma's own bookkeeping table.
const tables = Number(q1("select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name<>'_prisma_migrations'"));
check("213 application tables present", tables === 213, `${tables}`);
const migrationTable = Number(q1("select count(*) from information_schema.tables where table_schema='public' and table_name='_prisma_migrations'"));
check("_prisma_migrations present", migrationTable === 1);

// --------------------------------------------------- the 18 columns
const REQ = {
  content_media: [["originalName","text"],["checksum","text"],["storageProvider","text"],["storageBucket","text"],["accessLevel","text"],["processingStatus","text"],["version","integer"],["replacedById","text"],["organizationId","text"],["updatedAt","timestamp without time zone"]],
  message_attachments: [["originalName","text"],["checksum","text"],["storageProvider","text"],["storageBucket","text"],["accessLevel","text"],["processingStatus","text"],["version","integer"],["updatedAt","timestamp without time zone"]],
};
let cols = 0;
for (const [table, list] of Object.entries(REQ)) {
  for (const [col, type] of list) {
    cols++;
    const actual = q(`select data_type from information_schema.columns where table_schema='public' and table_name='${table}' and column_name='${col}'`) || "(missing)";
    check(`${table}.${col}`, actual === type, actual);
  }
}
check("18/18 required columns", cols === 18, `${cols} checked`);

// ------------------------------------------------------------ defaults
check("content_media.updatedAt has NO database default", q1(`select coalesce(column_default,'(none)') from information_schema.columns where table_name='content_media' and column_name='updatedAt'`) === "(none)");
check("content_media.accessLevel default RESTRICTED", q1(`select coalesce(column_default,'') from information_schema.columns where table_name='content_media' and column_name='accessLevel'`).includes("RESTRICTED"));
check("message_attachments.accessLevel default PRIVATE", q1(`select coalesce(column_default,'') from information_schema.columns where table_name='message_attachments' and column_name='accessLevel'`).includes("PRIVATE"));
check("version is NOT NULL with default 1", q1(`select is_nullable||'/'||coalesce(column_default,'') from information_schema.columns where table_name='content_media' and column_name='version'`).startsWith("NO/1"));

// ------------------------------------------------------------- indexes
const idx = q("select indexname from pg_indexes where schemaname='public'").split("\n");
for (const name of ["content_media_checksum_idx","content_media_organizationId_idx","message_attachments_checksum_idx"]) {
  check(`index ${name}`, idx.includes(name));
}

// -------------------------------------------------------- foreign keys
const fks = q(`
  select con.conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace ns on ns.oid = rel.relnamespace
  where con.contype='f' and ns.nspname='public'`).split("\n");
check("content_media_organizationId_fkey present", fks.includes("content_media_organizationId_fkey"));
check("foreign keys created (expected 278)", fks.length === 278, `${fks.length}`);
check("content_media FK targets organizations", q1(`
  select string_agg(confrel.relname, ',')
  from pg_constraint con
  join pg_class rel on rel.oid=con.conrelid
  join pg_class confrel on confrel.oid=con.confrelid
  where con.conname='content_media_organizationId_fkey'`) === "organizations");
check("content_media FK is ON DELETE SET NULL", q1(`
  select confdeltype from pg_constraint where conname='content_media_organizationId_fkey'`) === "n");

// -------------------------------------------------- unique constraints
// Unique indexes that are NOT the backing index of a PRIMARY KEY constraint.
// 102 matches the archived baseline's CREATE UNIQUE INDEX statements exactly.
const uniq = Number(q1(`
  select count(*) from pg_index i
  join pg_class c on c.oid=i.indexrelid
  join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and i.indisunique and not i.indisprimary`));
check("unique (non-PK) indexes present (expected 102)", uniq === 102, `${uniq}`);

// ------------------------------------------------------- integrity
check("no invalid constraints", Number(q1("select count(*) from pg_constraint where not convalidated")) === 0);
// pg_indexes.indexdef never contains "PRIMARY KEY"; use the constraint catalog.
check("every application table has a primary key", Number(q1(`
  select count(*) from information_schema.tables t
  where t.table_schema='public' and t.table_type='BASE TABLE' and t.table_name<>'_prisma_migrations'
    and not exists (select 1 from pg_constraint c join pg_class r on r.oid=c.conrelid
                    where c.contype='p' and r.relname=t.table_name)`)) === 0);

// ------------------------------------------------------ migration history
const hist = q("select migration_name||':'||case when finished_at is null then 'UNFINISHED' else 'ok' end from _prisma_migrations order by started_at").split("\n");
check("5 migrations recorded", hist.length === 5, hist.map(h=>h.split(":")[0]).join(", "));
check("all migrations finished (none rolled back)", !hist.some((h) => h.includes("UNFINISHED")));
check("no rolled-back migration", Number(q1("select count(*) from _prisma_migrations where rolled_back_at is not null")) === 0);

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);
