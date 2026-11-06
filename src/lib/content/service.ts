import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { sanitizeMessage } from "@/lib/communication/sanitize";
import { notifyGroupStudents, notifyUsers } from "@/lib/teaching/notify";
import { assignedGroupIds } from "@/lib/teaching/access";
import type { SessionUser } from "@/types";
import { assertCourseEdit, isReviewer } from "./access";
import { contentSettings, ensureContentTags, ensureCurriculumShell } from "./settings";
import { sanitizeContent, validateDifficulty } from "./rules";
import { snapshotCourse } from "./versions";

function clean(value: string) {
  return sanitizeContent(sanitizeMessage(value));
}

export async function listCurricula() {
  await ensureContentTags();
  await ensureCurriculumShell();
  return prisma.curriculum.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: { _count: { select: { courses: true, versions: true } } },
  });
}

export async function createCurriculum(actor: SessionUser, input: {
  title: string;
  description?: string | null;
  levelCode?: string | null;
  goal?: string | null;
  durationWeeks?: number | null;
  sessionCount?: number | null;
  plannedHours?: number | null;
  sortOrder?: number;
}) {
  if (actor.role !== "ADMIN") throw new ApiError(403, "Only an administrator can create a curriculum.");
  const title = clean(input.title);
  if (title.length < 3) throw new ApiError(400, "Enter a curriculum title.");
  const row = await prisma.curriculum.create({
    data: {
      title,
      description: input.description ? clean(input.description) : null,
      levelCode: input.levelCode || null,
      goal: input.goal ? clean(input.goal) : null,
      durationWeeks: input.durationWeeks ?? null,
      sessionCount: input.sessionCount ?? null,
      plannedHours: input.plannedHours ?? null,
      sortOrder: input.sortOrder ?? 0,
      createdById: actor.id,
      status: "DRAFT",
    },
  });
  await audit({ actorId: actor.id, action: "CURRICULUM_CREATED", entityType: "CONTENT", entityId: row.id, metadata: { title } });
  return row;
}

export async function updateCurriculum(actor: SessionUser, id: string, input: Partial<{ title: string; description: string; goal: string; status: string; levelCode: string; durationWeeks: number; sessionCount: number; plannedHours: number; sortOrder: number }>) {
  if (actor.role !== "ADMIN") throw new ApiError(403, "Only an administrator can edit a curriculum.");
  const current = await prisma.curriculum.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, "Curriculum not found.");
  if (current.status === "ACTIVE") {
    await prisma.curriculumVersion.create({
      data: {
        curriculumId: id,
        version: current.version,
        snapshot: JSON.stringify({ title: current.title, goal: current.goal, status: current.status }),
        changeNote: "Saved before edit",
        status: current.status,
        authorId: actor.id,
      },
    });
  }
  const updated = await prisma.curriculum.update({
    where: { id },
    data: {
      title: input.title ? clean(input.title) : undefined,
      description: input.description ? clean(input.description) : undefined,
      goal: input.goal ? clean(input.goal) : undefined,
      levelCode: input.levelCode,
      durationWeeks: input.durationWeeks,
      sessionCount: input.sessionCount,
      plannedHours: input.plannedHours,
      sortOrder: input.sortOrder,
      status: input.status,
      version: current.status === "ACTIVE" ? { increment: 1 } : undefined,
      archivedAt: input.status === "ARCHIVED" ? new Date() : undefined,
    },
  });
  await audit({ actorId: actor.id, action: "CURRICULUM_EDITED", entityType: "CONTENT", entityId: id, metadata: { before: current.status, after: updated.status } });
  return updated;
}

