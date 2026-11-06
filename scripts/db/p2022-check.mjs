#!/usr/bin/env node
/**
 * Phase 33E — explicit P2022 before/after probe.
 *   node scripts/db/p2022-check.mjs [db-path]
 * Prints the real result of the two queries that used to fail.
 */
import { PrismaClient } from "@prisma/client";
import path from "node:path";

const target = process.argv[2] ?? "prisma/dev.db";
const p = new PrismaClient({ datasources: { db: { url: `file:${path.resolve(target)}` } } });
console.log(`db: ${target}`);

let bad = 0;
for (const [label, fn] of [
  ["contentMedia.findFirst (all columns)", () => p.contentMedia.findFirst()],
  ["messageAttachment.findFirst (all columns)", () => p.messageAttachment.findFirst()],
  ["contentMedia.count", () => p.contentMedia.count()],
]) {
  try {
    await fn();
    console.log(`  OK    ${label}`);
  } catch (e) {
    bad++;
    console.log(`  FAIL  ${label}: ${e.code ?? ""} ${String(e.message).split("\n").pop()}`);
  }
}
await p.$disconnect();
process.exit(bad ? 1 : 0);
