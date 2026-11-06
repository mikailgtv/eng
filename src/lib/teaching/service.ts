/**
 * Teacher operations. Timestamps are server time. Attendance and submissions
 * are unique per student. Authorization is checked before every write.
 */
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { parseBlock } from "@/lib/blocks";
import { assignedGroupIds, assertAssignmentAccess, assertGroupAccess, assertLessonStaffAccess, assertSessionAccess, assertStudentAssignment, type Viewer } from "./access";
import { notifyGroupStudents, notifyUsers } from "./notify";
import { sessionCompletionIssues } from "./session-rules";

const ATTENDANCE = new Set(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);
const ASSIGNMENT_TYPES = new Set(["PRACTICE", "WRITTEN", "VOCABULARY", "READING"]);

function assertAttendance(status: string) {
  if (!ATTENDANCE.has(status)) throw new ApiError(422, "Attendance must be Present, Absent, Late or Excused.");
}

export async function syncLeadTeacher(actor: Viewer, groupId: string, previousId: string | null, teacherId: string | null) {
  if (previousId === teacherId) return;
  if (actor.role !== "ADMIN") throw new ApiError(403, "Only an administrator can assign teachers.");
  if (teacherId) {
    const teacher = await prisma.user.findFirst({ where: { id: teacherId, role: "TEACHER", status: "ACTIVE" } });
    if (!teacher) throw new ApiError(422, "Choose an active teacher.");
  }
  await prisma.$transaction(async (tx) => {
    if (previousId) await tx.teacherGroupAssignment.deleteMany({ where: { groupId, teacherId: previousId } });
    if (teacherId) {
      await tx.teacherGroupAssignment.upsert({
        where: { teacherId_groupId: { teacherId, groupId } },
        create: { teacherId, groupId, assignedById: actor.id },
        update: {},
      });
    }
  });
  await audit({
    actorId: actor.id,
    action: "TEACHER_ASSIGNMENT_CHANGED",
    entityType: "GROUP",
    entityId: groupId,
    metadata: { previousTeacherId: previousId, teacherId },
  });
}

export async function setLeadTeacher(actor: Viewer, groupId: string, teacherId: string | null) {
  if (actor.role !== "ADMIN") throw new ApiError(403, "Only an administrator can assign teachers.");
  const group = await prisma.learningGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new ApiError(404, "Group not found.");
  if (teacherId) {
    const teacher = await prisma.user.findFirst({ where: { id: teacherId, role: "TEACHER", status: "ACTIVE" } });
    if (!teacher) throw new ApiError(422, "Choose an active teacher.");
  }
  await prisma.learningGroup.update({ where: { id: groupId }, data: { teacherId } });
  await syncLeadTeacher(actor, groupId, group.teacherId, teacherId);
}

export async function grantTeacher(actor: Viewer, groupId: string, teacherId: string) {
  if (actor.role !== "ADMIN") throw new ApiError(403, "Only an administrator can assign teachers.");
  const group = await prisma.learningGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new ApiError(404, "Group not found.");
  const teacher = await prisma.user.findFirst({ where: { id: teacherId, role: "TEACHER", status: "ACTIVE" } });
  if (!teacher) throw new ApiError(422, "Choose an active teacher.");
  await prisma.teacherGroupAssignment.upsert({
    where: { teacherId_groupId: { teacherId, groupId } },
    create: { teacherId, groupId, assignedById: actor.id },
    update: {},
  });
  if (!group.teacherId) {
    await prisma.learningGroup.update({ where: { id: groupId }, data: { teacherId } });
  }
  await audit({
    actorId: actor.id,
    action: "TEACHER_ASSIGNMENT_CHANGED",
    entityType: "GROUP",
    entityId: groupId,
    metadata: { grantedTeacherId: teacherId },
  });
}