export async function duplicateCurriculum(actor: SessionUser, id: string) {
  if (actor.role !== "ADMIN") throw new ApiError(403, "Only an administrator can duplicate a curriculum.");
  const source = await prisma.curriculum.findUnique({
    where: { id },
    include: { courses: { include: { modules: { include: { units: true, lessons: { include: { blocks: true } } } } } } },
  });
  if (!source) throw new ApiError(404, "Curriculum not found.");
  const copy = await prisma.curriculum.create({
    data: {
      title: `${source.title} copy`,
      description: source.description,
      levelCode: source.levelCode,
      goal: source.goal,
      durationWeeks: source.durationWeeks,
      sessionCount: source.sessionCount,
      plannedHours: source.plannedHours,
      status: "DRAFT",
      createdById: actor.id,
    },
  });
  for (const course of source.courses) {
    const level = await prisma.level.findUnique({ where: { id: course.levelId } });
    if (!level) continue;
    const created = await prisma.course.create({
      data: {
        code: `${course.code}-copy-${copy.id.slice(-6)}-${course.id.slice(-4)}`,
        title: `${course.title} copy`,
        description: course.description,
        levelId: course.levelId,
        status: "DRAFT",
        curriculumId: copy.id,
        goal: course.goal,
        durationWeeks: course.durationWeeks,
        sessionCount: course.sessionCount,
        plannedHours: course.plannedHours,
        outcomes: course.outcomes,
        sortOrder: course.sortOrder,
        createdById: actor.id,
        workflowStatus: "DRAFT",
      },
    });
    for (const mod of course.modules) {
      const moduleRow = await prisma.module.create({
        data: { courseId: created.id, title: mod.title, description: mod.description, order: mod.order, status: "DRAFT", goal: mod.goal },
      });
      for (const unit of mod.units) {
        await prisma.unit.create({ data: { moduleId: moduleRow.id, title: unit.title, description: unit.description, goal: unit.goal, order: unit.order, status: "DRAFT" } });
      }
      for (const lesson of mod.lessons) {
        const lessonRow = await prisma.lesson.create({
          data: {
            moduleId: moduleRow.id,
            title: lesson.title,
            description: lesson.description,
            objectives: lesson.objectives,
            durationMin: lesson.durationMin,
            order: lesson.order,
            status: "DRAFT",
            goal: lesson.goal,
            difficulty: lesson.difficulty,
            beginnerMode: lesson.beginnerMode,
            createdById: actor.id,
            workflowStatus: "DRAFT",
          },
        });
        if (lesson.blocks.length) {
          await prisma.contentBlock.createMany({
            data: lesson.blocks.map((block) => ({ lessonId: lessonRow.id, type: block.type, order: block.order, data: block.data, hidden: block.hidden })),
          });
        }
      }
    }
  }
  await audit({ actorId: actor.id, action: "CURRICULUM_CREATED", entityType: "CONTENT", entityId: copy.id, metadata: { duplicatedFrom: id } });
  return copy;
}

export async function createCourse(actor: SessionUser, input: {
  curriculumId?: string | null;
  levelId: string;
  title: string;
  description?: string | null;
  goal?: string | null;
  outcomes?: string | null;
  durationWeeks?: number | null;
  sessionCount?: number | null;
  plannedHours?: number | null;
  imageUrl?: string | null;
  icon?: string | null;
}) {
  if (actor.role !== "ADMIN" && actor.role !== "TEACHER") throw new ApiError(403, "You cannot create a course.");
  const level = await prisma.level.findUnique({ where: { id: input.levelId } });
  if (!level) throw new ApiError(400, "Choose a level.");
  const title = clean(input.title);
  if (title.length < 3) throw new ApiError(400, "Enter a course title.");
  const code = `course-${Date.now().toString(36)}`;
  const course = await prisma.course.create({
    data: {
      code,
      title,
      description: input.description ? clean(input.description) : null,
      levelId: level.id,
      status: "DRAFT",
      curriculumId: input.curriculumId || null,
      goal: input.goal ? clean(input.goal) : null,
      outcomes: input.outcomes ? clean(input.outcomes) : null,
      durationWeeks: input.durationWeeks ?? null,
      sessionCount: input.sessionCount ?? null,
      plannedHours: input.plannedHours ?? null,
      imageUrl: input.imageUrl && input.imageUrl.startsWith("/") ? input.imageUrl : null,
      icon: input.icon ? clean(input.icon).slice(0, 40) : null,
      createdById: actor.id,
      workflowStatus: "DRAFT",
    },
  });
  await audit({ actorId: actor.id, action: "COURSE_CREATED", entityType: "CONTENT", entityId: course.id, metadata: { title, level: level.code } });
  return course;
}

