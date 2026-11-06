/**
 * Phase 8 speaking and listening checks.
 * Transcripts are stored. Raw audio is not. No pronunciation score.
 */
import { PrismaClient } from "@prisma/client";
import { transcriptUnderstood } from "../../src/lib/voice/match";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const prisma = new PrismaClient();
let pass = 0;
let fail = 0;
const ok = (m: string) => { pass++; console.log(`  ✓ ${m}`); };
const bad = (m: string) => { fail++; console.log(`  ✗ ${m}`); };

function expectMatch() {
  transcriptUnderstood("Hello. What is your name?", "hello what is your name") ? ok("transcript match ignores case and punctuation") : bad("match failed");
  transcriptUnderstood("Say: Stop.", "go") ? bad("unrelated transcript marked understood") : ok("unrelated transcript is not understood");
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

function dataOf(res: { data: unknown }) {
  return (res.data as { data?: Record<string, unknown> })?.data ?? {};
}

async function main() {
  expectMatch();
  const james = await login("james.carter", "Student#Demo1");
  const teacher = await login("sara.whitfield", "Teacher#Demo1");
  const admin = await login("admin", "Admin#Demo1");
  const other = await prisma.user.findFirst({ where: { role: "STUDENT", status: "ACTIVE", username: { not: "james.carter" } } });
  const otherLogin = other ? await login(other.username, "Student#Demo1") : null;
  james.status === 200 ? ok("student login") : bad("student login");

  const speaking = await fetch(`${BASE}/student/speaking`, { headers: { Cookie: james.cookie } });
  const speakingHtml = await speaking.text();
  speaking.status === 200 ? ok("speaking page") : bad(`speaking page ${speaking.status}`);
  /sk-|STT_API_KEY|TTS_API_KEY|api\.openai\.com/.test(speakingHtml) ? bad("provider key leaked") : ok("no provider key in speaking HTML");
  speakingHtml.includes("not a grade") ? ok("speaking page says practice is not a grade") : bad("missing practice label");

  const listening = await fetch(`${BASE}/student/listening`, { headers: { Cookie: james.cookie } });
  listening.status === 200 ? ok("listening page") : bad(`listening page ${listening.status}`);

  const teacherPage = await fetch(`${BASE}/teacher/speaking`, { headers: { Cookie: teacher.cookie } });
  teacherPage.status === 200 ? ok("teacher speaking page") : bad(`teacher speaking ${teacherPage.status}`);
  const adminPage = await fetch(`${BASE}/admin/voice`, { headers: { Cookie: admin.cookie } });
  adminPage.status === 200 ? ok("admin voice page") : bad(`admin voice ${adminPage.status}`);
  const studentAdmin = await fetch(`${BASE}/admin/voice`, { headers: { Cookie: james.cookie }, redirect: "manual" });
  studentAdmin.status === 307 || studentAdmin.status === 302 ? ok("student blocked from admin voice") : bad(`student admin voice ${studentAdmin.status}`);

  const tamper = await call(james.cookie, "POST", "/api/voice/sessions", { kind: "SPEAKING", studentId: "other", level: "C2" });
  tamper.status === 422 ? ok("client student id and level rejected") : bad(`tamper ${tamper.status}`);

  const started = await call(james.cookie, "POST", "/api/voice/sessions", { kind: "SPEAKING", topic: "greetings" });
  const sessionId = dataOf(started).sessionId as string | undefined;
  started.status === 201 && sessionId ? ok("session from server identity") : bad(`start ${started.status}`);
  dataOf(started).pronunciationScore === undefined ? ok("start does not invent a pronunciation score") : bad("score leaked on start");

  const typed = await call(james.cookie, "POST", `/api/voice/sessions/${sessionId}/turn`, {
    target: "Hello. What is your name?",
    transcript: "Hello. What is your name?",
    source: "TYPED",
  });
  const turn = dataOf(typed);
  typed.status === 200 && turn.understood === true ? ok("typed answer understood from transcript") : bad(`typed ${typed.status} ${JSON.stringify(typed.data)}`);
  turn.pronunciationScore === null ? ok("pronunciation score stays null") : bad("invented pronunciation score");

  const missed = await call(james.cookie, "POST", `/api/voice/sessions/${sessionId}/turn`, {
    target: "Hello. What is your name?",
    transcript: "goodbye",
    source: "TYPED",
  });
  dataOf(missed).understood === false ? ok("mismatch is not marked understood") : bad("mismatch marked understood");

  if (otherLogin) {
    const cross = await call(otherLogin.cookie, "GET", `/api/voice/sessions/${sessionId}`);
    cross.status === 404 ? ok("other student cannot read the session") : bad(`cross student ${cross.status}`);
  } else {
    bad("no second student to test isolation");
  }
  const teacherRead = await call(teacher.cookie, "GET", `/api/voice/sessions/${sessionId}`);
  teacherRead.status === 403 ? ok("teacher cannot read private voice session") : bad(`teacher read ${teacherRead.status}`);

  const noKey = await call(james.cookie, "POST", "/api/voice/transcribe", {});
  noKey.status === 422 && noKey.text.includes("type your answer") ? ok("missing speech provider offers typing") : bad(`transcribe ${noKey.status}`);

  const exercise = await prisma.listeningExercise.findFirst({ where: { status: "PUBLISHED" } });
  if (!exercise) bad("no listening exercise");
  else {
    const graded = await call(james.cookie, "POST", `/api/voice/listening/${exercise.id}/submit`, {
      answers: { q1: "Sam", q2: "True" },
      score: 100,
      passed: true,
    });
    graded.status === 422 ? ok("client score rejected on listening submit") : bad(`listening tamper ${graded.status}`);
    const honest = await call(james.cookie, "POST", `/api/voice/listening/${exercise.id}/submit`, { answers: { q1: "Sam", q2: "True" } });
    const listen = dataOf(honest);
    honest.status === 200 && listen.correct === 2 ? ok("listening graded on the server") : bad(`listen ${honest.status} ${JSON.stringify(honest.data)}`);
    String(listen.label).includes("not an exam") ? ok("listening result is not an exam") : bad("missing not-an-exam label");
  }

  const jamesUser = await prisma.user.findUnique({ where: { username: "james.carter" }, select: { groupId: true } });
  const due = new Date(Date.now() + 86_400_000).toISOString();
  const studentAssign = await call(james.cookie, "POST", "/api/voice/assignments/speaking", {
    title: "Student should not assign",
    groupId: jamesUser?.groupId ?? "x",
    topic: "greetings",
    dueAt: due,
  });
  studentAssign.status === 403 ? ok("student cannot assign speaking") : bad(`student assign ${studentAssign.status}`);

  if (jamesUser?.groupId) {
    const assigned = await call(teacher.cookie, "POST", "/api/voice/assignments/speaking", {
      title: "Say hello",
      groupId: jamesUser.groupId,
      topic: "greetings",
      dueAt: due,
      gradingMode: "AI_FEEDBACK",
      publish: true,
    });
    assigned.status === 201 ? ok("teacher assigned speaking practice") : bad(`assign ${assigned.status} ${JSON.stringify(assigned.data)}`);
    const row = await prisma.speakingAssignment.findFirst({ where: { title: "Say hello", groupId: jamesUser.groupId } });
    row?.gradingMode === "AI_FEEDBACK" ? ok("AI feedback mode is not an official grade field") : bad("grading mode not stored");
  }

  const storeAudio = await call(admin.cookie, "POST", "/api/voice/settings", { scopeKey: "GLOBAL", key: "storeAudio", value: "true" });
  storeAudio.status === 422 ? ok("raw audio storage stays off") : bad(`store audio ${storeAudio.status}`);

  const usageStudent = await call(james.cookie, "GET", "/api/admin/voice/usage");
  usageStudent.status === 403 ? ok("student cannot read voice usage") : bad(`student usage ${usageStudent.status}`);
  const usageAdmin = await call(admin.cookie, "GET", "/api/admin/voice/usage");
  usageAdmin.status === 200 ? ok("admin voice usage") : bad(`admin usage ${usageAdmin.status}`);

  const deleted = await call(james.cookie, "POST", `/api/voice/sessions/${sessionId}/delete`);
  deleted.status === 200 ? ok("student can delete own transcript") : bad(`delete ${deleted.status}`);
  const gone = await prisma.voiceMessage.count({ where: { sessionId: sessionId ?? "" } });
  gone === 0 ? ok("transcript rows removed") : bad("transcript still stored");

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
