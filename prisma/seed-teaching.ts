import type { PrismaClient } from "@prisma/client";

/** Idempotent Phase 5 demo rows. Times are explicit UTC, not assumed working days. */
export async function seedTeaching(prisma: PrismaClient) {
  const teacher = await prisma.user.findUnique({ where: { username: "sara.whitfield" } });
  if (!teacher) return { sessions: 0, assignments: 0 };
  const groups = await prisma.learningGroup.findMany({ where: { teacherId: teacher.id } });
  for (const group of groups) {
    await prisma.teacherGroupAssignment.upsert({
      where: { teacherId_groupId: { teacherId: teacher.id, groupId: group.id } },
      create: { teacherId: teacher.id, groupId: group.id },
      update: {},
    });
  }
  const shiftA = groups.find((g) => g.name === "Firefighter Shift A");
  if (!shiftA) return { sessions: 0, assignments: 0 };
  const course = await prisma.courseAssignment.findFirst({
    where: { groupId: shiftA.id },
    include: { course: { include: { modules: { include: { lessons: { where: { status: "PUBLISHED" }, take: 1 } } } } } },
  });
  const lesson = course?.course.modules.flatMap((m) => m.lessons)[0] ?? null;

  const rule = await prisma.recurrenceRule.upsert({
    where: { id: "seed-shift-a-tuesday" },
    update: {},
    create: {
      id: "seed-shift-a-tuesday",
      groupId: shiftA.id,
      teacherId: teacher.id,
      courseId: course?.courseId ?? null,
      title: "Shift A English class",
      dayOfWeek: 2,
      startTime: "09:00",
      endTime: "10:00",
      timezone: "UTC",
      effectiveFrom: new Date(),
    },
  });

  const start = nextWeekday(2, 9);
  const existing = await prisma.classSession.findFirst({ where: { recurrenceId: rule.id, scheduledStart: start } });
  if (!existing) {
    await prisma.classSession.create({
      data: {
        groupId: shiftA.id,
        teacherId: teacher.id,
        courseId: course?.courseId ?? null,
        lessonId: lesson?.id ?? null,
        title: "Shift A English class",
        scheduledStart: start,
        scheduledEnd: new Date(start.getTime() + 60 * 60 * 1000),
        recurrenceId: rule.id,
        status: "SCHEDULED",
      },
    });
  }

  const due = new Date(start.getTime() + 2 * 86_400_000);
  const assignment = await prisma.assignment.upsert({
    where: { id: "seed-shift-a-writing" },
    update: {},
    create: {
      id: "seed-shift-a-writing",
      title: "Write three radio phrases",
      description: "Practice writing the phrases from class.",
      instructions: "Write three short English phrases you would use on the radio. Text only.",
      type: "WRITTEN",
      groupId: shiftA.id,
      courseId: course?.courseId ?? null,
      lessonId: lesson?.id ?? null,
      dueAt: due,
      status: "PUBLISHED",
      teacherId: teacher.id,
    },
  });

  await prisma.teachingPlan.upsert({
    where: { id: "seed-shift-a-plan" },
    update: {},
    create: {
      id: "seed-shift-a-plan",
      groupId: shiftA.id,
      courseId: course?.courseId ?? null,
      lessonId: lesson?.id ?? null,
      plannedDate: start,
      plannedDurationMin: 60,
      status: "PLANNED",
      notes: "Cover the published lesson, then the writing assignment.",
      teacherId: teacher.id,
    },
  });

  const student = await prisma.user.findFirst({ where: { groupId: shiftA.id, role: "STUDENT", status: "ACTIVE" } });
  if (student) {
    const already = await prisma.notification.findFirst({ where: { userId: student.id, type: "ASSIGNMENT", title: "New assignment" } });
    if (!already) {
      await prisma.notification.create({
        data: { userId: student.id, type: "ASSIGNMENT", title: "New assignment", body: assignment.title, href: `/student/assignments/${assignment.id}` },
      });
    }
  }
  return { sessions: 1, assignments: 1 };
}

function nextWeekday(day: number, hour: number) {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, 0, 0));
  const delta = (day - start.getUTCDay() + 7) % 7 || 7;
  start.setUTCDate(start.getUTCDate() + delta);
  return start;
}
