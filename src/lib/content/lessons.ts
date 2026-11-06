import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { parseBlock } from "@/lib/blocks";
import { notifyUsers } from "@/lib/teaching/notify";
import type { SessionUser } from "@/types";
import { assertCourseEdit, isReviewer } from "./access";
import { contentSettings } from "./settings";
import { checkLessonQuality, sanitizeContent } from "./rules";

function scrub(value: unknown): unknown {
  if (typeof value === "string") return sanitizeContent(value);
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, scrub(item)]));
  return value;
}
import { snapshotLesson } from "./versions";

async function lessonCourseId(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, select: { id: true, module: { select: { courseId: true } }, status: true, title: true, version: true, beginnerMode: true, createdById: true } });
  if (!lesson) throw new ApiError(404, "Lesson not found.");
  return lesson;
}

export async function assertLessonEdit(actor: SessionUser, lessonId: string) {
  const lesson = await lessonCourseId(lessonId);
  await assertCourseEdit(actor, lesson.module.courseId);
  if (actor.role === "TEACHER" && lesson.createdById && lesson.createdById !== actor.id) {
    const course = await prisma.course.findUnique({ where: { id: lesson.module.courseId }, select: { assignments: { select: { groupId: true } } } });
    if (!course?.assignments.length && lesson.createdById !== actor.id) throw new ApiError(404, "Lesson not found.");
  }
  return lesson;
}

export async function createBuilderLesson(actor: SessionUser, input: { moduleId: string; unitId?: string | null; title: string; beginnerMode?: boolean; difficulty?: string | null }) {
  const mod = await prisma.module.findUnique({ where: { id: input.moduleId }, select: { courseId: true } });
  if (!mod) throw new ApiError(404, "Module not found.");
  await assertCourseEdit(actor, mod.courseId);
  const title = sanitizeContent(input.title);
  if (title.length < 2) throw new ApiError(400, "Enter a lesson title.");
  const last = await prisma.lesson.findFirst({ where: { moduleId: input.moduleId }, orderBy: { order: "desc" } });
  const lesson = await prisma.lesson.create({
    data: {
      moduleId: input.moduleId,
      unitId: input.unitId || null,
      title,
      order: (last?.order ?? 0) + 1,
      status: "DRAFT",
      workflowStatus: "DRAFT",
      beginnerMode: Boolean(input.beginnerMode),
      difficulty: input.difficulty || null,
      createdById: actor.id,
    },
  });
  await audit({ actorId: actor.id, action: "LESSON_CREATED", entityType: "CONTENT", entityId: lesson.id, metadata: { title } });
  return lesson;
}

export async function saveDraft(actor: SessionUser, lessonId: string, blocks: unknown[]) {
  await assertLessonEdit(actor, lessonId);
  const normalized = blocks.map((block, index) => {
    const row = block as { type?: string; data?: unknown; hidden?: boolean; id?: string };
    const type = String(row.type ?? "TEXT");
    const parsed = parseBlock(type, JSON.stringify(row.data ?? {}));
    if (parsed.kind !== "ok") throw new ApiError(422, parsed.error);
    return { id: row.id ?? `draft-${index}`, type, data: scrub(parsed.data), hidden: Boolean(row.hidden), order: index };
  });
  const saved = await prisma.lessonDraft.upsert({
    where: { lessonId },
    create: { lessonId, blocksJson: JSON.stringify(normalized), savedById: actor.id, savedAt: new Date() },
    update: { blocksJson: JSON.stringify(normalized), savedById: actor.id, savedAt: new Date() },
  });
  return { savedAt: saved.savedAt.toISOString(), count: normalized.length };
}

export async function readDraft(actor: SessionUser, lessonId: string) {
  const lesson = await assertLessonEdit(actor, lessonId);
  const draft = await prisma.lessonDraft.findUnique({ where: { lessonId } });
  const published = await prisma.contentBlock.findMany({ where: { lessonId }, orderBy: { order: "asc" } });
  const blocks = draft ? JSON.parse(draft.blocksJson) as unknown[] : published.map((block) => ({ id: block.id, type: block.type, data: JSON.parse(block.data), hidden: block.hidden, order: block.order }));
  return { lesson, blocks, savedAt: draft?.savedAt.toISOString() ?? null, published: lesson.status === "PUBLISHED" };
}

