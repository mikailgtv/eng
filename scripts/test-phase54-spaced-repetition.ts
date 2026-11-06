/**
 * Phase 54 — spaced repetition regression (REAL, disposable DB)
 * Covers 12 required checks + integrity.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const sourceDb = path.join(root, "prisma", "dev.db");
const originalHash = crypto.createHash("sha256").update(fs.readFileSync(sourceDb)).digest("hex");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "p54-"));
const dbCopy = path.join(tempDir, "test.db");
fs.copyFileSync(sourceDb, dbCopy);
const originalUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = `file:${dbCopy}`;

const requireFromRoot = createRequire(path.join(root, "package.json"));
const reactModule = requireFromRoot("react");
if (typeof (reactModule as any).cache !== "function") (reactModule as any).cache = (fn: unknown) => fn;

const results: { name: string; ok: boolean; error?: string }[] = [];
function check(name: string, fn: () => void) {
  try { fn(); results.push({ name, ok: true }); console.log(`✓ ${name}`); } catch (e) { const msg = e instanceof Error ? e.message : String(e); results.push({ name, ok: false, error: msg }); console.log(`✗ ${name}\n    ${msg}`); }
}
async function checkAsync(name: string, fn: () => Promise<void>) {
  try { await fn(); results.push({ name, ok: true }); console.log(`✓ ${name}`); } catch (e) { const msg = e instanceof Error ? e.message : String(e); results.push({ name, ok: false, error: msg }); console.log(`✗ ${name}\n    ${msg}`); }
}

function daysDiff(due: Date, from: Date) { return Math.round((due.getTime() - from.getTime()) / (1000*60*60*24)); }

async function main(){
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbCopy}` } } });

  const { intervalForStreak, recordVocabularyResponse, getDueVocabulary, getUpcomingVocabulary, countDueVocabulary, countUpcomingVocabulary, getVocabularyReviewCounts } = await import("../src/lib/practice");
  const { getPracticeState } = await import("../src/lib/practice");
  const { PrismaClient: PC2 } = await import("@prisma/client");

  // Pick two students with same group assignment for isolation test
  const students = await prisma.user.findMany({ where: { role: "STUDENT" }, take: 3, orderBy: { id: "asc" } });
  assert.ok(students.length>=2, "need 2 students");
  const [sA, sB] = students;
  const vocab = await prisma.vocabulary.findFirst({ where: { lesson: { status: "PUBLISHED" } }, select: { id: true, word: true } });
  assert.ok(vocab, "need vocab");

  // Clean any existing review rows for these students+vocab to get deterministic
  await prisma.vocabularyReview.deleteMany({ where: { studentId: { in: [sA.id, sB.id] }, vocabularyId: vocab.id } });

  // 1. New card schedules next review correctly (1 day)
  await checkAsync("1: new card KNOWN → 1 day", async()=>{
    const before = new Date();
    const res = await recordVocabularyResponse(sA.id, vocab.id, "KNOWN");
    assert.equal(res.streak, 1);
    assert.equal(res.status, "LEARNING");
    const diff = daysDiff(res.dueAt, before);
    assert.equal(diff, 1, `expected 1 day, got ${diff}`);
  });
  // clean for next
  await prisma.vocabularyReview.deleteMany({ where: { studentId: sA.id, vocabularyId: vocab.id } });

  // 2. Consecutive successful reviews use 1,3,7,14,30
  await checkAsync("2: consecutive KNOWN intervals 1,3,7,14,30", async()=>{
    const intervals: number[] = [];
    for(let i=1;i<=5;i++){
      // need to bypass duplicate guard (3s) by manually setting lastReviewedAt to past
      if(i>1){
        await prisma.vocabularyReview.update({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } }, data: { lastReviewedAt: new Date(Date.now() - 10000) } });
      }
      const res = await recordVocabularyResponse(sA.id, vocab.id, "KNOWN");
      const expected = [1,3,7,14,30][i-1]!;
      const actual = daysDiff(res.dueAt, new Date());
      // allow ±1 due to time rounding
      assert.ok(Math.abs(actual-expected) <=1, `streak ${i} expected ${expected} got ${actual}`);
      intervals.push(actual);
      // also check intervalForStreak helper
      assert.equal(intervalForStreak(i), expected);
    }
    assert.deepEqual(intervals.map(v=>Math.round(v)), [1,3,7,14,30]);
    // 6th should stay 30
    await prisma.vocabularyReview.update({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } }, data: { lastReviewedAt: new Date(Date.now()-10000) } });
    const res6 = await recordVocabularyResponse(sA.id, vocab.id, "KNOWN");
    assert.equal(daysDiff(res6.dueAt, new Date()), 30);
    // streak should be 6
    assert.equal(res6.streak, 6);
  });
  await prisma.vocabularyReview.deleteMany({ where: { studentId: sA.id, vocabularyId: vocab.id } });

  // 3. Review again resets streak and schedules 1 day
  await checkAsync("3: NEED_REVIEW resets streak → 1 day", async()=>{
    // build streak 3 first
    for(let i=0;i<3;i++){
      await recordVocabularyResponse(sA.id, vocab.id, "KNOWN");
      await prisma.vocabularyReview.update({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } }, data: { lastReviewedAt: new Date(Date.now()-10000) } });
    }
    let row = await prisma.vocabularyReview.findUnique({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } } });
    assert.equal(row?.correctCount, 3);
    const res = await recordVocabularyResponse(sA.id, vocab.id, "NEED_REVIEW");
    assert.equal(res.streak, 0);
    assert.equal(res.status, "LEARNING");
    assert.equal(daysDiff(res.dueAt, new Date()), 1);
    row = await prisma.vocabularyReview.findUnique({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } } });
    assert.equal(row?.correctCount, 0);
    assert.equal(row?.incorrectCount, 1);
  });
  await prisma.vocabularyReview.deleteMany({ where: { studentId: sA.id, vocabularyId: vocab.id } });

  // 4. Future-due card does not appear in due queue
  await checkAsync("4: future-due not in due queue", async()=>{
    await recordVocabularyResponse(sA.id, vocab.id, "KNOWN"); // due in 1 day future
    const due = await getDueVocabulary(sA.id);
    const isDue = due.some(v=>v.vocabularyId===vocab.id);
    assert.equal(isDue, false, "should not be due yet");
    const upcoming = await getUpcomingVocabulary(sA.id);
    assert.ok(upcoming.some(v=>v.vocabularyId===vocab.id), "should be upcoming");
  });

  // 5. Due card appears in due queue (make it due by setting dueAt to past)
  await checkAsync("5: due card appears in due queue", async()=>{
    await prisma.vocabularyReview.update({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } }, data: { dueAt: new Date(Date.now()-1000) } });
    const due = await getDueVocabulary(sA.id);
    assert.ok(due.some(v=>v.vocabularyId===vocab.id), "should be due now");
    assert.equal(await countDueVocabulary(sA.id), due.length);
  });

  // 6. Review state persists after reload (simulate reload = re-query)
  await checkAsync("6: persists after reload (re-query)", async()=>{
    const before = await prisma.vocabularyReview.findUnique({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } } });
    // Simulate reload: new PrismaClient and re-query
    const p2 = new PC2({ datasources: { db: { url: `file:${dbCopy}` } } });
    const after = await p2.vocabularyReview.findUnique({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } } });
    assert.equal(before?.dueAt?.getTime(), after?.dueAt?.getTime());
    await p2.$disconnect();
  });

  // 7. Repeated requests do not create duplicate state or double advance (3s guard)
  await checkAsync("7: duplicate guard (3s) prevents double advance", async()=>{
    // current streak 1 (from earlier KNOWN), lastReviewedAt very recent (just now)
    const beforeRow = await prisma.vocabularyReview.findUnique({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } } });
    const beforeStreak = beforeRow?.correctCount;
    // Immediate second KNOWN should be treated as duplicate (within 3s)
    const dup = await recordVocabularyResponse(sA.id, vocab.id, "KNOWN");
    assert.equal(dup.streak, beforeStreak, "should not advance on duplicate");
    const afterRow = await prisma.vocabularyReview.findUnique({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } } });
    assert.equal(afterRow?.correctCount, beforeStreak);
    // After 10s, should advance
    await prisma.vocabularyReview.update({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } }, data: { lastReviewedAt: new Date(Date.now()-10000) } });
    const next = await recordVocabularyResponse(sA.id, vocab.id, "KNOWN");
    assert.equal(next.streak, (beforeStreak as number)+1);
  });

  // 8. Different learners have isolated review states
  await checkAsync("8: learner isolation", async()=>{
    // Use fresh vocab for isolation to avoid polluted state from previous steps
    const vocab2 = await prisma.vocabulary.findFirst({ where: { id: { not: vocab.id }, lesson: { status: "PUBLISHED" } }, select: { id: true } });
    assert.ok(vocab2, "need second vocab");
    await prisma.vocabularyReview.deleteMany({ where: { vocabularyId: vocab2.id, studentId: { in: [sA.id, sB.id] } } });
    // Create spaced repetition for sA, make it due
    await recordVocabularyResponse(sA.id, vocab2.id, "KNOWN");
    await prisma.vocabularyReview.update({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab2.id } }, data: { dueAt: new Date(Date.now()-1000) } });
    // sB has no review yet
    const bDueBefore = await getDueVocabulary(sB.id);
    assert.equal(bDueBefore.some(v=>v.vocabularyId===vocab2.id), false);
    await recordVocabularyResponse(sB.id, vocab2.id, "KNOWN");
    const aDue = await getDueVocabulary(sA.id);
    const bDue2 = await getDueVocabulary(sB.id);
    assert.ok(aDue.some(v=>v.vocabularyId===vocab2.id), "sA due");
    assert.equal(bDue2.some(v=>v.vocabularyId===vocab2.id), false, "sB not due (future)");
    const bUp = await getUpcomingVocabulary(sB.id);
    assert.ok(bUp.some(v=>v.vocabularyId===vocab2.id), "sB upcoming");
  });

  // 9. Review actions do not affect assessment scores or accuracy
  await checkAsync("9: review does not affect assessment scores", async()=>{
    // Create a student with no assessment attempts, check practice stats before/after review
    const { getPracticeStats } = await import("../src/lib/practice");
    const statsBefore = await getPracticeStats(sA.id);
    // Record another review for sA
    await prisma.vocabularyReview.update({ where: { studentId_vocabularyId: { studentId: sA.id, vocabularyId: vocab.id } }, data: { lastReviewedAt: new Date(Date.now()-10000) } });
    await recordVocabularyResponse(sA.id, vocab.id, "KNOWN");
    const statsAfter = await getPracticeStats(sA.id);
    // Vocabulary review must not change correctness-based practice stats (distinctActivitiesPracticed etc may change? But vocabulary is separate from activity attempts)
    // Our getPracticeStats filters activityAttempt, not vocabularyReview, so should be equal
    assert.equal(statsBefore.totals.scoredAttempts, statsAfter.totals.scoredAttempts);
    assert.equal(statsBefore.totals.accuracyPercent, statsAfter.totals.accuracyPercent);
  });

  // 10. Existing flashcard completion behavior remains correct (COMPLETED)
  await checkAsync("10: flashcard completion still COMPLETED", async()=>{
    const lesson = await prisma.lesson.findFirst({ where: { activities: { some: { type: "FLASHCARD" } } }, select: { id: true } });
    assert.ok(lesson);
    const flash = await prisma.activity.findFirst({ where: { lessonId: lesson.id, type: "FLASHCARD" }, select: { id: true } });
    assert.ok(flash);
    // Use submitAttempt for flashcard (isCorrect null)
    const { submitAttempt } = await import("../src/lib/practice");
    // Clean prior
    await prisma.activityAttempt.deleteMany({ where: { studentId: sA.id, activityId: flash.id } });
    const res = await submitAttempt(sA.id, flash.id, { marks: [{ word: "test", response: "KNOWN" }] });
    assert.equal(res.ok, true);
    const row = await prisma.activityAttempt.findFirst({ where: { studentId: sA.id, activityId: flash.id }, orderBy: { submittedAt: "desc" } });
    assert.equal(row?.isCorrect, null);
    const state = await getPracticeState(sA.id, lesson.id);
    const st = state.states.find(s=>s.activityId===flash.id)!;
    assert.equal(st.status, "COMPLETED", `expected COMPLETED got ${st.status}`);
    assert.equal(state.correct, 0, "flashcard not counted as correct");
  });

  // 11 and 12 are browser-only (mobile, empty/error) — tested separately, mark source-only here
  check("11: mobile layout usable (source check)", ()=>{
    const flashSrc = fs.readFileSync(path.join(root, "src/components/practice/flashcard-activity.tsx"), "utf8");
    assert.ok(flashSrc.includes("min-h-12"), "buttons min-h-12");
    assert.ok(flashSrc.includes("min-h-44"), "card min-h-44");
    const reviewSrc = fs.readFileSync(path.join(root, "src/components/vocab/review-session.tsx"), "utf8");
    assert.ok(reviewSrc.includes("due now"), "due vs future text exists");
  });
  check("12: empty/error states handled", ()=>{
    const reviewSrc = fs.readFileSync(path.join(root, "src/components/vocab/review-session.tsx"), "utf8");
    assert.ok(reviewSrc.includes("Nothing to review right now"), "empty state");
    assert.ok(reviewSrc.includes("Could not load more words"), "error state");
    const apiSrc = fs.readFileSync(path.join(root, "src/app/api/vocabulary/review/route.ts"), "utf8");
    assert.ok(apiSrc.includes("Vocabulary item not found"), "404 for stale id");
  });

  // Integrity
  const afterHash = crypto.createHash("sha256").update(fs.readFileSync(sourceDb)).digest("hex");
  check(`integrity: original DB untouched (${originalHash.slice(0,8)}…)`, ()=>{ assert.equal(afterHash, originalHash); });

  await prisma.$disconnect();
  fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl; else delete process.env.DATABASE_URL;

  const passed = results.filter(r=>r.ok).length;
  const failed = results.filter(r=>!r.ok).length;
  console.log(`\n=== Phase 54 spaced repetition: ${passed} passed, ${failed} failed ===`);
  if(failed>0) process.exit(1);
}
main().catch(e=>{ console.error(e); process.exit(1); });