export async function revokeTeacher(actor: Viewer, groupId: string, teacherId: string) {
  if (actor.role !== "ADMIN") throw new ApiError(403, "Only an administrator can remove teachers.");
  const group = await prisma.learningGroup.findUnique({ where: { id: groupId } });
  if (!group) throw new ApiError(404, "Group not found.");
  await prisma.teacherGroupAssignment.deleteMany({ where: { groupId, teacherId } });
  if (group.teacherId === teacherId) {
    const next = await prisma.teacherGroupAssignment.findFirst({ where: { groupId }, select: { teacherId: true } });
    await prisma.learningGroup.update({ where: { id: groupId }, data: { teacherId: next?.teacherId ?? null } });
  }
  await audit({
    actorId: actor.id,
    action: "TEACHER_ASSIGNMENT_CHANGED",
    entityType: "GROUP",
    entityId: groupId,
    metadata: { revokedTeacherId: teacherId },
  });
}

export async function createSession(
  viewer: Viewer,
  input: {
    groupId: string;
    title: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    courseId?: string | null;
    moduleId?: string | null;
    lessonId?: string | null;
    recurrenceId?: string | null;
  }
) {
  await assertGroupAccess(viewer, input.groupId);
  if (!(input.scheduledEnd > input.scheduledStart)) throw new ApiError(422, "The class must end after it starts.");

  let courseId = input.courseId || null;
  let moduleId = input.moduleId || null;
  let lessonId = input.lessonId || null;
  if (lessonId) {
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        status: "PUBLISHED",
        module: { status: "PUBLISHED", course: { status: "PUBLISHED", assignments: { some: { groupId: input.groupId } } } },
      },
      select: { id: true, moduleId: true, module: { select: { courseId: true } } },
    });
    if (!lesson || (moduleId && moduleId !== lesson.moduleId) || (courseId && courseId !== lesson.module.courseId)) {
      throw new ApiError(422, "Choose a published lesson from a course assigned to this class.");
    }
    lessonId = lesson.id;
    moduleId = lesson.moduleId;
    courseId = lesson.module.courseId;
  } else if (moduleId) {
    const module = await prisma.module.findFirst({
      where: {
        id: moduleId,
        status: "PUBLISHED",
        course: { status: "PUBLISHED", assignments: { some: { groupId: input.groupId } } },
      },
      select: { id: true, courseId: true },
    });
    if (!module || (courseId && courseId !== module.courseId)) throw new ApiError(422, "Choose a published module from a course assigned to this class.");
    moduleId = module.id;
    courseId = module.courseId;
  } else if (courseId) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, status: "PUBLISHED", assignments: { some: { groupId: input.groupId } } },
      select: { id: true },
    });
    if (!course) throw new ApiError(422, "Choose a published course assigned to this class.");
    courseId = course.id;
  }

  const teacherId = viewer.role === "ADMIN" ? (await leadOrSelf(input.groupId, viewer.id)) : viewer.id;
  const session = await prisma.classSession.create({
    data: {
      groupId: input.groupId,
      teacherId,
      title: input.title.trim(),
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd,
      courseId,
      moduleId,
      lessonId,
      recurrenceId: input.recurrenceId || null,
      status: "SCHEDULED",
    },
  });
  await audit({ actorId: viewer.id, action: "CLASS_SCHEDULED", entityType: "CLASS", entityId: session.id, metadata: { groupId: input.groupId, courseId, moduleId, lessonId, scheduledStart: input.scheduledStart.toISOString() } });
  return session;
}

async function leadOrSelf(groupId: string, fallback: string) {
  const group = await prisma.learningGroup.findUnique({ where: { id: groupId }, select: { teacherId: true } });
  return group?.teacherId ?? fallback;
}

