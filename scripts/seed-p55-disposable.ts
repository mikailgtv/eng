import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = process.cwd();
const src = path.join(root, "prisma/dev.db");
const dst = "/tmp/p55_run1.db";
fs.copyFileSync(src, dst);
console.log(`copied dev.db ${crypto.createHash("sha256").update(fs.readFileSync(src)).digest("hex").slice(0,8)} to ${dst}`);
process.env.DATABASE_URL = `file:${dst}`;
async function run(){
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${dst}` } } });
  const user = await prisma.user.findFirst({ where: { email: "james.carter@student.local" }}) || await prisma.user.findFirst({ where: { role: "STUDENT" }});
  if (!user) throw new Error("no student");
  console.log(`student ${user.email} ${user.id} group=${user.groupId}`);
  // find 3 published vocab
  const vocabs = await prisma.vocabulary.findMany({ where: { lesson: { status: "PUBLISHED", module: { status: "PUBLISHED" } } }, take: 3, orderBy: { word: "asc" } });
  if (vocabs.length <3) throw new Error(`need 3 vocab got ${vocabs.length}`);
  console.log(`vocabs: ${vocabs.map(v=>v.word).join(", ")}`);
  await prisma.vocabularyReview.deleteMany({ where: { studentId: user.id } });
  // 2 due: yesterday and now-1h, 1 upcoming: tomorrow
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24*60*60*1000);
  const oneHourAgo = new Date(now.getTime() - 60*60*1000);
  const tomorrow = new Date(now.getTime() + 24*60*60*1000);
  await prisma.vocabularyReview.createMany({ data: [
    { studentId: user.id, vocabularyId: vocabs[0].id, status: "LEARNING", correctCount: 0, incorrectCount: 0, lastReviewedAt: yesterday, dueAt: yesterday, createdAt: yesterday, updatedAt: yesterday },
    { studentId: user.id, vocabularyId: vocabs[1].id, status: "LEARNING", correctCount: 1, incorrectCount: 0, lastReviewedAt: oneHourAgo, dueAt: oneHourAgo, createdAt: oneHourAgo, updatedAt: oneHourAgo },
    { studentId: user.id, vocabularyId: vocabs[2].id, status: "LEARNING", correctCount: 2, incorrectCount: 0, lastReviewedAt: now, dueAt: tomorrow, createdAt: now, updatedAt: now },
  ]});
  const due = await prisma.vocabularyReview.findMany({ where: { studentId: user.id }});
  console.log(`seeded ${due.length} reviews for ${user.email}:`, due.map(r=>`${r.vocabularyId.slice(0,6)} due=${r.dueAt ? r.dueAt.toISOString() : 'null'} streak=${r.correctCount}`));
  await prisma.$disconnect();
  console.log("done");
}
run().catch(e=>{ console.error(e); process.exit(1); });
