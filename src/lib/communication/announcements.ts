import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { fullName } from "@/lib/utils";
import { assertGroupAccess, assignedGroupIds } from "@/lib/teaching/access";
import type { SessionUser } from "@/types";
import { sanitizeMessage, safeLink } from "@/lib/communication/sanitize";
import { ANNOUNCEMENT_TYPES, formatInZone, zoneName } from "@/lib/communication/rules";
import { notifyUsers } from "@/lib/teaching/notify";

export async function createAnnouncement(actor: SessionUser, input: {
  title: string;
  body: string;
  announcementType: string;
  priority?: string;
  publishAt: string;
  expireAt?: string | null;
  href?: string | null;
  linkLabel?: string | null;
  courseId?: string | null;
  assignmentId?: string | null;
  acknowledgementRequired?: boolean;
  targets: { targetType: string; targetId?: string | null }[];
}) {
  if (!ANNOUNCEMENT_TYPES.includes(input.announcementType as (typeof ANNOUNCEMENT_TYPES)[number])) {
    throw new ApiError(400, "Choose an announcement type.");
  }
  const title = sanitizeMessage(input.title);
  const body = sanitizeMessage(input.body);
  if (title.length < 3 || body.length < 3) throw new ApiError(400, "Enter a title and a message.");
  const priority = input.priority ?? (input.announcementType === "SYSTEM_MAINTENANCE" ? "URGENT" : "NORMAL");
  if (priority === "URGENT" && actor.role !== "ADMIN") throw new ApiError(403, "Only an administrator can mark a notice urgent.");
  if (actor.role === "TEACHER" && input.targets.some((target) => target.targetType === "ALL" || target.targetType === "ROLE")) {
    throw new ApiError(403, "Teachers can announce only to assigned groups.");
  }
  for (const target of input.targets) {
    if ((target.targetType === "GROUP" || target.targetType === "SHIFT") && target.targetId) await assertGroupAccess(actor, target.targetId);
  }
  if (input.targets.length === 0) throw new ApiError(400, "Choose who should receive this announcement.");
  const publishAt = new Date(input.publishAt);
  const expireAt = input.expireAt ? new Date(input.expireAt) : null;
  if (Number.isNaN(publishAt.getTime())) throw new ApiError(400, "Enter a valid publish time.");
  if (expireAt && expireAt <= publishAt) throw new ApiError(400, "The end time must be after the publish time.");
  const acknowledgementRequired = Boolean(input.acknowledgementRequired) || input.announcementType === "SCHEDULE_CHANGE" || input.announcementType === "SYSTEM_MAINTENANCE";
  const announcement = await prisma.announcement.create({
    data: {
      title,
      body,
      announcementType: input.announcementType,
      priority,
      createdById: actor.id,
      publishAt,
      expireAt,
      courseId: input.courseId || null,
      assignmentId: input.assignmentId || null,
      href: safeLink(input.href),
      linkLabel: input.linkLabel ? sanitizeMessage(input.linkLabel) : null,
      acknowledgementRequired,
      targets: { create: input.targets.map((target) => ({ targetType: target.targetType, targetId: target.targetId || null })) },
    },
  });
  await audit({
    actorId: actor.id,
    action: "ANNOUNCEMENT_CREATED",
    entityType: "COMMUNICATION",
    entityId: announcement.id,
    metadata: { title, publishAt: publishAt.toISOString(), expireAt: expireAt?.toISOString() ?? null, targets: input.targets.length },
  });
  if (publishAt <= new Date()) await dispatchAnnouncement(announcement.id);
  return { id: announcement.id, publishAt: formatInZone(publishAt, zoneName()) };
}

export async function dispatchDueAnnouncements() {
  const due = await prisma.announcement.findMany({
    where: { archivedAt: null, publishAt: { lte: new Date() } },
    select: { id: true },
    take: 20,
  });
  for (const item of due) await dispatchAnnouncement(item.id);
}

async function dispatchAnnouncement(announcementId: string) {
  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId }, include: { targets: true } });
  if (!announcement || announcement.archivedAt || announcement.publishAt > new Date()) return;
  if (announcement.expireAt && announcement.expireAt <= new Date()) return;
  const userIds = await resolveTargets(announcement.targets, announcement.courseId);
  const pending: string[] = [];
  for (const userId of userIds) {
    try {
      await prisma.scheduledNotice.create({ data: { dedupeKey: `announcement:${announcement.id}:${userId}`, kind: "announcement", userId, relatedId: announcement.id } });
      pending.push(userId);
    } catch {
      // Already delivered. Do not send the same announcement again.
    }
  }
  if (pending.length === 0) return;
  const href = announcement.href || "/student/announcements";
  await notifyUsers(pending, {
    type: "ADMIN",
    category: announcement.announcementType === "EXAM_NOTICE" ? "EXAM" : "ADMIN",
    title: announcement.title,
    body: announcement.body,
    href,
    priority: announcement.priority,
    source: "ANNOUNCEMENT",
    relatedType: "ANNOUNCEMENT",
    relatedId: announcement.id,
    actionLabel: announcement.acknowledgementRequired ? "Review and acknowledge" : "Open announcement",
    groupKey: `announcement:${announcement.id}`,
    critical: announcement.acknowledgementRequired || announcement.priority === "URGENT",
    acknowledgementRequired: announcement.acknowledgementRequired,
    expiresAt: announcement.expireAt,
  });
}