export async function startSession(viewer: Viewer, sessionId: string) {
  const session = await assertSessionAccess(viewer, sessionId);
  if (session.status === "IN_PROGRESS") return session;
  if (session.status !== "SCHEDULED") throw new ApiError(422, "Only a scheduled class can be started.");
  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const busy = await tx.classSession.findFirst({
      where: {
        id: { not: session.id },
        status: "IN_PROGRESS",
        OR: [{ groupId: session.groupId }, { teacherId: viewer.role === "ADMIN" ? session.teacherId : viewer.id }],
      },
      select: { id: true, title: true },
    });
    if (busy) throw new ApiError(422, `Another class is already in progress (${busy.title}). End it first.`);
    return tx.classSession.update({
      where: { id: session.id },
      data: { status: "IN_PROGRESS", actualStart: now },
    });
  });
  await audit({
    actorId: viewer.id,
    action: "CLASS_STARTED",
    entityType: "CLASS",
    entityId: session.id,
    metadata: { groupId: session.groupId, actualStart: now.toISOString() },
  });
  return updated;
}

export async function endSession(viewer: Viewer, sessionId: string) {
  const session = await assertSessionAccess(viewer, sessionId);
  const students = await prisma.user.findMany({
    where: { groupId: session.groupId, role: "STUDENT", status: "ACTIVE" },
    select: { id: true },
  });
  const attended = students.length
    ? await prisma.attendanceRecord.findMany({
        where: { sessionId: session.id, studentId: { in: students.map((student) => student.id) } },
        select: { studentId: true },
      })
    : [];
  const validLesson = session.lessonId
    ? await prisma.lesson.findFirst({
        where: {
          id: session.lessonId,
          status: "PUBLISHED",
          module: {
            status: "PUBLISHED",
            course: { status: "PUBLISHED", assignments: { some: { groupId: session.groupId } } },
          },
        },
        select: { id: true },
      })
    : null;
  const issues = sessionCompletionIssues({
    status: session.status,
    actualStart: session.actualStart,
    hasValidLesson: Boolean(validLesson),
    activeStudentIds: students.map((student) => student.id),
    attendedStudentIds: attended.map((row) => row.studentId),
  });
  if (issues.length) throw new ApiError(422, `Cannot complete session: ${issues.join(" ")}`);

  const now = new Date();
  const updated = await prisma.classSession.update({
    where: { id: session.id },
    data: { status: "COMPLETED", actualEnd: now },
  });
  await prisma.teachingPlan.updateMany({
    where: { groupId: session.groupId, lessonId: session.lessonId, status: "PLANNED" },
    data: { status: "COMPLETED", sessionId: session.id },
  });
  await audit({
    actorId: viewer.id,
    action: "CLASS_ENDED",
    entityType: "CLASS",
    entityId: session.id,
    metadata: { actualEnd: now.toISOString(), lessonId: session.lessonId, attendanceRecorded: attended.length },
  });
  return updated;
}

/** Select the published lesson delivered in this real class session. */
export async function setSessionLesson(viewer: Viewer, sessionId: string, lessonId: string) {
  const session = await assertSessionAccess(viewer, sessionId);
  if (!["SCHEDULED", "IN_PROGRESS"].includes(session.status)) throw new ApiError(409, "Lesson selection is closed for this session.");
  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      status: "PUBLISHED",
      module: {
        status: "PUBLISHED",
        course: { status: "PUBLISHED", assignments: { some: { groupId: session.groupId } } },
      },
    },
    select: { id: true, title: true, moduleId: true, module: { select: { courseId: true } } },
  });
  if (!lesson) throw new ApiError(404, "Choose a published lesson from a course assigned to this class.");
  const updated = await prisma.classSession.update({
    where: { id: session.id },
    data: { lessonId: lesson.id, moduleId: lesson.moduleId, courseId: lesson.module.courseId },
  });
  await audit({
    actorId: viewer.id,
    action: "CLASS_LESSON_SELECTED",
    entityType: "CLASS",
    entityId: session.id,
    metadata: { previousLessonId: session.lessonId, lessonId: lesson.id },
  });
  return updated;
}

