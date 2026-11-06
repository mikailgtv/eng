/**
 * Phase 5 API checks against a running dev server.
 * Prints PASS/FAIL lines and exits non-zero if any fail.
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const prisma = new PrismaClient();
let pass = 0;
let fail = 0;

function ok(msg: string) {
  pass += 1;
  console.log(`  ✓ ${msg}`);
}
function bad(msg: string) {
  fail += 1;
  console.log(`  ✗ ${msg}`);
}

async function login(identifier: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ identifier, password }),
  });
  const cookie = res.headers.get("set-cookie")?.split(";")[0] ?? "";
  return { status: res.status, cookie };
}

async function call(cookie: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Origin: BASE,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function main() {
  const teacher = await login("sara.whitfield", "Teacher#Demo1");
  const student = await login("james.carter", "Student#Demo1");
  const admin = await login("admin", "Admin#Demo1");
  teacher.status === 200 && teacher.cookie ? ok("teacher login") : bad(`teacher login ${teacher.status}`);
  student.status === 200 && student.cookie ? ok("student login") : bad(`student login ${student.status}`);
  admin.status === 200 && admin.cookie ? ok("admin login") : bad(`admin login ${admin.status}`);

  const shiftA = await prisma.learningGroup.findUnique({ where: { name: "Firefighter Shift A" } });
  const shiftB = await prisma.learningGroup.findUnique({ where: { name: "Firefighter Shift B" } });
  const shiftC = await prisma.learningGroup.findUnique({ where: { name: "Firefighter Shift C" } });
  const james = await prisma.user.findUnique({ where: { username: "james.carter" } });
  const other = await prisma.user.findFirst({ where: { role: "STUDENT", groupId: shiftB?.id } });
  if (!shiftA || !shiftB || !james) throw new Error("seed groups missing");

  const unauth = await call(teacher.cookie, "POST", "/api/teaching/sessions", {
    groupId: "does-not-exist",
    title: "Nope",
    scheduledStart: new Date(Date.now() + 3600_000).toISOString(),
    scheduledEnd: new Date(Date.now() + 7200_000).toISOString(),
  });
  unauth.status === 404 ? ok("unknown group is 404") : bad(`unknown group ${unauth.status}`);

  const studentCreate = await call(student.cookie, "POST", "/api/teaching/sessions", {
    groupId: shiftA.id,
    title: "Student should not",
    scheduledStart: new Date(Date.now() + 3600_000).toISOString(),
    scheduledEnd: new Date(Date.now() + 7200_000).toISOString(),
  });
  studentCreate.status === 403 ? ok("student cannot create a class") : bad(`student create class ${studentCreate.status}`);

  const start = new Date(Date.now() + 3_600_000);
  const end = new Date(start.getTime() + 3_600_000);
  const created = await call(teacher.cookie, "POST", "/api/teaching/sessions", {
    groupId: shiftA.id,
    title: "P5 test class",
    scheduledStart: start.toISOString(),
    scheduledEnd: end.toISOString(),
  });
  const sessionId = (created.data as { data?: { id?: string } })?.data?.id;
  created.status === 201 && sessionId ? ok("teacher schedules class") : bad(`schedule class ${created.status} ${JSON.stringify(created.data)}`);

  const started = await call(teacher.cookie, "POST", `/api/teaching/sessions/${sessionId}`, { action: "start" });
  started.status === 200 ? ok("start class records server time") : bad(`start ${started.status} ${JSON.stringify(started.data)}`);
  const startedAgain = await call(teacher.cookie, "POST", "/api/teaching/sessions", {
    groupId: shiftA.id,
    title: "Second class",
    scheduledStart: new Date(Date.now() + 86_400_000).toISOString(),
    scheduledEnd: new Date(Date.now() + 90_000_000).toISOString(),
  });
  const secondId = (startedAgain.data as { data?: { id?: string } })?.data?.id;
  const blocked = await call(teacher.cookie, "POST", `/api/teaching/sessions/${secondId}`, { action: "start" });
  blocked.status === 422 ? ok("second in-progress class rejected") : bad(`duplicate active ${blocked.status}`);

  const marked = await call(teacher.cookie, "PUT", `/api/teaching/sessions/${sessionId}/attendance`, {
    marks: [{ studentId: james.id, status: "PRESENT" }],
  });
  marked.status === 200 ? ok("attendance saved") : bad(`attendance ${marked.status} ${JSON.stringify(marked.data)}`);
  const changed = await call(teacher.cookie, "PUT", `/api/teaching/sessions/${sessionId}/attendance`, {
    marks: [{ studentId: james.id, status: "LATE" }],
  });
  changed.status === 200 ? ok("attendance edit saved") : bad(`attendance edit ${changed.status}`);
  const rows = await prisma.attendanceRecord.count({ where: { sessionId: sessionId!, studentId: james.id } });
  rows === 1 ? ok("no duplicate attendance row") : bad(`attendance rows ${rows}`);
  const changes = await prisma.attendanceChange.count({ where: { sessionId: sessionId!, studentId: james.id } });
  changes >= 2 ? ok("attendance change audited") : bad(`attendance changes ${changes}`);

  if (other) {
    const foreign = await call(teacher.cookie, "PUT", `/api/teaching/sessions/${sessionId}/attendance`, {
      marks: [{ studentId: other.id, status: "PRESENT" }],
    });
    foreign.status === 422 ? ok("cannot mark a student from another group") : bad(`cross-group mark ${foreign.status}`);
  }

  const outsider = await prisma.user.create({
    data: {
      employeeCode: `P5-${Date.now()}`,
      firstName: "Other",
      lastName: "Teacher",
      username: `p5.teacher.${Date.now()}`,
      passwordHash: "not-a-login",
      role: "TEACHER",
      status: "ACTIVE",
    },
  });
  const fakeCookie = teacher.cookie.replace(/eb\.session=[^;]+/, "eb.session=tampered");
  const tamper = await call(fakeCookie, "POST", `/api/teaching/sessions/${sessionId}`, { action: "end" });
  tamper.status === 401 || tamper.status === 403 ? ok("tampered session rejected") : bad(`tamper ${tamper.status}`);
  await prisma.user.delete({ where: { id: outsider.id } }).catch(() => undefined);

  const ended = await call(teacher.cookie, "POST", `/api/teaching/sessions/${sessionId}`, { action: "end" });
  ended.status === 200 ? ok("end class") : bad(`end ${ended.status}`);
  const row = await prisma.classSession.findUnique({ where: { id: sessionId! } });
  row?.actualStart && row.actualEnd ? ok("server stored actual start and end") : bad("missing actual times");

  const note = await call(teacher.cookie, "POST", "/api/teaching/notes", {
    scope: "STUDENT",
    studentId: james.id,
    content: "P5 private note — student must not see this.",
  });
  note.status === 201 ? ok("teacher note created") : bad(`note ${note.status} ${JSON.stringify(note.data)}`);
  const studentNotes = await call(student.cookie, "GET", "/api/notifications");
  const leaked = JSON.stringify(studentNotes.data).includes("P5 private note");
  leaked ? bad("private note leaked into student notifications") : ok("private note not in student notifications");

  const due = new Date(Date.now() - 60_000);
  const lateAssignment = await call(teacher.cookie, "POST", "/api/teaching/assignments", {
    title: "P5 late closed",
    type: "WRITTEN",
    groupId: shiftA.id,
    dueAt: due.toISOString(),
    status: "PUBLISHED",
    allowLate: false,
    instructions: "Should reject late text.",
  });
  const lateId = (lateAssignment.data as { data?: { id?: string } })?.data?.id;
  lateAssignment.status === 201 && lateId ? ok("assignment created") : bad(`assignment ${lateAssignment.status}`);
  const lateSubmit = await call(student.cookie, "POST", `/api/teaching/assignments/${lateId}/submit`, { text: "too late" });
  lateSubmit.status === 422 ? ok("late submission rejected") : bad(`late submit ${lateSubmit.status} ${JSON.stringify(lateSubmit.data)}`);

  const openDue = new Date(Date.now() + 86_400_000);
  const openAssignment = await call(teacher.cookie, "POST", "/api/teaching/assignments", {
    title: "P5 open writing",
    type: "WRITTEN",
    groupId: shiftA.id,
    dueAt: openDue.toISOString(),
    status: "PUBLISHED",
    instructions: "Write one sentence.",
  });
  const openId = (openAssignment.data as { data?: { id?: string } })?.data?.id;
  const submitted = await call(student.cookie, "POST", `/api/teaching/assignments/${openId}/submit`, { text: "Water on the fire." });
  submitted.status === 200 ? ok("student text submission") : bad(`submit ${submitted.status} ${JSON.stringify(submitted.data)}`);
  const again = await call(student.cookie, "POST", `/api/teaching/assignments/${openId}/submit`, { text: "again" });
  again.status === 409 ? ok("duplicate submission rejected") : bad(`duplicate submit ${again.status}`);
  if (other) {
    const otherLogin = await login(other.username, "Student#Demo1");
    const cross = await call(otherLogin.cookie, "POST", `/api/teaching/assignments/${openId}/submit`, { text: "not my group" });
    cross.status === 404 ? ok("other group cannot submit") : bad(`cross submit ${cross.status}`);
  }

  const course = await prisma.courseAssignment.findFirst({ where: { groupId: shiftA.id }, include: { course: { include: { modules: { take: 1 } } } } });
  const moduleId = course?.course.modules[0]?.id;
  const draft = await call(teacher.cookie, "POST", "/api/teaching/lessons", { moduleId, title: "P5 empty draft" });
  const lessonId = (draft.data as { data?: { id?: string } })?.data?.id;
  draft.status === 201 && lessonId ? ok("draft lesson created") : bad(`lesson ${draft.status} ${JSON.stringify(draft.data)}`);
  const badPublish = await call(teacher.cookie, "PATCH", `/api/teaching/lessons/${lessonId}`, { status: "PUBLISHED" });
  badPublish.status === 422 ? ok("empty lesson cannot be published") : bad(`empty publish ${badPublish.status}`);
  const block = await call(teacher.cookie, "POST", `/api/teaching/lessons/${lessonId}/blocks`, { type: "TEXT", data: { text: "Hello class." } });
  block.status === 201 ? ok("text block saved") : bad(`block ${block.status} ${JSON.stringify(block.data)}`);
  const fakeAudio = await call(teacher.cookie, "POST", `/api/teaching/lessons/${lessonId}/blocks`, { type: "AUDIO", data: { url: "" } });
  fakeAudio.status === 422 ? ok("empty audio URL rejected") : bad(`empty audio ${fakeAudio.status}`);
  const teacherPublish = await call(teacher.cookie, "PATCH", `/api/teaching/lessons/${lessonId}`, { status: "PUBLISHED" });
  if (teacherPublish.status === 409) {
    ok("teacher cannot publish without review");
    const published = await call(admin.cookie, "PATCH", `/api/teaching/lessons/${lessonId}`, { status: "PUBLISHED" });
    published.status === 200 ? ok("administrator can still publish a valid lesson") : bad(`admin publish ${published.status}`);
  } else {
    teacherPublish.status === 200 ? ok("valid lesson published") : bad(`publish ${teacherPublish.status} ${JSON.stringify(teacherPublish.data)}`);
  }

  const plan = await call(teacher.cookie, "POST", "/api/teaching/plans", {
    groupId: shiftA.id,
    plannedDate: new Date(Date.now() + 172_800_000).toISOString(),
    plannedDurationMin: 60,
    notes: "P5 plan",
  });
  plan.status === 201 ? ok("teaching plan created") : bad(`plan ${plan.status} ${JSON.stringify(plan.data)}`);

  const pages = ["/teacher", "/teacher/groups", "/teacher/students", "/teacher/classes", "/teacher/courses", "/teacher/assignments", "/teacher/plans", "/teacher/attendance", "/teacher/reports", "/student/assignments"];
  for (const path of pages) {
    const cookie = path.startsWith("/student") ? student.cookie : teacher.cookie;
    const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } });
    res.status === 200 ? ok(`page ${path}`) : bad(`page ${path} ${res.status}`);
  }

  const denied = await call(teacher.cookie, "POST", "/api/teaching/sessions", {
    groupId: shiftC?.id,
    title: "Not my group",
    scheduledStart: new Date(Date.now() + 3600_000).toISOString(),
    scheduledEnd: new Date(Date.now() + 7200_000).toISOString(),
  });
  denied.status === 404 ? ok("unassigned group API is 404") : bad(`unassigned group ${denied.status}`);
  const direct = await fetch(`${BASE}/teacher/groups/${shiftC?.id}`, { headers: { Cookie: teacher.cookie }, redirect: "manual" });
  const directBody = await direct.text();
  direct.status === 404 || directBody.includes("Page not found")
    ? ok(`unassigned group page hidden (${direct.status})`)
    : bad(`unassigned page ${direct.status}`);
  directBody.includes("Shift C") ? bad("unassigned group name leaked") : ok("unassigned group name not shown");

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