export async function updateCourse(actor: SessionUser, id: string, input: Partial<{ title: string; description: string; goal: string; outcomes: string; durationWeeks: number; sessionCount: number; plannedHours: number; sortOrder: number; imageUrl: string; icon: string }>) {
  await assertCourseEdit(actor, id);
  const current = await prisma.course.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, "Course not found.");
  if (current.status === "PUBLISHED") await snapshotCourse(id, actor.id, "Course details edited");
  const updated = await prisma.course.update({
    where: { id },
    data: {
      title: input.title ? clean(input.title) : undefined,
      description: input.description ? clean(input.description) : undefined,
      goal: input.goal ? clean(input.goal) : undefined,
      outcomes: input.outcomes ? clean(input.outcomes) : undefined,
      durationWeeks: input.durationWeeks,
      sessionCount: input.sessionCount,
      plannedHours: input.plannedHours,
      sortOrder: input.sortOrder,
      imageUrl: input.imageUrl && input.imageUrl.startsWith("/") ? input.imageUrl : undefined,
      icon: input.icon ? clean(input.icon).slice(0, 40) : undefined,
      version: current.status === "PUBLISHED" ? { increment: 1 } : undefined,
    },
  });
  await audit({ actorId: actor.id, action: "COURSE_EDITED", entityType: "CONTENT", entityId: id, metadata: { title: updated.title } });
  return updated;
}

export async function createModule(actor: SessionUser, input: { courseId: string; title: string; description?: string | null; goal?: string | null }) {
  await assertCourseEdit(actor, input.courseId);
  const title = clean(input.title);
  if (title.length < 2) throw new ApiError(400, "Enter a module title.");
  const last = await prisma.module.findFirst({ where: { courseId: input.courseId }, orderBy: { order: "desc" } });
  const row = await prisma.module.create({
    data: { courseId: input.courseId, title, description: input.description ? clean(input.description) : null, goal: input.goal ? clean(input.goal) : null, order: (last?.order ?? 0) + 1, status: "DRAFT" },
  });
  await audit({ actorId: actor.id, action: "MODULE_CREATED", entityType: "CONTENT", entityId: row.id, metadata: { courseId: input.courseId, title } });
  return row;
}

export async function createUnit(actor: SessionUser, input: { moduleId: string; title: string; goal?: string | null; description?: string | null }) {
  const mod = await prisma.module.findUnique({ where: { id: input.moduleId }, select: { courseId: true } });
  if (!mod) throw new ApiError(404, "Module not found.");
  await assertCourseEdit(actor, mod.courseId);
  const title = clean(input.title);
  if (title.length < 2) throw new ApiError(400, "Enter a unit title.");
  const last = await prisma.unit.findFirst({ where: { moduleId: input.moduleId }, orderBy: { order: "desc" } });
  const row = await prisma.unit.create({
    data: { moduleId: input.moduleId, title, description: input.description ? clean(input.description) : null, goal: input.goal ? clean(input.goal) : null, order: (last?.order ?? 0) + 1, status: "DRAFT" },
  });
  await audit({ actorId: actor.id, action: "UNIT_CREATED", entityType: "CONTENT", entityId: row.id, metadata: { moduleId: input.moduleId } });
  return row;
}

export async function saveObjective(actor: SessionUser, input: { resourceType: string; resourceId: string; text: string }) {
  const text = clean(input.text);
  if (text.length < 3) throw new ApiError(400, "Enter an objective.");
  const last = await prisma.learningObjective.findFirst({ where: { resourceType: input.resourceType, resourceId: input.resourceId }, orderBy: { order: "desc" } });
  return prisma.learningObjective.create({
    data: { resourceType: input.resourceType, resourceId: input.resourceId, text, order: (last?.order ?? 0) + 1 },
  });
}

export async function saveSkillMapping(actor: SessionUser, input: { resourceType: string; resourceId: string; primarySkill: string; secondarySkill?: string | null }) {
  if (!["VOCABULARY", "GRAMMAR", "READING", "WRITING", "LISTENING", "SPEAKING"].includes(input.primarySkill)) {
    throw new ApiError(400, "Choose a primary skill.");
  }
  return prisma.skillMapping.upsert({
    where: { resourceType_resourceId: { resourceType: input.resourceType, resourceId: input.resourceId } },
    create: { resourceType: input.resourceType, resourceId: input.resourceId, primarySkill: input.primarySkill, secondarySkill: input.secondarySkill || null },
    update: { primarySkill: input.primarySkill, secondarySkill: input.secondarySkill || null },
  });
}

export async function savePrerequisite(actor: SessionUser, input: { resourceType: string; resourceId: string; requiredType: string; requiredId: string }) {
  if (input.resourceId === input.requiredId && input.resourceType === input.requiredType) throw new ApiError(400, "A lesson cannot require itself.");
  const row = await prisma.contentPrerequisite.upsert({
    where: { resourceType_resourceId_requiredType_requiredId: { resourceType: input.resourceType, resourceId: input.resourceId, requiredType: input.requiredType, requiredId: input.requiredId } },
    create: { ...input, createdById: actor.id },
    update: {},
  });
  await audit({ actorId: actor.id, action: "PREREQUISITE_SET", entityType: "CONTENT", entityId: input.resourceId, metadata: input });
  return row;
}