export async function cancelSession(viewer: Viewer, sessionId: string) {
  const session = await assertSessionAccess(viewer, sessionId);
  if (session.status === "COMPLETED") throw new ApiError(422, "A completed class cannot be cancelled.");
  const updated = await prisma.classSession.update({ where: { id: session.id }, data: { status: "CANCELLED" } });
  await audit({
    actorId: viewer.id,
    action: "CLASS_CANCELLED",
    entityType: "CLASS",
    entityId: session.id,
    metadata: { previousStatus: session.status, groupId: session.groupId },
  });
  await notifyGroupStudents(session.groupId, {
    type: "CLASS_REMINDER",
    category: "SCHEDULE",
    title: "Class cancelled",
    body: `${session.title} was cancelled. A reason is not inferred.`,
    href: "/student/schedule",
    priority: "HIGH",
    critical: true,
    source: "SCHEDULE",
    relatedType: "CLASS",
    relatedId: session.id,
    actionLabel: "Open schedule",
    groupKey: `class-cancel:${session.id}`,
  });
  return updated;
}

export async function saveAttendance(
  viewer: Viewer,
  sessionId: string,
  marks: { studentId: string; status: string }[]
) {
  const session = await assertSessionAccess(viewer, sessionId);
  if (session.status === "SCHEDULED" || session.status === "CANCELLED") {
    throw new ApiError(422, "Attendance can only be marked during an active class or corrected after completion.");
  }
  if (new Set(marks.map((mark) => mark.studentId)).size !== marks.length) {
    throw new ApiError(422, "Each student may appear only once in an attendance save.");
  }
  for (const mark of marks) assertAttendance(mark.status);

  const members = await prisma.user.findMany({
    where: { groupId: session.groupId, role: "STUDENT", status: "ACTIVE" },
    select: { id: true },
  });
  const memberIds = new Set(members.map((m) => m.id));
  if (marks.some((m) => !memberIds.has(m.studentId))) {
    throw new ApiError(422, "Attendance can only be taken for students in this group.");
  }

  const absentIds: string[] = [];
  const audits: { id: string; studentId: string; previous: string | null; next: string; changed: boolean }[] = [];
  await prisma.$transaction(async (tx) => {
    for (const mark of marks) {
      const existing = await tx.attendanceRecord.findUnique({
        where: { sessionId_studentId: { sessionId, studentId: mark.studentId } },
      });
      if (existing && existing.status === mark.status) continue;
      const row = existing
        ? await tx.attendanceRecord.update({
            where: { id: existing.id },
            data: { status: mark.status, markedById: viewer.id },
          })
        : await tx.attendanceRecord.create({
            data: {
              sessionId,
              studentId: mark.studentId,
              status: mark.status,
              markedById: viewer.id,
            },
          });
      await tx.attendanceChange.create({
        data: {
          attendanceId: row.id,
          sessionId,
          studentId: mark.studentId,
          actorId: viewer.id,
          previousStatus: existing?.status ?? null,
          newStatus: mark.status,
        },
      });
      audits.push({ id: row.id, studentId: mark.studentId, previous: existing?.status ?? null, next: mark.status, changed: Boolean(existing) });
      if (mark.status === "ABSENT" && existing?.status !== "ABSENT") absentIds.push(mark.studentId);
    }
  });
  for (const item of audits) {
    await audit({
      actorId: viewer.id,
      action: item.changed ? "ATTENDANCE_CHANGED" : "ATTENDANCE_MARKED",
      entityType: "ATTENDANCE",
      entityId: item.id,
      metadata: { sessionId, studentId: item.studentId, previous: item.previous, next: item.next },
    });
  }

  if (absentIds.length > 0) {
    await notifyUsers([session.teacherId], {
      type: "ABSENCE",
      title: "Student absence recorded",
      body: `${absentIds.length} student${absentIds.length === 1 ? "" : "s"} marked absent in ${session.title}.`,
      href: `/teacher/classes/${session.id}`,
    });
  }
  return { saved: marks.length };
}

