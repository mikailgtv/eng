/**
 * Phase 14 content builder checks.
 * Probe rows are removed at the end. Existing courses are not deleted.
 */
import { readFileSync, unlinkSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { canTeacherPublish, checkLessonQuality, difficultyLabel, prerequisiteMet, recommendationReason, releaseOpen, sanitizeContent } from "../../src/lib/content/rules";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}

const BASE = process.env.BASE ?? "http://127.0.0.1:3000";
const prisma = new PrismaClient();
let pass = 0;
let fail = 0;
const ok = (message: string) => { pass += 1; console.log(`  ✓ ${message}`); };
const bad = (message: string) => { fail += 1; console.log(`  ✗ ${message}`); };
const courseIds: string[] = [];
const curriculumIds: string[] = [];
const mediaFiles: string[] = [];

function expectPure() {
  checkLessonQuality({ title: "", objectiveCount: 0, blocks: [] }).ok === false ? ok("empty lesson fails quality") : bad("empty quality");
  checkLessonQuality({ title: "Hello", objectiveCount: 1, blocks: [{ type: "TEXT", data: { text: "Hi.", translation: "سلام" } }], beginnerMode: true }).ok ? ok("short Pre-A1 lesson can pass") : bad("beginner quality");
  !canTeacherPublish(true, false, "TEACHER") && canTeacherPublish(true, true, "TEACHER") && canTeacherPublish(true, false, "ADMIN") ? ok("teacher cannot bypass review") : bad("publish permission");
  !releaseOpen({ mode: "SCHEDULED", releaseAt: new Date(Date.now() + 86_400_000), released: false, afterCompleted: false, now: new Date(), hasOverride: false }) ? ok("future release stays closed") : bad("scheduled release");
  releaseOpen({ mode: "TEACHER", releaseAt: null, released: false, afterCompleted: false, now: new Date(), hasOverride: true }) ? ok("override opens a locked lesson") : bad("override");
  !prerequisiteMet(false, false) && prerequisiteMet(true, false) ? ok("prerequisite uses completion") : bad("prerequisite");
  sanitizeContent("<script>alert(1)</script>Hello") === "alert(1)Hello" ? ok("content HTML is stripped") : bad("sanitize");
  difficultyLabel("EASY") !== "Pre-A1" ? ok("difficulty is not an academic level") : bad("difficulty label");
  recommendationReason("NEEDS_REVIEW", "to be").includes("Needs Review") ? ok("recommendation explains the stored state") : bad("reason");
}

async function login(identifier: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: BASE }, body: JSON.stringify({ identifier, password }) });
  return { status: res.status, cookie: res.headers.get("set-cookie")?.split(";")[0] ?? "" };
}

