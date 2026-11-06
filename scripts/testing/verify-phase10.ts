/**
 * Phase 10 motivation checks. Learning Level is not an English level.
 * Students cannot award their own XP.
 */
import { PrismaClient } from "@prisma/client";
import { applyStreakStep, levelProgress } from "../../src/lib/gamification/rules";
import { applyEngagement, reverseXp } from "../../src/lib/gamification/award";
import { recordLearningEvent } from "../../src/lib/adaptive/events";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const prisma = new PrismaClient();
let pass = 0;
let fail = 0;
const ok = (m: string) => { pass++; console.log(`  ✓ ${m}`); };
const bad = (m: string) => { fail++; console.log(`  ✗ ${m}`); };

function expectPure() {
  const level = levelProgress(60, [{ level: 1, xpRequired: 0 }, { level: 2, xpRequired: 60 }, { level: 3, xpRequired: 120 }]);
  level.level === 2 && level.remaining === 60 ? ok("learning level uses XP thresholds") : bad(`level ${JSON.stringify(level)}`);
  const resumed = applyStreakStep({ current: 3, longest: 3, lastDate: "2026-09-01", today: "2026-09-03", freezes: 0 });
  resumed.note === "Streak resumed." && resumed.current === 4 ? ok("one missed day resumes the streak") : bad(`resume ${JSON.stringify(resumed)}`);
  const reset = applyStreakStep({ current: 3, longest: 3, lastDate: "2026-09-01", today: "2026-09-06", freezes: 0 });
  reset.current === 1 && reset.note === "Let's continue from here." ? ok("a long gap does not use guilt language") : bad(`gap ${JSON.stringify(reset)}`);
  const frozen = applyStreakStep({ current: 3, longest: 3, lastDate: "2026-09-01", today: "2026-09-04", freezes: 1 });
  frozen.useFreeze && frozen.current === 3 ? ok("one freeze covers a longer gap") : bad(`freeze ${JSON.stringify(frozen)}`);
}

async function login(identifier: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ identifier, password }),
  });
  return { status: res.status, cookie: res.headers.get("set-cookie")?.split(";")[0] ?? "" };
}

async function call(cookie: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Origin: BASE, Cookie: cookie, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, text };
}