export async function createNote(
  viewer: Viewer,
  input: { scope: "STUDENT" | "GROUP" | "SESSION"; studentId?: string; groupId?: string; sessionId?: string; content: string }
) {
  const content = input.content.trim();
  if (!content) throw new ApiError(422, "Write a note before saving.");
  if (input.scope === "STUDENT") {
    if (!input.studentId) throw new ApiError(422, "Choose a student.");
    const student = await prisma.user.findFirst({
      where: { id: input.studentId, role: "STUDENT" },
      select: { id: true, groupId: true },
    });
    if (!student?.groupId) throw new ApiError(404, "Student not found.");
    await assertGroupAccess(viewer, student.groupId);
    input.groupId = student.groupId;
  } else if (input.scope === "GROUP") {
    if (!input.groupId) throw new ApiError(422, "Choose a group.");
    await assertGroupAccess(viewer, input.groupId);
  } else {
    if (!input.sessionId) throw new ApiError(422, "Choose a class.");
    const session = await assertSessionAccess(viewer, input.sessionId);
    input.groupId = session.groupId;
  }
  const note = await prisma.teacherNote.create({
    data: {
      authorId: viewer.id,
      scope: input.scope,
      studentId: input.studentId ?? null,
      groupId: input.groupId ?? null,
      sessionId: input.sessionId ?? null,
      content,
      visibility: "TEACHER_ONLY",
    },
  });
  await audit({
    actorId: viewer.id,
    action: "TEACHER_NOTE_CREATED",
    entityType: "NOTE",
    entityId: note.id,
    metadata: { scope: input.scope },
  });
  return note;
}

export async function createAssignment(
  viewer: Viewer,
  input: {
    title: string;
    description?: string | null;
    instructions?: string | null;
    type: string;
    groupId: string;
    lessonId?: string | null;
    courseId?: string | null;
    dueAt: Date;
    status?: string;
    allowLate?: boolean;
  }
) {
  await assertGroupAccess(viewer, input.groupId);
  if (!ASSIGNMENT_TYPES.has(input.type)) throw new ApiError(422, "Unknown assignment type.");
  if (!input.title.trim()) throw new ApiError(422, "Title is required.");
  const assignment = await prisma.assignment.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      instructions: input.instructions?.trim() || null,
      type: input.type,
      groupId: input.groupId,
      teacherId: viewer.role === "ADMIN" ? await leadOrSelf(input.groupId, viewer.id) : viewer.id,
      lessonId: input.lessonId || null,
      courseId: input.courseId || null,
      dueAt: input.dueAt,
      status: input.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      allowLate: input.allowLate ?? false,
    },
  });
  await audit({
    actorId: viewer.id,
    action: "ASSIGNMENT_CREATED",
    entityType: "ASSIGNMENT",
    entityId: assignment.id,
    metadata: { title: assignment.title, status: assignment.status },
  });
  if (assignment.status === "PUBLISHED") {
    await notifyGroupStudents(assignment.groupId, {
      type: "ASSIGNMENT",
      title: "New assignment",
      body: assignment.title,
      href: `/student/assignments/${assignment.id}`,
    });
  }
  return assignment;
}

export async function publishAssignment(viewer: Viewer, assignmentId: string) {
  const assignment = await assertAssignmentAccess(viewer, assignmentId);
  if (assignment.status === "PUBLISHED") return assignment;
  const updated = await prisma.assignment.update({ where: { id: assignment.id }, data: { status: "PUBLISHED" } });
  await notifyGroupStudents(assignment.groupId, {
    type: "ASSIGNMENT",
    title: "New assignment",
    body: assignment.title,
    href: `/student/assignments/${assignment.id}`,
  });
  await audit({
    actorId: viewer.id,
    action: "ASSIGNMENT_CREATED",
    entityType: "ASSIGNMENT",
    entityId: assignment.id,
    metadata: { published: true },
  });
  return updated;
}