async function resolveTargets(targets: { targetType: string; targetId: string | null }[], courseId: string | null) {
  const ids = new Set<string>();
  for (const target of targets) {
    if (target.targetType === "ALL") {
      const users = await prisma.user.findMany({ where: { status: "ACTIVE", role: { in: ["STUDENT", "TEACHER"] } }, select: { id: true } });
      users.forEach((user) => ids.add(user.id));
    } else if (target.targetType === "ROLE" && target.targetId) {
      const users = await prisma.user.findMany({ where: { status: "ACTIVE", role: target.targetId }, select: { id: true } });
      users.forEach((user) => ids.add(user.id));
    } else if ((target.targetType === "GROUP" || target.targetType === "SHIFT") && target.targetId) {
      const users = await prisma.user.findMany({ where: { status: "ACTIVE", groupId: target.targetId, role: "STUDENT" }, select: { id: true } });
      users.forEach((user) => ids.add(user.id));
    } else if (target.targetType === "USER" && target.targetId) {
      ids.add(target.targetId);
    } else if (target.targetType === "COURSE" && (target.targetId || courseId)) {
      const course = target.targetId || courseId;
      const assignments = await prisma.courseAssignment.findMany({ where: { courseId: course! }, select: { groupId: true } });
      const users = await prisma.user.findMany({ where: { status: "ACTIVE", role: "STUDENT", groupId: { in: assignments.map((item) => item.groupId) } }, select: { id: true } });
      users.forEach((user) => ids.add(user.id));
    }
  }
  return [...ids];
}

export async function visibleAnnouncements(viewer: SessionUser) {
  const now = new Date();
  const rows = await prisma.announcement.findMany({
    where: { archivedAt: null, publishAt: { lte: now }, OR: [{ expireAt: null }, { expireAt: { gt: now } }] },
    include: { targets: true, acknowledgements: { where: { userId: viewer.id } }, createdBy: { select: { firstName: true, lastName: true } } },
    orderBy: { publishAt: "desc" },
    take: 30,
  });
  const visible = [];
  for (const row of rows) {
    if (await targeted(viewer, row.targets, row.courseId)) visible.push(row);
  }
  return visible.map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    type: row.announcementType.replaceAll("_", " "),
    priority: row.priority,
    publishAt: formatInZone(row.publishAt, zoneName()),
    expireAt: row.expireAt ? formatInZone(row.expireAt, zoneName()) : null,
    href: row.href,
    linkLabel: row.linkLabel,
    acknowledgementRequired: row.acknowledgementRequired,
    acknowledged: row.acknowledgements.length > 0,
    author: fullName(row.createdBy),
  }));
}

async function targeted(viewer: SessionUser, targets: { targetType: string; targetId: string | null }[], courseId: string | null) {
  if (viewer.role === "ADMIN") return true;
  for (const target of targets) {
    if (target.targetType === "ALL") return true;
    if (target.targetType === "ROLE" && target.targetId === viewer.role) return true;
    if (target.targetType === "USER" && target.targetId === viewer.id) return true;
    if ((target.targetType === "GROUP" || target.targetType === "SHIFT") && viewer.groupId && target.targetId === viewer.groupId) return true;
    if ((target.targetType === "GROUP" || target.targetType === "SHIFT") && viewer.role === "TEACHER" && target.targetId) {
      const ids = await assignedGroupIds(viewer);
      if (ids === null || ids.includes(target.targetId)) return true;
    }
    if (target.targetType === "COURSE" && viewer.groupId) {
      const assigned = await prisma.courseAssignment.findFirst({ where: { courseId: target.targetId || courseId || "", groupId: viewer.groupId } });
      if (assigned) return true;
    }
  }
  return false;
}

export async function acknowledgeAnnouncement(viewer: SessionUser, announcementId: string) {
  const visible = await visibleAnnouncements(viewer);
  if (!visible.some((item) => item.id === announcementId)) throw new ApiError(404, "Announcement not found.");
  await prisma.announcementAcknowledgement.upsert({
    where: { announcementId_userId: { announcementId, userId: viewer.id } },
    create: { announcementId, userId: viewer.id },
    update: {},
  });
  await prisma.notification.updateMany({
    where: { userId: viewer.id, relatedId: announcementId, acknowledgementRequired: true, acknowledgedAt: null },
    data: { acknowledgedAt: new Date(), readAt: new Date() },
  });
  await audit({ actorId: viewer.id, action: "ANNOUNCEMENT_ACKNOWLEDGED", entityType: "COMMUNICATION", entityId: announcementId, metadata: { announcementId } });
  return { acknowledged: true };
}
