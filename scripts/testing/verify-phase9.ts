/**
 * Phase 9 adaptive learning checks.
 * Estimates are not grades. Students cannot write their own history.
 */
import { PrismaClient } from "@prisma/client";
import { nextDifficultyBand, nextItemState } from "../../src/lib/adaptive/estimate";
import { nextInterval, parseIntervals } from "../../src/lib/adaptive/review";
import { recordLearningEvent } from "../../src/lib/adaptive/events";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const prisma = new PrismaClient();
let pass = 0;
let fail = 0;
const ok = (m: string) => { pass++; console.log(`  ✓ ${m}`); };
const bad = (m: string) => { fail++; console.log(`  ✗ ${m}`); };

function expectPure() {
  nextItemState({ previous: "MASTERED", correct: false, correctAttempts: 4, incorrectAttempts: 1, overdue: false }) === "NEEDS_REVIEW"
    ? ok("mastered item returns to review")
    : bad("mastered item did not return to review");
  nextDifficultyBand(1, [true, true, true]) === 2 && nextDifficultyBand(2, [true, true, true]) === 3 && nextDifficultyBand(3, [false, false, false]) === 2
    ? ok("difficulty moves by one step")
    : bad("difficulty jump");
  const intervals = parseIntervals("1,2,4,8,16");
  const first = nextInterval(intervals, -1, true);
  const second = nextInterval(intervals, first.index, true);
  first.days === 1 && second.days === 2 && nextInterval(intervals, 3, false).days === 1
    ? ok("review intervals are configurable")
    : bad(`intervals ${first.days} ${second.days}`);
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

function dataOf(res: { data: unknown }) {
  return (res.data as { data?: Record<string, unknown> })?.data ?? {};
}

async function waitFor(check: () => Promise<boolean>) {
  for (let i = 0; i < 10; i++) {
    if (await check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

async function main() {
  expectPure();
  const james = await login("james.carter", "Student#Demo1");
  const teacher = await login("sara.whitfield", "Teacher#Demo1");
  const admin = await login("admin", "Admin#Demo1");
  const other = await prisma.user.findFirst({ where: { role: "STUDENT", status: "ACTIVE", username: { not: "james.carter" } } });
  const otherLogin = other ? await login(other.username, "Student#Demo1") : null;
  james.status === 200 ? ok("student login") : bad("student login");

  const jamesUser = await prisma.user.findUnique({ where: { username: "james.carter" } });
  if (!jamesUser) throw new Error("missing demo student");
  const dupId = `phase9-dup-${Date.now()}`;
  const first = await recordLearningEvent({
    studentId: jamesUser.id,
    eventType: "QUESTION_CORRECT",
    sourceType: "TEST",
    sourceId: dupId,
    skillCode: "grammar.be",
    correct: true,
    payload: { category: "am/is/are" },
  });
  const second = await recordLearningEvent({
    studentId: jamesUser.id,
    eventType: "QUESTION_CORRECT",
    sourceType: "TEST",
    sourceId: dupId,
    skillCode: "grammar.be",
    correct: true,
  });
  first.created && !second.created ? ok("duplicate learning event ignored") : bad("duplicate event was stored");

  const vocab = await prisma.vocabulary.findFirst({ select: { id: true, word: true, lessonId: true } });
  if (!vocab) bad("no vocabulary item");
  else {
    for (let i = 0; i < 4; i++) {
      await recordLearningEvent({
        studentId: jamesUser.id,
        eventType: "VOCABULARY_CORRECT",
        sourceType: "TEST",
        sourceId: `phase9-vocab-${i}`,
        skillCode: "vocabulary",
        correct: true,
        knowledge: { vocabularyId: vocab.id, label: vocab.word, lessonId: vocab.lessonId, kind: "VOCABULARY" },
      });
    }
    await recordLearningEvent({
      studentId: jamesUser.id,
      eventType: "VOCABULARY_INCORRECT",
      sourceType: "TEST",
      sourceId: "phase9-vocab-miss",
      skillCode: "vocabulary",
      correct: false,
      knowledge: { vocabularyId: vocab.id, label: vocab.word, lessonId: vocab.lessonId, kind: "VOCABULARY" },
    });
    const state = await prisma.studentKnowledgeState.findFirst({ where: { studentId: jamesUser.id, item: { vocabularyId: vocab.id } } });
    state?.state === "NEEDS_REVIEW" && (state.correctAttempts ?? 0) >= 4
      ? ok("forgotten item keeps history and needs review")
      : bad(`vocab state ${state?.state} correct ${state?.correctAttempts}`);
  }

  const tamper = await call(james.cookie, "POST", "/api/adaptive/goals", { text: "I want to speak more.", skillCode: "speaking", studentId: "other", state: "MASTERED" });
  tamper.status === 422 ? ok("client cannot set mastery or another student") : bad(`goal tamper ${tamper.status}`);
  const goal = await call(james.cookie, "POST", "/api/adaptive/goals", { text: "I want to speak more.", skillCode: "speaking" });
  goal.status === 201 ? ok("student goal saved") : bad(`goal ${goal.status}`);

  const blocked = await call(james.cookie, "POST", "/api/adaptive/recalculate", { studentId: jamesUser.id });
  blocked.status === 403 ? ok("student cannot recalculate history") : bad(`recalculate ${blocked.status}`);
  const settingsBlocked = await call(james.cookie, "POST", "/api/adaptive/settings", { key: "enabled", value: "false" });
  settingsBlocked.status === 403 ? ok("student cannot change adaptive settings") : bad(`settings ${settingsBlocked.status}`);

  if (jamesUser.groupId) {
    const override = await call(teacher.cookie, "POST", "/api/adaptive/overrides", {
      groupId: jamesUser.groupId,
      prioritySkill: "speaking",
      requiredLabel: "Present Simple",
      note: "Shift practice",
    });
    override.status === 201 ? ok("teacher override saved") : bad(`override ${override.status} ${JSON.stringify(override.data)}`);
    const foreign = await call(teacher.cookie, "POST", "/api/adaptive/overrides", { groupId: "not-a-group", requiredLabel: "No" });
    foreign.status === 403 || foreign.status === 404 ? ok("teacher cannot override another group") : bad(`foreign override ${foreign.status}`);
  }

  const refreshed = await call(james.cookie, "POST", "/api/adaptive/plan/refresh");
  const plan = dataOf(refreshed).plan as { items?: { title: string; reason: string; recommendationId: string }[]; minutes?: number; weekly?: unknown[] };
  refreshed.status === 200 && plan?.items?.some((item) => item.title.includes("Present Simple") || item.reason.includes("Present Simple"))
    ? ok("teacher instruction appears in the plan")
    : bad(`plan refresh ${refreshed.status} ${JSON.stringify(plan?.items?.map((item) => item.title))}`);
  plan?.minutes === 10 || plan?.minutes === 15 ? ok("beginner plan uses a short daily time") : bad(`minutes ${plan?.minutes}`);
  Array.isArray(plan?.weekly) && (plan?.weekly.length ?? 0) === 7 ? ok("weekly plan has seven days") : bad("weekly plan missing");
  const reason = plan?.items?.[0]?.reason ?? "";
  /bad at|behind|exact English ability|Top Student/i.test(reason) ? bad("plan uses ranking language") : ok("plan reason is descriptive");

  if (plan?.items?.[0] && otherLogin) {
    const hidden = await call(otherLogin.cookie, "GET", `/api/adaptive/recommendations/${plan.items[0].recommendationId}`);
    hidden.status === 404 ? ok("another student cannot read the recommendation") : bad(`cross read ${hidden.status}`);
  }

  const page = await fetch(`${BASE}/student/plan`, { headers: { Cookie: james.cookie } });
  const html = await page.text();
  page.status === 200 ? ok("student plan page") : bad(`plan page ${page.status}`);
  /Top Student|Worst Student|exact English ability/i.test(html) ? bad("ranking language in plan HTML") : ok("plan page has no rankings");
  html.includes("not a grade") ? ok("plan says it is not a grade") : bad("missing not-a-grade label");

  const teacherPage = await fetch(`${BASE}/teacher/learning`, { headers: { Cookie: teacher.cookie } });
  const teacherHtml = await teacherPage.text();
  teacherPage.status === 200 ? ok("teacher learning page") : bad(`teacher learning ${teacherPage.status}`);
  /Worst Student|Best Group|Weakest Group/i.test(teacherHtml) ? bad("teacher page ranks people") : ok("teacher page does not rank");

  const adminPage = await fetch(`${BASE}/admin/learning`, { headers: { Cookie: admin.cookie }, redirect: "manual" });
  adminPage.status === 200 ? ok("admin adaptive page") : bad(`admin learning ${adminPage.status}`);
  const studentAdmin = await fetch(`${BASE}/admin/learning`, { headers: { Cookie: james.cookie }, redirect: "manual" });
  studentAdmin.status === 307 || studentAdmin.status === 302 ? ok("student blocked from admin adaptive page") : bad(`student admin ${studentAdmin.status}`);

  const usage = await call(admin.cookie, "GET", "/api/admin/adaptive/usage");
  usage.status === 200 ? ok("admin usage counts") : bad(`usage ${usage.status}`);
  const usageStudent = await call(james.cookie, "GET", "/api/admin/adaptive/usage");
  usageStudent.status === 403 ? ok("student cannot read adaptive usage") : bad(`student usage ${usageStudent.status}`);

  const started = await call(james.cookie, "POST", "/api/voice/sessions", { kind: "SPEAKING", topic: "safety" });
  const sessionId = dataOf(started).sessionId as string | undefined;
  if (sessionId) {
    await call(james.cookie, "POST", `/api/voice/sessions/${sessionId}/turn`, { target: "Say: Stop.", transcript: "Stop", source: "TYPED" });
    const found = await waitFor(async () => Boolean(await prisma.learningEvent.findFirst({ where: { studentId: jamesUser.id, eventType: "SPEAKING_COMPLETED" } })));
    found ? ok("speaking turn recorded a learning event") : bad("speaking event missing");
  } else bad("speaking session did not start");

  const exercise = await prisma.listeningExercise.findFirst({ where: { status: "PUBLISHED" } });
  if (exercise) {
    await call(james.cookie, "POST", `/api/voice/listening/${exercise.id}/submit`, { answers: { q1: "Sam", q2: "True" } });
    const found = await waitFor(async () => Boolean(await prisma.learningEvent.findFirst({ where: { studentId: jamesUser.id, eventType: "LISTENING_COMPLETED" } })));
    found ? ok("listening result recorded a learning event") : bad("listening event missing");
  }

  const auditRow = await call(admin.cookie, "POST", "/api/adaptive/settings", { key: "maxRecommendations", value: "4" });
  auditRow.status === 200 ? ok("admin setting saved") : bad(`admin setting ${auditRow.status}`);
  const audited = await prisma.auditLog.findFirst({ where: { action: "ADAPTIVE_SETTING_CHANGED", entityType: "ADAPTIVE" } });
  audited ? ok("adaptive setting change is audited") : bad("audit row missing");

  const rebuilt = await call(admin.cookie, "POST", "/api/adaptive/recalculate", { studentId: jamesUser.id });
  rebuilt.status === 200 ? ok("admin recalculated learning state") : bad(`rebuild ${rebuilt.status}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