export async function checkQuality(lessonId: string) {
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId }, include: { draft: true, blocks: true } });
  if (!lesson) throw new ApiError(404, "Lesson not found.");
  const source = lesson.draft ? JSON.parse(lesson.draft.blocksJson) as { type: string; data: Record<string, unknown>; hidden?: boolean }[] : lesson.blocks.map((block) => ({ type: block.type, data: JSON.parse(block.data) as Record<string, unknown>, hidden: block.hidden }));
  const objectives = await prisma.learningObjective.count({ where: { resourceType: "LESSON", resourceId: lessonId, archivedAt: null } });
  const objectiveCount = objectives + (lesson.objectives ? 1 : 0);
  const prerequisites = await prisma.contentPrerequisite.findMany({ where: { resourceType: "LESSON", resourceId: lessonId, requiredType: "LESSON" } });
  const required = prerequisites.length
    ? await prisma.lesson.findMany({ where: { id: { in: prerequisites.map((item) => item.requiredId) } }, select: { status: true } })
    : [];
  const usages = await prisma.contentItemUsage.findMany({ where: { lessonId }, select: { contentItemId: true } });
  const found = usages.length ? await prisma.contentItem.count({ where: { id: { in: usages.map((item) => item.contentItemId) }, archivedAt: null } }) : 0;
  const result = checkLessonQuality({
    title: lesson.title,
    objectiveCount,
    blocks: source,
    beginnerMode: lesson.beginnerMode,
    unpublishedDependency: required.some((item) => item.status !== "PUBLISHED"),
    brokenReference: found !== usages.length,
  });
  await prisma.contentQualityCheck.create({ data: { resourceType: "LESSON", resourceId: lessonId, ok: result.ok, issues: JSON.stringify(result.issues) } });
  return result;
}

export async function submitForReview(actor: SessionUser, lessonId: string) {
  await assertLessonEdit(actor, lessonId);
  const quality = await checkQuality(lessonId);
  if (!quality.ok) throw new ApiError(422, quality.issues[0]?.message ?? "Fix the quality checks before review.");
  await prisma.contentReview.create({ data: { resourceType: "LESSON", resourceId: lessonId, status: "IN_REVIEW" } });
  await prisma.lesson.update({ where: { id: lessonId }, data: { workflowStatus: "IN_REVIEW" } });
  await audit({ actorId: actor.id, action: "CONTENT_SUBMITTED", entityType: "CONTENT", entityId: lessonId, metadata: { resourceType: "LESSON" } });
  return { status: "IN_REVIEW" };
}

export async function reviewLesson(actor: SessionUser, lessonId: string, input: { status: "APPROVED" | "REJECTED" | "CHANGES_REQUESTED"; reason?: string; comment?: string }) {
  if (!(await isReviewer(actor))) throw new ApiError(403, "You do not have review permission.");
  const reason = input.reason ? sanitizeContent(input.reason) : null;
  if (input.status !== "APPROVED" && !reason) throw new ApiError(400, "Enter a reason.");
  await prisma.contentReview.create({
    data: { resourceType: "LESSON", resourceId: lessonId, status: input.status, reviewerId: actor.id, reason, comment: input.comment ? sanitizeContent(input.comment) : null },
  });
  await prisma.lesson.update({ where: { id: lessonId }, data: { workflowStatus: input.status === "APPROVED" ? "APPROVED" : "DRAFT" } });
  await audit({ actorId: actor.id, action: input.status === "APPROVED" ? "CONTENT_APPROVED" : "CONTENT_REJECTED", entityType: "CONTENT", entityId: lessonId, metadata: { status: input.status, reason } });
  return { status: input.status };
}

