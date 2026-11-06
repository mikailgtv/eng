/**
 * Due reminders. Each notice has a dedupe key so the same reminder is not sent every hour.
 * Class reminders go only to the group on that class.
 */
import { prisma } from "@/lib/prisma";
import { notifyUsers } from "@/lib/teaching/notify";
import { communicationSettings } from "@/lib/communication/settings";
import { formatInZone, zoneName } from "@/lib/communication/rules";
import { countDueVocabulary } from "@/lib/practice";
import { dispatchDueAnnouncements } from "@/lib/communication/announcements";
import { retryFailedEmail } from "@/lib/communication/hub";

const globalState = globalThis as unknown as { __ebReminderAt?: number };
let running = false;

export async function runDueReminders(force = false) {
  const now = Date.now();
  if (!force && (running || (globalState.__ebReminderAt && now - globalState.__ebReminderAt < 60_000))) return { skipped: true };
  running = true;
  globalState.__ebReminderAt = now;
  try {
    await ensureRules();
    await dispatchDueAnnouncements();
    await classReminders();
    await assignmentReminders();
    await examReminders();
    await certificateReminders();
    await adaptiveReminders();
    await retainOldNotices();
    await retryFailedEmail();
    return { skipped: false };
  } finally {
    running = false;
  }
}

async function ensureRules() {
  const count = await prisma.notificationRule.count();
  if (count > 0) return;
  const { DEFAULT_RULES } = await import("@/lib/communication/rules");
  await prisma.notificationRule.createMany({
    data: DEFAULT_RULES.map((rule) => ({
      eventKey: rule.eventKey,
      category: rule.category,
      priority: rule.priority,
      enabled: rule.enabled,
      cooldownMinutes: rule.cooldownMinutes,
    })),
  });
}

async function ruleEnabled(eventKey: string) {
  const rule = await prisma.notificationRule.findUnique({ where: { eventKey } });
  return rule?.enabled ?? true;
}

async function once(dedupeKey: string, kind: string, userId: string, relatedId: string) {
  try {
    await prisma.scheduledNotice.create({ data: { dedupeKey, kind, userId, relatedId } });
    return true;
  } catch {
    return false;
  }
}

async function classReminders() {
  if (!(await ruleEnabled("class.soon"))) return;
  const settings = await communicationSettings();
  const until = new Date(Date.now() + settings.reminderClassMinutes * 60 * 1000);
  const sessions = await prisma.classSession.findMany({
    where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] }, scheduledStart: { gte: new Date(), lte: until } },
    include: { group: { select: { id: true, name: true } } },
    take: 30,
  });
  for (const session of sessions) {
    const students = await prisma.user.findMany({ where: { groupId: session.groupId, role: "STUDENT", status: "ACTIVE" }, select: { id: true } });
    for (const student of students) {
      const key = `class-soon:${session.id}:${student.id}`;
      if (!(await once(key, "class.soon", student.id, session.id))) continue;
      await notifyUsers([student.id], {
        type: "CLASS_REMINDER",
        category: "SCHEDULE",
        title: "Class starting soon",
        body: `${session.title} for ${session.group.name} starts at ${formatInZone(session.scheduledStart, zoneName())}.`,
        href: "/student/schedule",
        source: "SCHEDULE",
        relatedType: "CLASS",
        relatedId: session.id,
        actionLabel: "Open schedule",
        groupKey: key,
      });
    }
  }
}

async function assignmentReminders() {
  const settings = await communicationSettings();
  const assignments = await prisma.assignment.findMany({
    where: { status: "PUBLISHED", dueAt: { gte: new Date(Date.now() - 2 * 86400000), lte: new Date(Date.now() + 4 * 86400000) } },
    take: 40,
  });
  for (const assignment of assignments) {
    const students = await prisma.user.findMany({ where: { groupId: assignment.groupId, role: "STUDENT", status: "ACTIVE" }, select: { id: true } });
    const hours = (assignment.dueAt.getTime() - Date.now()) / 3600000;
    for (const student of students) {
      const submission = await prisma.assignmentSubmission.findUnique({ where: { assignmentId_studentId: { assignmentId: assignment.id, studentId: student.id } } });
      if (submission && ["SUBMITTED", "LATE", "GRADED"].includes(submission.status)) continue;
      if (hours < 0 && (await ruleEnabled("assignment.overdue"))) {
        const key = `assignment-overdue:${assignment.id}:${student.id}`;
        if (await once(key, "assignment.overdue", student.id, assignment.id)) {
          await notifyUsers([student.id], {
            type: "ASSIGNMENT",
            title: "Assignment overdue",
            body: `${assignment.title} is past the due time ${formatInZone(assignment.dueAt, zoneName())}.`,
            href: `/student/assignments/${assignment.id}`,
            actionLabel: "Open assignment",
            groupKey: key,
            relatedId: assignment.id,
          });
        }
      }
      for (const days of settings.assignmentRemindDays) {
        if (!(await ruleEnabled("assignment.due_soon"))) continue;
        if (hours <= days * 24 && hours > (days - 1) * 24) {
          const key = `assignment-due:${assignment.id}:${student.id}:${days}`;
          if (!(await once(key, "assignment.due_soon", student.id, assignment.id))) continue;
          await notifyUsers([student.id], {
            type: "ASSIGNMENT",
            title: days === 1 ? "Assignment due tomorrow" : `Assignment due in ${days} days`,
            body: `${assignment.title} is due ${formatInZone(assignment.dueAt, zoneName())}.`,
            href: `/student/assignments/${assignment.id}`,
            actionLabel: "Open assignment",
            groupKey: key,
            relatedId: assignment.id,
          });
        }
      }
    }
  }
}