export async function submitAssignment(viewer: Viewer, assignmentId: string, text: string) {
  const assignment = await assertStudentAssignment(viewer, assignmentId);
  if (assignment.status !== "PUBLISHED") throw new ApiError(422, "This assignment is not open.");
  const body = text.trim();
  if (!body) throw new ApiError(422, "Write your answer before submitting.");
  const now = new Date();
  const late = now > assignment.dueAt;
  if (late && !assignment.allowLate) {
    throw new ApiError(422, "The due date has passed. Late submissions are not accepted for this assignment.");
  }
  const existing = await prisma.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId: viewer.id } },
  });
  if (existing && (existing.status === "SUBMITTED" || existing.status === "LATE" || existing.status === "GRADED")) {
    throw new ApiError(409, "You have already submitted this assignment.");
  }
  const status = late ? "LATE" : "SUBMITTED";
  const row = await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: viewer.id } },
    create: { assignmentId, studentId: viewer.id, textResponse: body, status, submittedAt: now },
    update: { textResponse: body, status, submittedAt: now },
  });
  const { noteAdaptive, noteAssignment } = await import("@/lib/adaptive/hooks");
  noteAdaptive(() => noteAssignment(viewer.id, row.id));
  await notifyUsers([assignment.teacherId], {
    type: "ASSIGNMENT",
    title: "Assignment submitted",
    body: `${assignment.title} has a new submission.`,
    href: `/teacher/assignments/${assignment.id}`,
  });
  return row;
}

export async function reviewSubmission(
  viewer: Viewer,
  submissionId: string,
  input: { feedback?: string | null; score?: number | null }
) {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: { assignment: true },
  });
  if (!submission) throw new ApiError(404, "Submission not found.");
  await assertGroupAccess(viewer, submission.assignment.groupId);
  if (submission.status === "IN_PROGRESS") throw new ApiError(422, "This assignment has not been submitted yet.");
  if (input.score !== undefined && input.score !== null && (input.score < 0 || input.score > 100)) {
    throw new ApiError(422, "Score must be between 0 and 100.");
  }
  const updated = await prisma.assignmentSubmission.update({
    where: { id: submission.id },
    data: {
      status: "GRADED",
      feedback: input.feedback?.trim() || null,
      score: input.score ?? null,
      reviewedById: viewer.id,
      reviewedAt: new Date(),
    },
  });
  await audit({
    actorId: viewer.id,
    action: "ASSIGNMENT_GRADED",
    entityType: "ASSIGNMENT",
    entityId: submission.assignmentId,
    metadata: { submissionId, score: input.score ?? null },
  });
  await notifyUsers([submission.studentId], {
    type: "ASSIGNMENT",
    title: "Assignment reviewed",
    body: submission.assignment.title,
    href: `/student/assignments/${submission.assignmentId}`,
  });
  return updated;
}

export async function createLesson(actor: Viewer, input: { moduleId: string; title: string }) {
  const mod = await prisma.module.findUnique({
    where: { id: input.moduleId },
    include: { course: { select: { assignments: { select: { groupId: true } } } } },
  });
  if (!mod) throw new ApiError(404, "Module not found.");
  const groupIds = mod.course.assignments.map((a) => a.groupId);
  if (groupIds.length === 0) throw new ApiError(404, "Module not found.");
  const allowed = await assignedGroupIds(actor);
  if (allowed !== null && !groupIds.some((id) => allowed.includes(id))) throw new ApiError(404, "Module not found.");
  const last = await prisma.lesson.findFirst({ where: { moduleId: input.moduleId }, orderBy: { order: "desc" } });
  const lesson = await prisma.lesson.create({
    data: { moduleId: input.moduleId, title: input.title.trim(), order: (last?.order ?? 0) + 1, status: "DRAFT" },
  });
  await audit({ actorId: actor.id, action: "LESSON_UPDATED", entityType: "LESSON", entityId: lesson.id, metadata: { title: lesson.title, created: true } });
  return lesson;
}

