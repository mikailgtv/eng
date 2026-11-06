/**
 * Phase 7 tutor checks. Identity and level come from the server.
 */
import { PrismaClient } from "@prisma/client";
import { correctOnce } from "../../src/lib/ai/correct";
import { curriculumReply } from "../../src/lib/ai/curriculum-provider";
import { emptyState } from "../../src/lib/ai/types";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const prisma = new PrismaClient();
let pass = 0;
let fail = 0;
const ok = (m: string) => { pass++; console.log(`  ✓ ${m}`); };
const bad = (m: string) => { fail++; console.log(`  ✗ ${m}`); };

function expectCorrection() {
  const c = correctOnce("My name Ali");
  c?.say === "My name is Ali." ? ok("one grammar correction") : bad(`correction ${c?.say}`);
  correctOnce("I am Ali") === null ? ok("correct sentence left alone") : bad("over-corrected");
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
    headers: {
      Origin: BASE,
      Cookie: cookie,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, text };
}

async function main() {
  expectCorrection();
  const opened = curriculumReply({
    mode: "CONVERSATION",
    level: "PRE_A1",
    difficulty: "EASY",
    showTranslation: false,
    context: { firstName: "Ali", level: "PRE_A1", courseTitle: null, moduleTitle: null, lessonId: null, lessonTitle: null, lessonExcerpt: null, vocabulary: [], grammar: [], mistakes: [], completedLessonTitles: [], recommendation: null },
    message: "",
    state: emptyState(),
    opening: true,
  });
  opened.text.includes("What is your name?") ? ok("Pre-A1 opening is short") : bad(opened.text);
  opened.text.includes("subordinate clause") ? bad("advanced grammar leaked") : ok("no advanced grammar in opening");

  const teacher = await login("sara.whitfield", "Teacher#Demo1");
  const james = await login("james.carter", "Student#Demo1");
  const other = await prisma.user.findFirst({ where: { role: "STUDENT", status: "ACTIVE", username: { not: "james.carter" } } });
  const otherLogin = other ? await login(other.username, "Student#Demo1") : null;
  const admin = await login("admin", "Admin#Demo1");
  james.status === 200 ? ok("student login") : bad("student login");

  const page = await fetch(`${BASE}/student/tutor`, { headers: { Cookie: james.cookie } });
  const html = await page.text();
  page.status === 200 ? ok("tutor page") : bad(`tutor page ${page.status}`);
  /sk-|AI_API_KEY|api\.openai\.com\/v1/.test(html) ? bad("provider key leaked in HTML") : ok("no provider key in HTML");

  const tampered = await call(james.cookie, "POST", "/api/ai/sessions", { mode: "CONVERSATION", level: "C1", studentId: "someone-else" });
  tampered.status === 422 ? ok("client level and student id rejected") : bad(`tamper body ${tampered.status}`);
  const started = await call(james.cookie, "POST", "/api/ai/sessions", { mode: "CONVERSATION" });
  const sessionId = (started.data as { data?: { sessionId?: string; reply?: { text?: string } } })?.data?.sessionId;
  const replyText = (started.data as { data?: { reply?: { text?: string } } })?.data?.reply?.text ?? "";
  started.status === 201 && sessionId ? ok("session created from server identity") : bad(`start ${started.status} ${JSON.stringify(started.data)}`);
  replyText.includes("What is your name?") || replyText.includes("Hello") ? ok("opening uses beginner language") : bad(`opening ${replyText}`);

  const stored = await prisma.aiSession.findUnique({ where: { id: sessionId! } });
  stored?.levelAtTime !== "C1" ? ok("client level ignored") : bad("client level accepted");
  stored?.studentId === (await prisma.user.findUnique({ where: { username: "james.carter" } }))?.id ? ok("client student id ignored") : bad("wrong student");

  const msg = await call(james.cookie, "POST", `/api/ai/sessions/${sessionId}/messages`, { message: "My name Ali." });
  msg.status === 200 && msg.text.includes("My name is Ali") ? ok("conversation correction streamed") : bad(`message ${msg.status} ${msg.text.slice(0, 180)}`);

  const empty = await call(james.cookie, "POST", `/api/ai/sessions/${sessionId}/messages`, { message: "   " });
  empty.status === 422 ? ok("empty message rejected") : bad(`empty ${empty.status}`);

  if (otherLogin) {
    const cross = await call(otherLogin.cookie, "GET", `/api/ai/sessions/${sessionId}`);
    cross.status === 404 ? ok("other student cannot read the session") : bad(`cross read ${cross.status}`);
  }
  const teacherRead = await call(teacher.cookie, "GET", `/api/ai/sessions/${sessionId}`);
  teacherRead.status === 403 ? ok("teacher cannot read private tutor chat") : bad(`teacher read ${teacherRead.status}`);

  const quiz = await call(james.cookie, "POST", "/api/ai/sessions", { mode: "QUIZ" });
  const quizText = (quiz.data as { data?: { reply?: { text?: string } } })?.data?.reply?.text ?? "";
  quizText.includes("AI Practice") && quizText.includes("not an exam") ? ok("quiz labeled AI Practice") : bad(`quiz ${quizText}`);

  const usageDenied = await call(james.cookie, "GET", "/api/admin/ai/usage");
  usageDenied.status === 403 ? ok("student blocked from usage admin") : bad(`usage ${usageDenied.status}`);
  const usage = await call(admin.cookie, "GET", "/api/admin/ai/usage");
  usage.status === 200 ? ok("admin usage aggregate") : bad(`admin usage ${usage.status}`);

  await prisma.aiSetting.upsert({
    where: { scopeKey_key: { scopeKey: "GLOBAL", key: "dailyRequestLimit" } },
    create: { scopeKey: "GLOBAL", key: "dailyRequestLimit", value: "1" },
    update: { value: "1" },
  });
  const limited = await call(james.cookie, "POST", `/api/ai/sessions/${sessionId}/messages`, { message: "Hello again." });
  limited.status === 429 ? ok("daily limit enforced") : bad(`limit ${limited.status}`);
  await prisma.aiSetting.update({ where: { scopeKey_key: { scopeKey: "GLOBAL", key: "dailyRequestLimit" } }, data: { value: "40" } });

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