async function examReminders() {
  const settings = await communicationSettings();
  const exams = await prisma.assessment.findMany({
    where: { type: "EXAM", status: { in: ["SCHEDULED", "OPEN", "CLOSED"] } },
    take: 30,
  });
  for (const exam of exams) {
    if (!exam.courseId) continue;
    const groups = await prisma.courseAssignment.findMany({ where: { courseId: exam.courseId }, select: { groupId: true } });
    const students = await prisma.user.findMany({ where: { role: "STUDENT", status: "ACTIVE", groupId: { in: groups.map((group) => group.groupId) } }, select: { id: true } });
    for (const student of students) {
      const attempt = await prisma.assessmentAttempt.findFirst({ where: { assessmentId: exam.id, studentId: student.id, status: { in: ["SUBMITTED", "GRADED"] } } });
      if (exam.startAt && exam.status === "SCHEDULED" && (await ruleEnabled("exam.scheduled"))) {
        const hours = (exam.startAt.getTime() - Date.now()) / 3600000;
        if (hours > 0 && hours <= settings.examRemindHours) {
          const key = `exam-scheduled:${exam.id}:${student.id}`;
          if (await once(key, "exam.scheduled", student.id, exam.id)) {
            await notifyUsers([student.id], {
              type: "EXAM",
              title: "Exam scheduled",
              body: `${exam.title} starts ${formatInZone(exam.startAt, zoneName())}.`,
              href: "/student/exams",
              actionLabel: "Open exams",
              critical: true,
              groupKey: key,
              relatedId: exam.id,
            });
          }
        }
      }
      if (exam.status === "OPEN" && exam.startAt && exam.startAt.getTime() - Date.now() < 30 * 60 * 1000 && exam.startAt > new Date() && (await ruleEnabled("exam.starting"))) {
        const key = `exam-starting:${exam.id}:${student.id}`;
        if (await once(key, "exam.starting", student.id, exam.id)) {
          await notifyUsers([student.id], {
            type: "EXAM",
            title: "Exam starting soon",
            body: `${exam.title} starts ${formatInZone(exam.startAt, zoneName())}.`,
            href: "/student/exams",
            actionLabel: "Open exams",
            priority: "HIGH",
            critical: true,
            groupKey: key,
          });
        }
      }
      if (!attempt && exam.endAt && exam.endAt < new Date() && (await ruleEnabled("exam.missed"))) {
        const key = `exam-missed:${exam.id}:${student.id}`;
        if (await once(key, "exam.missed", student.id, exam.id)) {
          await notifyUsers([student.id], {
            type: "EXAM",
            title: "Exam period ended",
            body: `${exam.title} has ended and no submission is stored. A reason is not inferred.`,
            href: "/student/exams",
            actionLabel: "Open exams",
            groupKey: key,
          });
        }
      }
      if (attempt?.status === "GRADED" && exam.showResults && (await ruleEnabled("exam.result"))) {
        const key = `exam-result:${exam.id}:${student.id}`;
        if (await once(key, "exam.result", student.id, exam.id)) {
          await notifyUsers([student.id], {
            type: "EXAM",
            title: "Exam result available",
            body: `${exam.title} has a stored result.`,
            href: "/student/exams",
            actionLabel: "Open result",
            critical: true,
            groupKey: key,
          });
        }
      }
    }
  }
}

async function certificateReminders() {
  if (!(await ruleEnabled("certificate.expiring"))) return;
  const soon = new Date(Date.now() + 30 * 86400000);
  const certificates = await prisma.certificate.findMany({
    where: { status: "ISSUED", expiresAt: { gte: new Date(), lte: soon } },
    take: 30,
  });
  for (const certificate of certificates) {
    const key = `cert-expiring:${certificate.publicId}`;
    if (!(await once(key, "certificate.expiring", certificate.studentId, certificate.id))) continue;
    await notifyUsers([certificate.studentId], {
      type: "CERT_EXPIRING",
      category: "CERTIFICATE",
      title: "Certificate expiration date is near",
      body: `${certificate.publicId} expires ${certificate.expiresAt ? formatInZone(certificate.expiresAt, zoneName()) : "on the stored date"}.`,
      href: "/student/certificates",
      actionLabel: "Open certificates",
      critical: true,
      groupKey: key,
      relatedId: certificate.publicId,
    });
  }
}

async function adaptiveReminders() {
  if (!(await ruleEnabled("adaptive.review"))) return;
  const settings = await communicationSettings();
  const students = await prisma.user.findMany({ where: { role: "STUDENT", status: "ACTIVE" }, select: { id: true }, take: 50 });
  const day = new Date().toISOString().slice(0, 10);
  for (const student of students) {
    const due = await countDueVocabulary(student.id);
    if (due < settings.adaptiveReviewThreshold) continue;
    const key = `vocab-due:${student.id}:${day}`;
    if (!(await once(key, "adaptive.review", student.id, day))) continue;
    await notifyUsers([student.id], {
      type: "LESSON",
      category: "ADAPTIVE_LEARNING",
      title: `You have ${due} vocabulary items ready for review`,
      body: "These are due reviews, grouped into one notice.",
      href: "/student/review",
      actionLabel: "Open review",
      priority: "LOW",
      groupKey: key,
    });
  }
}

async function retainOldNotices() {
  const settings = await communicationSettings();
  const cutoff = new Date(Date.now() - settings.retentionDaysNotifications * 86400000);
  await prisma.notification.updateMany({
    where: { critical: false, archivedAt: null, createdAt: { lt: cutoff }, category: { notIn: ["CERTIFICATE", "EXAM", "ADMIN"] } },
    data: { archivedAt: new Date() },
  });
}