export async function saveBlock(
  viewer: Viewer,
  lessonId: string,
  input: { id?: string; type: string; data: unknown; order?: number }
) {
  const lesson = await assertLessonStaffAccess(viewer, lessonId);
  if (lesson.status === "PUBLISHED") {
    const { snapshotLesson } = await import("@/lib/content/versions");
    await snapshotLesson(lessonId, viewer.id, "Published lesson edited");
  }
  const parsed = parseBlock(input.type, JSON.stringify(input.data ?? {}));
  if (parsed.kind !== "ok") throw new ApiError(422, parsed.error);
  if (input.id) {
    const existing = await prisma.contentBlock.findFirst({ where: { id: input.id, lessonId } });
    if (!existing) throw new ApiError(404, "Block not found.");
    const updated = await prisma.contentBlock.update({
      where: { id: existing.id },
      data: { type: input.type, data: JSON.stringify(parsed.data) },
    });
    await audit({ actorId: viewer.id, action: "LESSON_EDITED", entityType: "LESSON", entityId: lessonId, metadata: { blockId: existing.id } });
    return updated;
  }
  const last = await prisma.contentBlock.findFirst({ where: { lessonId }, orderBy: { order: "desc" }, select: { order: true } });
  const created = await prisma.contentBlock.create({
    data: {
      lessonId,
      type: input.type,
      data: JSON.stringify(parsed.data),
      order: input.order ?? (last?.order ?? 0) + 1,
    },
  });
  await audit({ actorId: viewer.id, action: "LESSON_EDITED", entityType: "LESSON", entityId: lesson.id, metadata: { blockId: created.id, created: true } });
  return created;
}

export async function deleteBlock(viewer: Viewer, blockId: string) {
  const block = await prisma.contentBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new ApiError(404, "Block not found.");
  await assertLessonStaffAccess(viewer, block.lessonId);
  await prisma.contentBlock.delete({ where: { id: blockId } });
  await audit({ actorId: viewer.id, action: "LESSON_EDITED", entityType: "LESSON", entityId: block.lessonId, metadata: { deletedBlockId: blockId } });
}

export async function moveBlock(viewer: Viewer, blockId: string, direction: -1 | 1) {
  const block = await prisma.contentBlock.findUnique({ where: { id: blockId } });
  if (!block) throw new ApiError(404, "Block not found.");
  await assertLessonStaffAccess(viewer, block.lessonId);
  const siblings = await prisma.contentBlock.findMany({ where: { lessonId: block.lessonId }, orderBy: { order: "asc" } });
  const index = siblings.findIndex((b) => b.id === blockId);
  const swap = siblings[index + direction];
  if (!swap) return;
  await prisma.$transaction([
    prisma.contentBlock.update({ where: { id: block.id }, data: { order: swap.order } }),
    prisma.contentBlock.update({ where: { id: swap.id }, data: { order: block.order } }),
  ]);
}

export async function setLessonStatus(viewer: Viewer, lessonId: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const lesson = await assertLessonStaffAccess(viewer, lessonId);
  if (status === "PUBLISHED") {
    const blocks = await prisma.contentBlock.findMany({ where: { lessonId } });
    const valid = blocks.filter((b) => parseBlock(b.type, b.data).kind === "ok");
    if (valid.length === 0) throw new ApiError(422, "Add at least one valid content block before publishing.");
    if (viewer.role !== "ADMIN") {
      const { contentSettings } = await import("@/lib/content/settings");
      const settings = await contentSettings();
      if (settings.requireReview) {
        const approved = await prisma.contentReview.findFirst({ where: { resourceType: "LESSON", resourceId: lessonId, status: "APPROVED" } });
        if (!approved) throw new ApiError(409, "Submit this lesson for review. A reviewer must approve it before it is published.");
      }
    }
  }
  const updated = await prisma.lesson.update({ where: { id: lessonId }, data: { status } });
  await audit({
    actorId: viewer.id,
    action: status === "PUBLISHED" ? "LESSON_PUBLISHED" : "LESSON_EDITED",
    entityType: "LESSON",
    entityId: lessonId,
    metadata: { status, previous: lesson.status },
  });
  if (status === "PUBLISHED" && lesson.status !== "PUBLISHED") {
    const groupIds = lesson.module.course.assignments.map((a) => a.groupId);
    const students = await prisma.user.findMany({
      where: { role: "STUDENT", status: "ACTIVE", groupId: { in: groupIds } },
      select: { id: true },
    });
    await notifyUsers(students.map((s) => s.id), {
      type: "LESSON",
      title: "New lesson",
      body: lesson.title,
      href: `/student/learn/${lesson.id}`,
    });
  }
  return updated;
}

