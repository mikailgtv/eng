/**
 * Teacher control-center reads. Every number comes from stored rows.
 * Teachers are limited to assigned groups; admins see all.
 */
import { prisma } from "@/lib/prisma";
import { assignedGroupIds, groupWhere, type Viewer } from "./access";

const DAY = 86_400_000;
const ATTENTION_LOGIN_DAYS = 14;

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function groupsForViewer(viewer: Viewer) {
  const ids = await assignedGroupIds(viewer);
  return prisma.learningGroup.findMany({
    where: { ...groupWhere(ids), status: "ACTIVE" },
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { members: true } },
      assignments: {
        include: { course: { select: { id: true, title: true, level: { select: { code: true, displayName: true, name: true } } } } },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function groupSnapshot(groupId: string) {
  const group = await prisma.learningGroup.findUnique({
    where: { id: groupId },
    include: {
      assignments: {
        include: {
          course: {
            include: {
              level: true,
              modules: {
                where: { status: "PUBLISHED" },
                orderBy: { order: "asc" },
                include: { lessons: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" }, select: { id: true, title: true, order: true, durationMin: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!group) return null;
  const course = group.assignments.map((a) => a.course).find((c) => c.status === "PUBLISHED") ?? group.assignments[0]?.course ?? null;
  const lessons = course?.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title, moduleId: m.id }))) ?? [];
  const members = await prisma.user.findMany({
    where: { groupId, role: "STUDENT", status: "ACTIVE" },
    select: { id: true },
  });
  const lessonIds = lessons.map((l) => l.id);
  const completed = lessonIds.length
    ? await prisma.lessonProgress.groupBy({
        by: ["lessonId"],
        where: { lessonId: { in: lessonIds }, studentId: { in: members.map((m) => m.id) }, status: "COMPLETED" },
        _count: true,
      })
    : [];
  const doneByLesson = new Map(completed.map((c) => [c.lessonId, c._count]));
  // Current lesson: the earliest published lesson not completed by most of the group.
  const current = lessons.find((l) => (doneByLesson.get(l.id) ?? 0) < Math.max(1, members.length)) ?? lessons[lessons.length - 1] ?? null;
  const progressRows = lessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: { lessonId: { in: lessonIds }, studentId: { in: members.map((m) => m.id) }, status: "COMPLETED" },
        select: { studentId: true },
      })
    : [];
  const perStudent = new Map<string, number>();
  for (const row of progressRows) perStudent.set(row.studentId, (perStudent.get(row.studentId) ?? 0) + 1);
  const percents = members.map((m) => (lessonIds.length ? Math.round(((perStudent.get(m.id) ?? 0) / lessonIds.length) * 100) : 0));
  const progress = percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null;

  const nextSession = await prisma.classSession.findFirst({
    where: { groupId, status: { in: ["SCHEDULED", "IN_PROGRESS"] }, scheduledEnd: { gte: new Date() } },
    orderBy: { scheduledStart: "asc" },
  });

  return { group, course, lessons, current, progress, students: members.length, nextSession };
}

export async function teacherHome(viewer: Viewer) {
  const ids = await assignedGroupIds(viewer);
  const groupFilter = ids === null ? {} : { groupId: { in: ids } };
  const sessionFilter = ids === null ? {} : { groupId: { in: ids } };
  const today = startOfUtcDay();
  const tomorrow = new Date(today.getTime() + DAY);
  const week = new Date(today.getTime() + 7 * DAY);

  const [groups, todaySessions, upcoming, active, students, activeStudents, plans, assignments, exams] = await Promise.all([
    groupsForViewer(viewer),
    prisma.classSession.findMany({
      where: { ...sessionFilter, status: { not: "CANCELLED" }, scheduledStart: { gte: today, lt: tomorrow } },
      include: { group: { select: { name: true } }, lesson: { select: { title: true } } },
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.classSession.findMany({
      where: { ...sessionFilter, status: "SCHEDULED", scheduledStart: { gte: tomorrow, lt: week } },
      include: { group: { select: { name: true } } },
      orderBy: { scheduledStart: "asc" },
      take: 5,
    }),
    prisma.classSession.findFirst({
      where: { ...sessionFilter, status: "IN_PROGRESS" },
      include: { group: { select: { name: true } }, lesson: { select: { title: true } } },
    }),
    prisma.user.count({ where: { role: "STUDENT", ...groupFilter } }),
    prisma.user.count({ where: { role: "STUDENT", status: "ACTIVE", ...groupFilter } }),
    prisma.teachingPlan.findMany({
      where: { ...(ids === null ? {} : { groupId: { in: ids } }), status: "PLANNED" },
      include: { group: { select: { name: true } }, lesson: { select: { title: true } } },
      orderBy: { plannedDate: "asc" },
      take: 5,
    }),
    prisma.assignment.findMany({
      where: { ...(ids === null ? {} : { groupId: { in: ids } }), status: { in: ["DRAFT", "PUBLISHED"] } },
      include: { group: { select: { name: true } }, _count: { select: { submissions: true } } },
      orderBy: { dueAt: "asc" },
      take: 6,
    }),
    prisma.assessment.findMany({
      where: {
        status: { in: ["OPEN", "SCHEDULED"] },
        ...(ids === null ? {} : { course: { assignments: { some: { groupId: { in: ids } } } } }),
      },
      select: { id: true, title: true, type: true, status: true, startAt: true, durationMinutes: true },
      orderBy: { startAt: "asc" },
      take: 5,
    }),
  ]);

  const recentAttendance = await prisma.attendanceRecord.findMany({
    where: { session: sessionFilter },
    include: { student: { select: { firstName: true, lastName: true } }, session: { select: { title: true, group: { select: { name: true } } } } },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  const recentResults = await prisma.assessmentAttempt.findMany({
    where: {
      status: { in: ["GRADED", "EXPIRED"] },
      student: { role: "STUDENT", ...groupFilter },
    },
    include: { student: { select: { firstName: true, lastName: true } }, assessment: { select: { title: true, type: true } } },
    orderBy: { submittedAt: "desc" },
    take: 5,
  });
  const recentSubmissions = await prisma.assignmentSubmission.findMany({
    where: { assignment: ids === null ? {} : { groupId: { in: ids } }, status: { not: "IN_PROGRESS" } },
    include: { student: { select: { firstName: true, lastName: true } }, assignment: { select: { title: true } } },
    orderBy: { submittedAt: "desc" },
    take: 5,
  });

  const attention = await studentsNeedingAttention(viewer);

  return {
    groups,
    todaySessions,
    upcoming,
    active,
    students,
    activeStudents,
    needingAttention: attention.length,
    attention: attention.slice(0, 6),
    plans,
    assignments,
    exams,
    recentAttendance,
    recentResults,
    recentSubmissions,
  };
}

export type AttentionItem = { studentId: string; name: string; groupName: string; reason: string };

export async function studentsNeedingAttention(viewer: Viewer): Promise<AttentionItem[]> {
  const ids = await assignedGroupIds(viewer);
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", status: "ACTIVE", ...(ids === null ? {} : { groupId: { in: ids } }) },
    select: { id: true, firstName: true, lastName: true, lastLoginAt: true, group: { select: { id: true, name: true } } },
  });
  if (students.length === 0) return [];
  const studentIds = students.map((s) => s.id);
  const cutoff = new Date(Date.now() - ATTENTION_LOGIN_DAYS * DAY);

  const [overdue, failed, lowPractice, absences] = await Promise.all([
    prisma.assignment.findMany({
      where: {
        status: "PUBLISHED",
        dueAt: { lt: new Date() },
        ...(ids === null ? {} : { groupId: { in: ids } }),
      },
      select: { id: true, title: true, groupId: true, submissions: { select: { studentId: true, status: true } } },
    }),
    prisma.assessmentAttempt.findMany({
      where: { studentId: { in: studentIds }, status: { in: ["GRADED", "EXPIRED"] }, passed: false },
      orderBy: { submittedAt: "desc" },
      select: { studentId: true, assessment: { select: { title: true } } },
    }),
    prisma.activityAttempt.groupBy({
      by: ["studentId"],
      where: { studentId: { in: studentIds }, isCorrect: { not: null } },
      _count: true,
    }),
    prisma.attendanceRecord.findMany({
      where: { studentId: { in: studentIds }, status: "ABSENT" },
      orderBy: { updatedAt: "desc" },
      select: { studentId: true, session: { select: { title: true, scheduledStart: true } } },
      take: 40,
    }),
  ]);

  const correctCounts = await prisma.activityAttempt.groupBy({
    by: ["studentId"],
    where: { studentId: { in: studentIds }, isCorrect: true },
    _count: true,
  });
  const scored = new Map(lowPractice.map((r) => [r.studentId, r._count]));
  const correct = new Map(correctCounts.map((r) => [r.studentId, r._count]));

  const items: AttentionItem[] = [];
  const seen = new Set<string>();
  function add(studentId: string, reason: string) {
    const key = studentId + reason;
    if (seen.has(key)) return;
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    seen.add(key);
    items.push({ studentId, name: `${student.firstName} ${student.lastName}`, groupName: student.group?.name ?? "—", reason });
  }

  for (const student of students) {
    if (!student.lastLoginAt || student.lastLoginAt < cutoff) {
      add(student.id, student.lastLoginAt ? `No sign-in for ${ATTENTION_LOGIN_DAYS} days` : "Has never signed in");
    }
  }
  for (const assignment of overdue) {
    const submitted = new Set(assignment.submissions.filter((s) => s.status !== "IN_PROGRESS").map((s) => s.studentId));
    for (const student of students.filter((s) => s.group?.id === assignment.groupId)) {
      if (!submitted.has(student.id)) add(student.id, `Overdue assignment: ${assignment.title}`);
    }
  }
  const failedSeen = new Set<string>();
  for (const attempt of failed) {
    if (failedSeen.has(attempt.studentId)) continue;
    failedSeen.add(attempt.studentId);
    add(attempt.studentId, `Not passed: ${attempt.assessment.title}`);
  }
  for (const student of students) {
    const total = scored.get(student.id) ?? 0;
    if (total < 4) continue;
    const percent = Math.round(((correct.get(student.id) ?? 0) / total) * 100);
    if (percent < 60) add(student.id, `Practice accuracy ${percent}% (${total} answers)`);
  }
  const absentSeen = new Set<string>();
  for (const row of absences) {
    if (absentSeen.has(row.studentId)) continue;
    absentSeen.add(row.studentId);
    add(row.studentId, `Marked absent: ${row.session.title}`);
  }
  return items;
}

export async function attendanceSummary(studentIds: string[]) {
  if (studentIds.length === 0) return new Map<string, { present: number; absent: number; late: number; excused: number; percent: number | null }>();
  const rows = await prisma.attendanceRecord.groupBy({
    by: ["studentId", "status"],
    where: { studentId: { in: studentIds } },
    _count: true,
  });
  const map = new Map<string, { present: number; absent: number; late: number; excused: number; percent: number | null }>();
  for (const id of studentIds) map.set(id, { present: 0, absent: 0, late: 0, excused: 0, percent: null });
  for (const row of rows) {
    const item = map.get(row.studentId);
    if (!item) continue;
    if (row.status === "PRESENT") item.present += row._count;
    else if (row.status === "ABSENT") item.absent += row._count;
    else if (row.status === "LATE") item.late += row._count;
    else if (row.status === "EXCUSED") item.excused += row._count;
  }
  for (const item of map.values()) {
    const denom = item.present + item.absent + item.late;
    item.percent = denom === 0 ? null : Math.round(((item.present + item.late) / denom) * 1000) / 10;
  }
  return map;
}

export async function latestScores(studentIds: string[]) {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { studentId: { in: studentIds }, status: { in: ["GRADED", "EXPIRED"] } },
    orderBy: { submittedAt: "desc" },
    select: { studentId: true, percentage: true, passed: true, assessment: { select: { type: true, title: true } } },
  });
  const map = new Map<string, { quiz: string | null; exam: string | null }>();
  for (const id of studentIds) map.set(id, { quiz: null, exam: null });
  for (const attempt of attempts) {
    const slot = map.get(attempt.studentId);
    if (!slot) continue;
    const label = attempt.percentage === null ? "—" : `${attempt.percentage}%`;
    if (attempt.assessment.type === "QUIZ" && !slot.quiz) slot.quiz = label;
    if (attempt.assessment.type === "EXAM" && !slot.exam) slot.exam = label;
  }
  return map;
}

export function scheduleRange(view: string, anchor = new Date()) {
  const start = startOfUtcDay(anchor);
  if (view === "month") {
    const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
    return { from: monthStart, to: monthEnd };
  }
  if (view === "week") {
    const day = start.getUTCDay();
    const from = new Date(start.getTime() - day * DAY);
    return { from, to: new Date(from.getTime() + 7 * DAY) };
  }
  return { from: start, to: new Date(start.getTime() + DAY) };
}

export async function scheduleForViewer(viewer: Viewer, view: string, anchor = new Date()) {
  const ids = await assignedGroupIds(viewer);
  const { from, to } = scheduleRange(view, anchor);
  const groupFilter = ids === null ? {} : { groupId: { in: ids } };
  const [sessions, assignments, exams] = await Promise.all([
    prisma.classSession.findMany({
      where: { ...groupFilter, scheduledStart: { gte: from, lt: to }, status: { not: "CANCELLED" } },
      include: { group: { select: { name: true } }, lesson: { select: { title: true } } },
      orderBy: { scheduledStart: "asc" },
    }),
    prisma.assignment.findMany({
      where: { ...(ids === null ? {} : { groupId: { in: ids } }), status: "PUBLISHED", dueAt: { gte: from, lt: to } },
      include: { group: { select: { name: true } } },
    }),
    prisma.assessment.findMany({
      where: {
        status: { in: ["OPEN", "SCHEDULED"] },
        startAt: { gte: from, lt: to },
        ...(ids === null ? {} : { course: { assignments: { some: { groupId: { in: ids } } } } }),
      },
      select: { id: true, title: true, type: true, startAt: true, endAt: true },
    }),
  ]);
  return { from, to, sessions, assignments, exams };
}