async function call(cookie: string, method: string, route: string, body?: unknown) {
  const res = await fetch(`${BASE}${route}`, {
    method,
    headers: { Origin: BASE, Cookie: cookie, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, text };
}

function unwrap(data: unknown): any {
  if (data && typeof data === "object" && "data" in data) return (data as { data: unknown }).data;
  return data;
}

async function main() {
  expectPure();
  const james = await login("james.carter", "Student#Demo1");
  const pedro = await login("pedro.alvarez", "Student#Demo1");
  const teacher = await login("sara.whitfield", "Teacher#Demo1");
  const admin = await login("admin", "Admin#Demo1");
  james.status === 200 && teacher.status === 200 && admin.status === 200 ? ok("demo logins still work") : bad("logins");
  const denied = await call(james.cookie, "GET", "/api/content/curricula");
  denied.status === 403 ? ok("student cannot open the builder API") : bad(`student builder ${denied.status}`);
  const open = await call("", "POST", "/api/content/lessons", { action: "create", title: "x" });
  open.status === 401 ? ok("content API requires a session") : bad(`content auth ${open.status}`);

  const level = await prisma.level.findFirst({ where: { status: "ACTIVE" }, orderBy: { order: "asc" } });
  const shiftA = await prisma.learningGroup.findFirst({ where: { name: { contains: "Shift A" } } });
  const shiftC = await prisma.learningGroup.findFirst({ where: { name: { contains: "Shift C" } } });
  if (!level || !shiftA || !shiftC) {
    bad("level or shifts missing");
    return;
  }

  const curriculum = unwrap((await call(admin.cookie, "POST", "/api/content/curricula", { title: "Phase14 probe curriculum", goal: "Introduce yourself", levelCode: "PRE_A1", durationWeeks: 4, sessionCount: 8, plannedHours: 12 })).data);
  curriculum?.id ? ok("curriculum created") : bad("curriculum");
  if (curriculum?.id) curriculumIds.push(curriculum.id);
  const teacherCurriculum = await call(teacher.cookie, "POST", "/api/content/curricula", { title: "Teacher curriculum" });
  teacherCurriculum.status === 403 ? ok("teacher cannot create a curriculum") : bad(`teacher curriculum ${teacherCurriculum.status}`);

  const course = unwrap((await call(admin.cookie, "POST", "/api/content/courses", { title: "Phase14 probe course", levelId: level.id, curriculumId: curriculum.id, goal: "Use to be", outcomes: "Students can introduce themselves." })).data);
  course?.id ? ok("course draft created on the existing level") : bad("course");
  if (course?.id) courseIds.push(course.id);
  const assignedEarly = await call(admin.cookie, "POST", "/api/content/assign", { resourceType: "COURSE", resourceId: course.id, targetType: "SHIFT", targetId: shiftA.id, confirm: true });
  assignedEarly.status === 201 ? ok("course assigned to Shift A") : bad(`assign ${assignedEarly.status}`);
  const wrong = await call(teacher.cookie, "POST", "/api/content/assign", { resourceType: "COURSE", resourceId: course.id, targetType: "SHIFT", targetId: shiftC.id, confirm: true });
  wrong.status === 404 ? ok("teacher cannot assign another shift") : bad(`cross assign ${wrong.status}`);
  const moduleRow = unwrap((await call(admin.cookie, "POST", "/api/content/structure", { action: "module", courseId: course.id, title: "Basic English", goal: "First words" })).data);
  const unit = unwrap((await call(admin.cookie, "POST", "/api/content/structure", { action: "unit", moduleId: moduleRow.id, title: "Introducing Yourself", goal: "Say your name" })).data);
  moduleRow?.id && unit?.id ? ok("module and unit created") : bad("structure");

  const lesson = unwrap((await call(teacher.cookie, "POST", "/api/content/lessons", { action: "create", moduleId: moduleRow.id, unitId: unit.id, title: "Phase14 probe lesson", beginnerMode: true, difficulty: "EASY" })).data);
  lesson?.id ? ok("teacher created a lesson draft") : bad(`lesson ${JSON.stringify(lesson)}`);
  const draft = await call(teacher.cookie, "POST", "/api/content/lessons", { action: "draft", lessonId: lesson.id, blocks: [{ type: "TEXT", data: { text: "<script>alert(1)</script>Hello.", translation: "سلام" } }, { type: "TEACHER_NOTE", data: { text: "Private note" } }] });
  draft.status === 200 ? ok("draft autosave accepted") : bad(`draft ${draft.status}`);
  const stored = await prisma.lessonDraft.findUnique({ where: { lessonId: lesson.id } });
  stored && !stored.blocksJson.includes("<script>") ? ok("draft text is plain") : bad("draft xss");

  const early = await call(teacher.cookie, "POST", "/api/content/lessons", { action: "submit", lessonId: lesson.id });
  early.status === 422 ? ok("quality check blocks an incomplete lesson") : bad(`early submit ${early.status}`);
  await call(admin.cookie, "POST", "/api/content/structure", { action: "objective", resourceType: "LESSON", resourceId: lesson.id, text: "Students can say hello." });
  const submitted = await call(teacher.cookie, "POST", "/api/content/lessons", { action: "submit", lessonId: lesson.id });
  submitted.status === 200 ? ok("teacher can submit for review") : bad(`submit ${submitted.status} ${JSON.stringify(submitted.data)}`);
  const teacherPublish = await call(teacher.cookie, "POST", "/api/content/lessons", { action: "publish", lessonId: lesson.id, confirm: true });
  teacherPublish.status === 409 ? ok("teacher cannot publish before approval") : bad(`teacher publish ${teacherPublish.status}`);
  const hidden = await fetch(`${BASE}/student/learn/${lesson.id}`, { headers: { Cookie: james.cookie } });
  const hiddenText = await hidden.text();
  hiddenText.includes("Page not found") ? ok("student cannot open a draft") : bad("draft page visible");

  const approved = await call(admin.cookie, "POST", "/api/content/lessons", { action: "review", lessonId: lesson.id, status: "APPROVED" });
  const published = await call(admin.cookie, "POST", "/api/content/lessons", { action: "publish", lessonId: lesson.id, confirm: true });
  approved.status === 200 && published.status === 200 ? ok("reviewer approval then publish") : bad(`publish ${approved.status}/${published.status}`);
  const jamesPage = await fetch(`${BASE}/student/learn/${lesson.id}`, { headers: { Cookie: james.cookie } });
  const pedroPage = await fetch(`${BASE}/student/learn/${lesson.id}`, { headers: { Cookie: pedro.cookie } });
  const jamesHtml = await jamesPage.text();
  const pedroHtml = await pedroPage.text();
  const visible = jamesHtml.replace(/<script[\s\S]*?<\/script>/g, "");
  visible.includes("Phase14 probe lesson") && visible.includes("Hello") && !visible.includes("Page not found") ? ok("assigned student sees the published lesson") : bad("james lesson hidden");
  pedroHtml.includes("Page not found") ? ok("another shift does not see it") : bad("pedro lesson visible");
  !jamesHtml.includes("Private note") ? ok("teacher notes are not in the student view") : bad("teacher note leak");

  const second = unwrap((await call(admin.cookie, "POST", "/api/content/lessons", { action: "create", moduleId: moduleRow.id, title: "Phase14 second lesson" })).data);
  await call(admin.cookie, "POST", "/api/content/structure", { action: "objective", resourceType: "LESSON", resourceId: second.id, text: "Students can ask a name." });
  await call(admin.cookie, "POST", "/api/content/lessons", { action: "draft", lessonId: second.id, blocks: [{ type: "TEXT", data: { text: "What is your name?", translation: "اسم شما چیست؟" } }] });
  await call(admin.cookie, "POST", "/api/content/structure", { action: "prerequisite", resourceType: "LESSON", resourceId: second.id, requiredType: "LESSON", requiredId: lesson.id });
  await call(admin.cookie, "POST", "/api/content/lessons", { action: "review", lessonId: second.id, status: "APPROVED" });
  await call(admin.cookie, "POST", "/api/content/lessons", { action: "publish", lessonId: second.id, confirm: true });
  const locked = await fetch(`${BASE}/student/learn/${second.id}`, { headers: { Cookie: james.cookie } });
  const lockedText = await locked.text();
  lockedText.includes("Page not found") ? ok("prerequisite blocks the next lesson") : bad("prerequisite did not block");

  const library = unwrap((await call(teacher.cookie, "POST", "/api/content/library", { kind: "VOCABULARY", title: "Phase14 helmet", body: "کلاه ایمنی", levelCode: "PRE_A1", difficulty: "EASY", topic: "Safety", primarySkill: "VOCABULARY", tags: ["Safety"] })).data);
  library?.id ? ok("library item saved") : bad("library");
  const reused = await call(teacher.cookie, "POST", "/api/content/library", { action: "use", itemId: library.id, lessonId: lesson.id, placement: "LESSON" });
  reused.status === 201 ? ok("library item can be used in a lesson") : bad(`reuse ${reused.status}`);
  const knowledge = await prisma.knowledgeItem.findFirst({ where: { vocabulary: { word: "Phase14 helmet" } } });
  knowledge ? ok("reused vocabulary is linked to adaptive learning") : bad("adaptive link");

  const ai = unwrap((await call(teacher.cookie, "POST", "/api/content/ai-drafts", { prompt: "Create a Pre-A1 dialogue about workplace safety", kind: "DIALOGUE" })).data);
  ai?.labeled && ai.providerUsed === false ? ok("AI draft is labeled and not invented") : bad("ai draft");
  const aiPublish = await call(teacher.cookie, "POST", "/api/content/lessons", { action: "publish", lessonId: ai?.id, confirm: true });
  aiPublish.status !== 200 ? ok("AI draft is not a publish action") : bad("ai published");

  const form = new FormData();
  form.set("file", new Blob([Buffer.from("MZ")], { type: "application/octet-stream" }), "phase14.exe");
  const exe = await fetch(`${BASE}/api/content/media`, { method: "POST", headers: { Origin: BASE, Cookie: admin.cookie }, body: form });
  exe.status === 400 ? ok("executable media is rejected") : bad(`exe ${exe.status}`);
  const pdf = new FormData();
  pdf.set("file", new Blob([Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF")], { type: "application/pdf" }), "phase14.pdf");
  const uploaded = await fetch(`${BASE}/api/content/media`, { method: "POST", headers: { Origin: BASE, Cookie: admin.cookie }, body: pdf });
  const uploadedJson = await uploaded.json().catch(() => null);
  uploaded.status === 201 ? ok("real media file stored") : bad(`media ${uploaded.status}`);
  if (uploadedJson?.data?.id) {
    const row = await prisma.contentMedia.findUnique({ where: { id: uploadedJson.data.id } });
    if (row) mediaFiles.push(path.join("storage", "content", row.storagePath));
    const studentFile = await fetch(`${BASE}/api/content/media/${uploadedJson.data.id}`, { headers: { Cookie: james.cookie } });
    studentFile.status === 404 ? ok("student cannot download staff media") : bad(`student media ${studentFile.status}`);
  }

  const exported = await call(admin.cookie, "GET", `/api/content/export?courseId=${course.id}&format=json`);
  exported.status === 200 && exported.text.includes("Phase14 probe") ? ok("authorized export") : bad(`export ${exported.status}`);
  const studentExport = await call(james.cookie, "GET", `/api/content/export?courseId=${course.id}&format=json`);
  studentExport.status === 403 ? ok("student cannot export the builder") : bad(`student export ${studentExport.status}`);

  const pages = ["/teacher/content", "/teacher/content/library", "/admin/content", "/admin/curriculum", "/student/learning", "/student/notifications", "/teacher/courses"];
  let pagesOk = true;
  for (const page of pages) {
    const cookie = page.startsWith("/admin") ? admin.cookie : page.startsWith("/student") ? james.cookie : teacher.cookie;
    const res = await fetch(`${BASE}${page}`, { headers: { Cookie: cookie } });
    if (res.status !== 200) pagesOk = false;
  }
  pagesOk ? ok("builder and existing pages load") : bad("page regression");
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('curriculums','units','content_items','content_reviews','lesson_drafts')");
  tables.length === 5 ? ok("phase 14 tables exist") : bad(`tables ${tables.map((row) => row.name).join(",")}`);
}

async function cleanup() {
  const titles = ["Phase14 probe lesson", "Phase14 second lesson"];
  const lessons = await prisma.lesson.findMany({ where: { title: { in: titles } }, select: { id: true } });
  const ids = lessons.map((lesson) => lesson.id);
  if (ids.length) {
    await prisma.contentReview.deleteMany({ where: { resourceId: { in: ids } } });
    await prisma.contentPrerequisite.deleteMany({ where: { OR: [{ resourceId: { in: ids } }, { requiredId: { in: ids } }] } });
    await prisma.contentMetric.deleteMany({ where: { resourceId: { in: ids } } });
    await prisma.lessonProgress.deleteMany({ where: { lessonId: { in: ids } } });
  }
  await prisma.vocabulary.deleteMany({ where: { word: "Phase14 helmet" } });
  await prisma.contentItem.deleteMany({ where: { title: { in: ["Phase14 helmet", "Phase14 probe lesson"] } } });
  await prisma.contentAiDraft.deleteMany({ where: { prompt: { contains: "Phase14" } } });
  await prisma.contentAiDraft.deleteMany({ where: { prompt: { contains: "workplace safety" } } });
  if (courseIds.length) {
    await prisma.courseAssignment.deleteMany({ where: { courseId: { in: courseIds } } });
    await prisma.contentAssignment.deleteMany({ where: { resourceId: { in: courseIds } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  }
  if (curriculumIds.length) await prisma.curriculum.deleteMany({ where: { id: { in: curriculumIds } } });
  await prisma.contentMedia.deleteMany({ where: { fileName: { contains: "phase14" } } });
  for (const file of mediaFiles) {
    try { unlinkSync(file); } catch { /* already gone */ }
  }
}

main().catch((err) => { fail += 1; console.error(err); }).finally(async () => {
  await cleanup().catch((err) => console.error("cleanup", err));
  console.log(`\n${pass} passed, ${fail} failed`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
});