export async function saveRelease(actor: SessionUser, input: { resourceType: string; resourceId: string; mode: string; releaseAt?: string | null; afterId?: string | null; released?: boolean }) {
  if (!["IMMEDIATE", "SCHEDULED", "SEQUENTIAL", "TEACHER"].includes(input.mode)) throw new ApiError(400, "Choose a release mode.");
  const releaseAt = input.releaseAt ? new Date(input.releaseAt) : null;
  if (input.mode === "SCHEDULED" && (!releaseAt || Number.isNaN(releaseAt.getTime()))) throw new ApiError(400, "Enter a release time.");
  const row = await prisma.contentRelease.upsert({
    where: { resourceType_resourceId: { resourceType: input.resourceType, resourceId: input.resourceId } },
    create: {
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      mode: input.mode,
      releaseAt,
      afterType: input.afterId ? "LESSON" : null,
      afterId: input.afterId || null,
      released: Boolean(input.released) || input.mode === "IMMEDIATE",
      releasedById: actor.id,
    },
    update: {
      mode: input.mode,
      releaseAt,
      afterId: input.afterId || null,
      released: input.released ?? input.mode === "IMMEDIATE",
      releasedById: actor.id,
    },
  });
  await audit({ actorId: actor.id, action: "CONTENT_SCHEDULED", entityType: "CONTENT", entityId: input.resourceId, metadata: { mode: input.mode } });
  return row;
}

export async function assignContent(actor: SessionUser, input: { resourceType: string; resourceId: string; targetType: string; targetId: string }) {
  if (input.targetType === "GROUP" || input.targetType === "SHIFT") {
    const ids = await assignedGroupIds(actor);
    if (ids !== null && !ids.includes(input.targetId)) throw new ApiError(404, "Group not found.");
  }
  if (input.targetType === "STUDENT") {
    const student = await prisma.user.findFirst({ where: { id: input.targetId, role: "STUDENT", status: "ACTIVE" } });
    if (!student) throw new ApiError(404, "Student not found.");
    const ids = await assignedGroupIds(actor);
    if (ids !== null && (!student.groupId || !ids.includes(student.groupId))) throw new ApiError(404, "Student not found.");
  }
  if (input.resourceType === "COURSE" && (input.targetType === "GROUP" || input.targetType === "SHIFT")) {
    await prisma.courseAssignment.upsert({
      where: { courseId_groupId: { courseId: input.resourceId, groupId: input.targetId } },
      create: { courseId: input.resourceId, groupId: input.targetId },
      update: {},
    });
  }
  const row = await prisma.contentAssignment.create({
    data: { resourceType: input.resourceType, resourceId: input.resourceId, targetType: input.targetType === "SHIFT" ? "GROUP" : input.targetType, targetId: input.targetId, assignedById: actor.id },
  });
  if (input.targetType === "STUDENT") {
    await notifyUsers([input.targetId], { type: "LESSON", category: "ACADEMIC", title: "New learning material", body: "A teacher assigned material to you.", href: "/student/learning", source: "CONTENT" });
  } else {
    await notifyGroupStudents(input.targetId, { type: "LESSON", category: "ACADEMIC", title: "New learning material", body: "New material was assigned to your group.", href: "/student/learning", source: "CONTENT" });
  }
  await audit({ actorId: actor.id, action: "CONTENT_ASSIGNED", entityType: "CONTENT", entityId: row.id, metadata: { resourceType: input.resourceType, targetType: input.targetType } });
  return row;
}

export async function grantReviewer(actor: SessionUser, userId: string, enabled: boolean) {
  if (actor.role !== "ADMIN") throw new ApiError(403, "Only an administrator can grant review permission.");
  const user = await prisma.user.findFirst({ where: { id: userId, role: "TEACHER", status: "ACTIVE" } });
  if (!user) throw new ApiError(404, "Teacher not found.");
  await prisma.user.update({ where: { id: userId }, data: { contentReviewer: enabled } });
  await audit({ actorId: actor.id, action: "CONTENT_REVIEWER_CHANGED", entityType: "CONTENT", entityId: userId, metadata: { enabled } });
  return { id: userId, contentReviewer: enabled };
}

export async function reviewerOrAdmin(actor: SessionUser) {
  if (!(await isReviewer(actor))) throw new ApiError(403, "You do not have review permission.");
}

export { validateDifficulty, contentSettings };
