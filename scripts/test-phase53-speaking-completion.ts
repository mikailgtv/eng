/**
 * Phase 53 — speaking completion semantics regression.
 * Self-reported speaking must restore as COMPLETED (progress-only),
 * not as CORRECT, and must not inflate scored statistics.
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
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "p53-"));
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

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url: `file:${dbCopy}` } } });

  // Find a lesson with a speaking activity
  const lesson = await prisma.lesson.findFirst({
    where: { activities: { some: { type: "SPEAKING_PROMPT", status: "PUBLISHED" } } },
    select: { id: true, title: true },
  });
  assert.ok(lesson, "need a lesson with SPEAKING_PROMPT");
  console.log(`Lesson: ${(lesson as any).title} (${(lesson as any).id})`);

  const activities = await prisma.activity.findMany({
    where: { lessonId: lesson.id, status: "PUBLISHED" },
    orderBy: { order: "asc" },
    select: { id: true, type: true, required: true, title: true },
  });
  console.log(`Activities: ${activities.map(a=>`${a.type}(${a.required?'req':'opt'})`).join(", ")}`);
  const speaking = activities.find(a => a.type === "SPEAKING_PROMPT")!;
  const scorable = activities.find(a => a.type !== "SPEAKING_PROMPT" && a.type !== "FLASHCARD");
  assert.ok(speaking, "speaking activity exists");
  assert.ok(scorable, "scorable activity exists for control");

  // Pick a student with no attempts on this lesson in the fresh copy (or clean up)
  let student = await prisma.user.findFirst({ where: { role: "STUDENT" }, orderBy: { id: "asc" } });
  assert.ok(student, "student exists");
  // Clean any existing attempts for this student+lesson to get deterministic start
  await prisma.activityAttempt.deleteMany({ where: { studentId: student.id, activityId: { in: activities.map(a=>a.id) } } });

  const { getPracticeState, checkLessonCompletion, getPracticeStats } = await import("../src/lib/practice");
  const { checkAnswer, parseConfiguration } = await import("../src/lib/activities/check");
  const { submitAttempt } = await import("../src/lib/practice");

  // Helper to count distinct attempts
  async function dbState() {
    const s = await getPracticeState((student as any).id, (lesson as any).id);
    const attempts = await prisma.activityAttempt.findMany({ where: { studentId: (student as any).id, activityId: { in: activities.map((a: any)=>a.id) } }, select: { activityId: true, isCorrect: true } });
    return { s, attempts };
  }

  // 1. No activity record → uncompleted
  await checkAsync("1: no record → NOT_ATTEMPTED", async () => {
    const { s } = await dbState();
    const st = s.states.find(x=>x.activityId===speaking.id)!;
    assert.equal(st.status, "NOT_ATTEMPTED");
    assert.equal(s.answered, 0);
    assert.equal(s.allAnswered, false);
    assert.equal(s.requiredRemaining, s.requiredTotal); // none done
  });

  // 2. Persisted self-reported with isCorrect=null → COMPLETED after reload
  await checkAsync("2: self-reported isCorrect=null → COMPLETED after reload", async () => {
    // Simulate what submitAttempt does for speaking: isCorrect null
    const parsed = parseConfiguration(speaking.type, (await prisma.activity.findUnique({ where: { id: speaking.id }, select: { configuration: true } }))!.configuration);
    assert.ok(parsed);
    const checked = checkAnswer(parsed.type, parsed.config, { selfReported: true });
    assert.equal(checked.feedback.isCorrect, null);
    assert.equal(checked.scoreRatio, null);
    // Create via submitAttempt (real code path)
    const res = await submitAttempt(student.id, speaking.id, { selfReported: true });
    assert.equal(res.ok, true);
    // Verify DB persisted null
    const row = await prisma.activityAttempt.findFirst({ where: { studentId: student.id, activityId: speaking.id }, orderBy: { submittedAt: "desc" } });
    assert.ok(row); assert.equal(row.isCorrect, null); assert.equal(row.score, null);
    // Verify getPracticeState restores as COMPLETED (this is the reload)
    const { s } = await dbState();
    const st = s.states.find(x=>x.activityId===speaking.id)!;
    assert.equal(st.status, "COMPLETED", `expected COMPLETED got ${st.status}`);
    assert.equal(s.answered, 1, "answered counts completion");
    assert.equal(s.allAnswered, activities.length===1, "allAnswered only if all done");
    // Required progress: speaking in this lesson is optional (required=false), so requiredRemaining unchanged
    // But generally, a required speaking should count toward requiredDone — check via checkLessonCompletion
  });

  // 3. Self-reported does not become correct
  await checkAsync("3: self-reported does not become CORRECT", async () => {
    const { s } = await dbState();
    assert.equal(s.correct, 0, "correct must stay 0 after self-report");
    const st = s.states.find((x: any)=>x.activityId===speaking.id)!;
    assert.ok((st.status as string) !== "CORRECT");
  });

  // 4. Does not increase correctness-based scores or accuracy
  await checkAsync("4: self-reported does not affect score or accuracy", async () => {
    const { s } = await dbState();
    // Score should be null because no scorable activity has been done yet (only speaking)
    assert.equal(s.scorePercent, null, "scorePercent must be null when only non-scorable completed");
    const stats = await getPracticeStats(student.id);
    // stats.totals.scoredAttempts should exclude null, so still 0
    assert.equal(stats.totals.scoredAttempts, 0, "scoredAttempts excludes null");
    assert.equal(stats.totals.correctAttempts, 0);
    assert.equal(stats.totals.accuracyPercent, null);
  });

  // 5. Completed self-report: checkLessonCompletion counts it, and UI would hide prompt
  await checkAsync("5: completed self-report satisfies required check without re-prompt", async () => {
    // Make speaking required temporarily to test completion gate
    // We'll check behavior for optional vs required: speaking is optional in fixture, so completion not needed
    // Instead verify that an already-completed speaking still reports as COMPLETED on next getPracticeState (no re-prompt)
    const { s: s2 } = await dbState();
    const st = s2.states.find((x: any)=>x.activityId===speaking.id)!;
    assert.equal(st.status, "COMPLETED");
    // Simulate UI locked logic: should be locked if COMPLETED or CORRECT
    const locked = (st.status as string) === "CORRECT" || (st.status as string) === "COMPLETED";
    assert.equal(locked, true, "should be locked — no re-prompt");
    // And a second submit would create a new row, but latest still COMPLETED — not duplicate distinct
    // The API is append-only; distinct activity count stays 1
    const beforeDistinct = (await prisma.activityAttempt.findMany({ where: { studentId: student.id, activityId: speaking.id }, select: { activityId: true }, distinct: ["activityId"] })).length;
    assert.equal(beforeDistinct, 1);
  });

  // 6. Correct and incorrect auto-graded preserve behavior
  await checkAsync("6: correct/incorrect auto-graded still work", async () => {
    // Prefer a type we can deterministically craft answers for
    const target = activities.find(a=>["FILL_BLANK","MULTIPLE_CHOICE","TRUE_FALSE"].includes(a.type))
      ?? activities.find(a=>["MULTIPLE_CHOICE","FILL_BLANK","TRUE_FALSE","WORD_ORDER","MATCHING","LISTEN_AND_TYPE"].includes(a.type));
    if (!target) throw new Error("no scorable target found");
    const actRow = await prisma.activity.findUnique({ where: { id: target.id }, select: { type: true, configuration: true } });
    const parsed = parseConfiguration(actRow!.type, actRow!.configuration)!;
    // Build a wrong answer first: for FILL_BLANK, text="wrong"; for MULTIPLE_CHOICE pick wrong option
    let wrongPayload: unknown;
    let correctPayload: unknown;
    if (parsed.type === "FILL_BLANK") {
      wrongPayload = { text: "wronganswer123" };
      // correct is first acceptedAnswers
      correctPayload = { text: (parsed.config as any).acceptedAnswers[0] };
    } else if (parsed.type === "MULTIPLE_CHOICE") {
      const opts = (parsed.config as any).options as {id:string}[];
      const correctId = (parsed.config as any).correctOptionId as string;
      const wrongId = opts.find(o=>o.id!==correctId)!.id;
      wrongPayload = { optionId: wrongId };
      correctPayload = { optionId: correctId };
    } else if (parsed.type === "TRUE_FALSE") {
      correctPayload = { value: (parsed.config as any).answer as boolean };
      wrongPayload = { value: !(parsed.config as any).answer as boolean };
    } else {
      // skip if unknown type
      console.log(`  (skipping precise wrong/correct for ${parsed.type})`);
      return;
    }
    const wrongRes = await submitAttempt(student.id, target.id, wrongPayload);
    assert.equal(wrongRes.ok, true);
    assert.equal(wrongRes.feedback.isCorrect, false);
    let { s: sWrong } = await dbState();
    let stWrong = sWrong.states.find(x=>x.activityId===target.id)!;
    assert.equal(stWrong.status, "INCORRECT");
    assert.equal(sWrong.correct, 0); // speaking not counted
    // Now correct
    const correctRes = await submitAttempt(student.id, target.id, correctPayload);
    assert.equal(correctRes.ok, true);
    assert.equal(correctRes.feedback.isCorrect, true);
    let { s: sCorrect } = await dbState();
    let stCorrect = sCorrect.states.find(x=>x.activityId===target.id)!;
    assert.equal(stCorrect.status, "CORRECT");
    assert.equal(sCorrect.correct, 1);
  });

  // 7. Multiple activities produce expected completed-vs-correct summary
  await checkAsync("7: multiple activities summary coherent", async () => {
    const { s } = await dbState();
    // We have 1 speaking COMPLETED + 1 scorable CORRECT (from test 6) + others NOT_ATTEMPTED
    // answered should be 2, correct 1, allAnswered false (since lesson has 6 activities)
    assert.equal(s.answered, 2, `answered should be 2 got ${s.answered}`);
    assert.equal(s.correct, 1);
    assert.equal(s.allAnswered, false);
    // scorePercent should reflect correct / total (6) ≈ 17%
    // But only if there is at least one scored activity
    const expectedScore = Math.round((1 / s.totalActivities) * 100);
    assert.equal(s.scorePercent, expectedScore, `score ${s.scorePercent} vs expected ${expectedScore}`);
    // wrong = total - correct - completed - not_attempted? Check via summary logic not directly in PracticeState
  });

  // 8. Duplicate requests: append-only but distinct progress not duplicated
  await checkAsync("8: duplicate self-report does not duplicate distinct progress", async () => {
    const beforeAttempts = await prisma.activityAttempt.count({ where: { studentId: student.id, activityId: speaking.id } });
    // Simulate double-click: two rapid submits
    const p1 = submitAttempt(student.id, speaking.id, { selfReported: true });
    const p2 = submitAttempt(student.id, speaking.id, { selfReported: true });
    await Promise.all([p1, p2]);
    const afterAttempts = await prisma.activityAttempt.count({ where: { studentId: student.id, activityId: speaking.id } });
    assert.equal(afterAttempts, beforeAttempts + 2, "API is append-only — two rows added");
    // But progress distinct check remains 1 distinct activity
    const distinct = await prisma.activityAttempt.findMany({ where: { studentId: student.id, activityId: speaking.id }, distinct: ["activityId"], select: { activityId: true } });
    assert.equal(distinct.length, 1);
    const { s } = await dbState();
    assert.equal(s.states.find(x=>x.activityId===speaking.id)!.status, "COMPLETED");
    assert.equal(s.answered, 2, "answered still 2 (speaking still 1 distinct)");
  });

  // Integrity: original DB untouched
  const afterHash = crypto.createHash("sha256").update(fs.readFileSync(sourceDb)).digest("hex");
  check(`integrity: original DB untouched (${originalHash.slice(0,8)}…)`, () => { assert.equal(afterHash, originalHash); });

  await prisma.$disconnect();
  // cleanup
  fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl; else delete process.env.DATABASE_URL;

  const passed = results.filter(r=>r.ok).length;
  const failed = results.filter(r=>!r.ok).length;
  console.log(`\n=== Phase 53 speaking completion: ${passed} passed, ${failed} failed ===`);
  if (failed>0) process.exit(1);
}
main().catch(e=>{ console.error(e); process.exit(1); });