export async function createPlan(
  viewer: Viewer,
  input: {
    groupId: string;
    lessonId?: string | null;
    courseId?: string | null;
    moduleId?: string | null;
    plannedDate: Date;
    plannedDurationMin: number;
    notes?: string | null;
  }
) {
  await assertGroupAccess(viewer, input.groupId);
  const plan = await prisma.teachingPlan.create({
    data: {
      groupId: input.groupId,
      teacherId: viewer.role === "ADMIN" ? await leadOrSelf(input.groupId, viewer.id) : viewer.id,
      lessonId: input.lessonId || null,
      courseId: input.courseId || null,
      moduleId: input.moduleId || null,
      plannedDate: input.plannedDate,
      plannedDurationMin: input.plannedDurationMin,
      notes: input.notes?.trim() || null,
      status: "PLANNED",
    },
  });
  await audit({ actorId: viewer.id, action: "PLAN_CREATED", entityType: "PLAN", entityId: plan.id, metadata: { groupId: input.groupId } });
  return plan;
}

export async function setPlanStatus(viewer: Viewer, planId: string, status: "PLANNED" | "COMPLETED" | "CANCELLED") {
  const plan = await prisma.teachingPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new ApiError(404, "Plan not found.");
  await assertGroupAccess(viewer, plan.groupId);
  return prisma.teachingPlan.update({ where: { id: planId }, data: { status } });
}

export async function createRecurrence(
  viewer: Viewer,
  input: {
    groupId: string;
    title: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    courseId?: string | null;
  }
) {
  await assertGroupAccess(viewer, input.groupId);
  if (input.dayOfWeek < 0 || input.dayOfWeek > 6) throw new ApiError(422, "Choose a day of the week.");
  if (!/^\d{2}:\d{2}$/.test(input.startTime) || !/^\d{2}:\d{2}$/.test(input.endTime)) {
    throw new ApiError(422, "Times must look like 08:00.");
  }
  if (input.endTime <= input.startTime) throw new ApiError(422, "The class must end after it starts.");
  return prisma.recurrenceRule.create({
    data: {
      groupId: input.groupId,
      teacherId: viewer.role === "ADMIN" ? await leadOrSelf(input.groupId, viewer.id) : viewer.id,
      title: input.title.trim() || "English class",
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      courseId: input.courseId || null,
      timezone: "UTC",
      effectiveFrom: new Date(),
      status: "ACTIVE",
    },
  });
}

/** Create missing sessions for the next `weeks` occurrences. Skips times that already exist. */
export async function generateSessions(viewer: Viewer, ruleId: string, weeks = 4) {
  const rule = await prisma.recurrenceRule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.status !== "ACTIVE") throw new ApiError(404, "Schedule rule not found.");
  await assertGroupAccess(viewer, rule.groupId);
  const created = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  for (let day = 0; day < weeks * 7 + 7 && created.length < weeks; day++) {
    const date = new Date(start.getTime() + day * 86_400_000);
    if (date.getUTCDay() !== rule.dayOfWeek) continue;
    if (rule.effectiveUntil && date > rule.effectiveUntil) break;
    const [sh, sm] = rule.startTime.split(":").map(Number);
    const [eh, em] = rule.endTime.split(":").map(Number);
    const scheduledStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), sh, sm));
    const scheduledEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), eh, em));
    if (scheduledStart.getTime() < Date.now() - 60_000) continue;
    const exists = await prisma.classSession.findFirst({
      where: { recurrenceId: rule.id, scheduledStart },
      select: { id: true },
    });
    if (exists) continue;
    created.push(
      await prisma.classSession.create({
        data: {
          groupId: rule.groupId,
          teacherId: rule.teacherId,
          courseId: rule.courseId,
          recurrenceId: rule.id,
          title: rule.title,
          scheduledStart,
          scheduledEnd,
          status: "SCHEDULED",
        },
      })
    );
  }
  return created;
}