async function main() {
  expectPure();
  const james = await login("james.carter", "Student#Demo1");
  const teacher = await login("sara.whitfield", "Teacher#Demo1");
  const admin = await login("admin", "Admin#Demo1");
  james.status === 200 ? ok("student login") : bad("student login");
  const student = await prisma.user.findUnique({ where: { username: "james.carter" } });
  if (!student) throw new Error("missing student");

  const before = await prisma.xpTransaction.aggregate({ where: { studentId: student.id, reversedAt: null }, _sum: { amount: true } });
  await recordLearningEvent({
    studentId: student.id,
    eventType: "LESSON_COMPLETED",
    sourceType: "TEST",
    sourceId: "phase10-lesson",
    skillCode: "reading",
    correct: null,
    payload: { title: "Test lesson" },
  });
  await recordLearningEvent({
    studentId: student.id,
    eventType: "LESSON_COMPLETED",
    sourceType: "TEST",
    sourceId: "phase10-lesson",
    skillCode: "reading",
    correct: null,
  });
  const lessonRows = await prisma.xpTransaction.count({ where: { studentId: student.id, sourceId: "phase10-lesson", reversedAt: null } });
  lessonRows === 1 ? ok("duplicate completion does not farm XP") : bad(`lesson rows ${lessonRows}`);
  const after = await prisma.xpTransaction.aggregate({ where: { studentId: student.id, reversedAt: null }, _sum: { amount: true } });
  (after._sum.amount ?? 0) > (before._sum.amount ?? 0) ? ok("lesson completion awards XP") : bad("no XP awarded");

  const first = await applyEngagement({ studentId: student.id, eventType: "QUESTION_CORRECT", sourceType: "TEST", sourceId: "phase10-q1", payload: { activityId: "same-activity" } });
  const second = await applyEngagement({ studentId: student.id, eventType: "QUESTION_CORRECT", sourceType: "TEST", sourceId: "phase10-q2", payload: { activityId: "same-activity" } });
  first.awarded > 0 && second.awarded === 0 ? ok("same activity cannot be farmed the same day") : bad(`farm ${first.awarded} ${second.awarded}`);

  const badge = await prisma.studentBadge.findFirst({ where: { studentId: student.id, badge: { code: "FIRST_STEP" } }, include: { badge: true } });
  badge ? ok("first lesson badge unlocked from a real event") : bad("first step badge missing");

  const self = await call(james.cookie, "POST", "/api/gamification/xp/correct", { transactionId: "x", reason: "give myself XP" });
  self.status === 403 ? ok("student cannot correct XP") : bad(`self xp ${self.status}`);
  const selfBadge = await call(james.cookie, "POST", "/api/gamification/badges", { code: "FAKE", name: "Fake", description: "No", category: "Lessons", requirementType: "LESSON_COMPLETED", requirementCount: 1, xpReward: 100, icon: "lesson" });
  selfBadge.status === 403 ? ok("student cannot create a badge") : bad(`self badge ${selfBadge.status}`);
  const selfChallenge = await call(james.cookie, "POST", "/api/gamification/challenges", { title: "Cheat", groupId: student.groupId ?? "x", requirementType: "ANY", requirementCount: 1, endAt: new Date(Date.now() + 86400000).toISOString() });
  selfChallenge.status === 403 ? ok("student cannot assign a challenge") : bad(`self challenge ${selfChallenge.status}`);

  if (student.groupId) {
    const due = new Date(Date.now() + 3 * 86400000).toISOString();
    const challenge = await call(teacher.cookie, "POST", "/api/gamification/challenges", {
      title: "Three speaking sessions",
      groupId: student.groupId,
      requirementType: "SPEAKING_COMPLETED",
      requirementCount: 3,
      endAt: due,
    });
    challenge.status === 201 ? ok("teacher challenge created") : bad(`challenge ${challenge.status} ${JSON.stringify(challenge.data)}`);
    const group = await call(teacher.cookie, "POST", "/api/gamification/group-challenges", {
      title: "Together complete activities",
      groupId: student.groupId,
      requirementCount: 20,
      endAt: due,
    });
    const groupData = (group.data as { data?: { progress?: number; names?: unknown } })?.data;
    group.status === 201 && groupData && !("names" in (groupData as object)) ? ok("group challenge has no student names") : bad(`group challenge ${group.status}`);
    const foreign = await call(teacher.cookie, "POST", "/api/gamification/group-challenges", { title: "Other", groupId: "not-a-group", requirementCount: 5, endAt: due });
    foreign.status === 403 || foreign.status === 404 ? ok("teacher cannot challenge another group") : bad(`foreign ${foreign.status}`);
  }

  const tx = await prisma.xpTransaction.findFirst({ where: { studentId: student.id, sourceId: "phase10-lesson", reversedAt: null } });
  if (!tx) bad("missing ledger row");
  else {
    const reversed = await call(admin.cookie, "POST", "/api/gamification/xp/correct", { transactionId: tx.id, reason: "Test correction" });
    reversed.status === 200 ? ok("admin XP correction creates a reversal") : bad(`reversal ${reversed.status}`);
    const original = await prisma.xpTransaction.findUnique({ where: { id: tx.id } });
    const reversal = await prisma.xpTransaction.findFirst({ where: { reversalOfId: tx.id } });
    original?.reversedAt && reversal && reversal.amount === -tx.amount ? ok("ledger keeps the original and the reversal") : bad("ledger rewrite");
  }

  const setting = await call(admin.cookie, "POST", "/api/gamification/settings", { key: "dailyXpCap", value: "80" });
  setting.status === 200 ? ok("admin XP setting saved") : bad(`setting ${setting.status}`);
  const audited = await prisma.auditLog.findFirst({ where: { action: "GAMIFICATION_SETTING_CHANGED", entityType: "GAMIFICATION" } });
  audited ? ok("XP setting change is audited") : bad("audit missing");

  const page = await fetch(`${BASE}/student/achievements`, { headers: { Cookie: james.cookie } });
  const html = await page.text();
  page.status === 200 ? ok("achievements page") : bad(`achievements ${page.status}`);
  /Learning Level/.test(html) && /not your English level/i.test(html) ? ok("learning level is separate from English level") : bad("level label missing");
  /leaderboard|Best Student|Top 10|Worst Student|best shift/i.test(html) ? bad("public ranking on achievements") : ok("no public ranking");

  const teacherPage = await fetch(`${BASE}/teacher/engagement`, { headers: { Cookie: teacher.cookie } });
  const teacherHtml = await teacherPage.text();
  teacherPage.status === 200 ? ok("teacher engagement page") : bad(`teacher engagement ${teacherPage.status}`);
  /Best shift|Weakest shift|Top student/i.test(teacherHtml) ? bad("teacher page ranks groups") : ok("teacher page has no shift ranking");

  const adminPage = await fetch(`${BASE}/admin/gamification`, { headers: { Cookie: admin.cookie } });
  adminPage.status === 200 ? ok("admin gamification page") : bad(`admin page ${adminPage.status}`);
  const blocked = await fetch(`${BASE}/admin/gamification`, { headers: { Cookie: james.cookie }, redirect: "manual" });
  blocked.status === 307 || blocked.status === 302 ? ok("student blocked from gamification admin") : bad(`student admin ${blocked.status}`);

  const usage = await call(james.cookie, "GET", "/api/admin/gamification/usage");
  usage.status === 403 ? ok("student cannot read engagement aggregates") : bad(`usage ${usage.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