export async function publishLesson(actor: SessionUser, lessonId: string, confirm: boolean) {
  if (!confirm) throw new ApiError(400, "Confirm publishing.");
  const lesson = await assertLessonEdit(actor, lessonId);
  const settings = await contentSettings();
  const approved = await prisma.contentReview.findFirst({ where: { resourceType: "LESSON", resourceId: lessonId, status: "APPROVED" }, orderBy: { createdAt: "desc" } });
  if (actor.role !== "ADMIN" && settings.requireReview && !approved) {
    throw new ApiError(409, "Submit this lesson for review. A reviewer must approve it before it is published.");
  }
  const quality = await checkQuality(lessonId);
  if (!quality.ok && actor.role !== "ADMIN") throw new ApiError(422, quality.issues[0]?.message ?? "Quality checks failed.");
  const draft = await prisma.lessonDraft.findUnique({ where: { lessonId } });
  if (lesson.status === "PUBLISHED") await snapshotLesson(lessonId, actor.id, "Published a new version");
  if (draft) {
    const blocks = JSON.parse(draft.blocksJson) as { type: string; data: unknown; hidden?: boolean }[];
    await prisma.$transaction([
      prisma.contentBlock.deleteMany({ where: { lessonId } }),
      prisma.contentBlock.createMany({
        data: blocks.map((block, index) => ({ lessonId, type: block.type, order: index, data: JSON.stringify(block.data), hidden: Boolean(block.hidden) })),
      }),
    ]);
  }
  const visible = await prisma.contentBlock.count({ where: { lessonId, hidden: false, type: { not: "TEACHER_NOTE" } } });
  if (visible === 0) throw new ApiError(422, "Add at least one visible block before publishing.");
  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: { status: "PUBLISHED", workflowStatus: "PUBLISHED", version: { increment: 1 } },
  });
  await prisma.module.update({ where: { id: updated.moduleId }, data: { status: "PUBLISHED" } });
  const course = await prisma.module.findUnique({ where: { id: updated.moduleId }, select: { courseId: true, course: { select: { status: true, assignments: { select: { groupId: true } } } } } });
  if (course && course.course.status === "DRAFT" && actor.role === "ADMIN") {
    await prisma.course.update({ where: { id: course.courseId }, data: { status: "PUBLISHED", workflowStatus: "PUBLISHED" } });
  }
  const groupIds = course?.course.assignments.map((row) => row.groupId) ?? [];
  if (groupIds.length && lesson.status !== "PUBLISHED") {
    const students = await prisma.user.findMany({ where: { role: "STUDENT", status: "ACTIVE", groupId: { in: groupIds } }, select: { id: true } });
    await notifyUsers(students.map((student) => student.id), { type: "LESSON", category: "ACADEMIC", title: "New lesson", body: updated.title, href: `/student/learn/${lessonId}`, source: "CONTENT" });
  }
  await audit({ actorId: actor.id, action: "CONTENT_PUBLISHED", entityType: "CONTENT", entityId: lessonId, metadata: { version: updated.version, qualityOk: quality.ok } });
  return updated;
}

export async function previewLesson(actor: SessionUser, lessonId: string) {
  await assertLessonEdit(actor, lessonId);
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      draft: true,
      blocks: { orderBy: { order: "asc" } },
      vocabulary: { orderBy: { order: "asc" } },
      grammar: { orderBy: { order: "asc" } },
    },
  });
  if (!lesson) throw new ApiError(404, "Lesson not found.");
  const blocks = lesson.draft
    ? (JSON.parse(lesson.draft.blocksJson) as { type: string; data: unknown; hidden?: boolean }[]).filter((block) => !block.hidden && block.type !== "TEACHER_NOTE")
    : lesson.blocks.filter((block) => !block.hidden && block.type !== "TEACHER_NOTE").map((block) => ({ type: block.type, data: JSON.parse(block.data) }));
  return {
    title: lesson.title,
    beginnerMode: lesson.beginnerMode,
    difficulty: lesson.difficulty,
    blocks,
    vocabulary: lesson.vocabulary,
    grammar: lesson.grammar,
    preview: true,
    note: "Preview does not change student progress.",
  };
}
