/**
 * Notification hub. Existing Phase 5–11 callers reach this through notifyUsers.
 * In-app is stored first. External channels never claim delivery they did not confirm.
 */
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import {
  CATEGORIES,
  categoryForType,
  formatInZone,
  groupedBody,
  inQuietHours,
  isCriticalType,
  zoneName,
  type NoticeCategory,
  type NoticePriority,
} from "@/lib/communication/rules";
import { emailProvider, pushProvider, smsProvider } from "@/lib/communication/providers";
import { communicationSettings } from "@/lib/communication/settings";

export type PublishInput = {
  userIds: string[];
  type: string;
  title: string;
  body: string;
  href?: string | null;
  category?: string | null;
  priority?: string | null;
  source?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  actionLabel?: string | null;
  groupKey?: string | null;
  critical?: boolean;
  acknowledgementRequired?: boolean;
  expiresAt?: Date | null;
};

export async function publishNotification(input: PublishInput) {
  const settings = await communicationSettings();
  const category = categoryForType(input.type, input.category);
  const priority = (input.priority && ["LOW", "NORMAL", "HIGH", "URGENT"].includes(input.priority) ? input.priority : "NORMAL") as NoticePriority;
  const critical = isCriticalType(input.type, input.critical) || priority === "URGENT";
  if (settings.disabledCategories.includes(category) && !critical) return { created: 0, grouped: 0, suppressed: input.userIds.length };
  const ids = [...new Set(input.userIds)].filter(Boolean);
  let created = 0;
  let grouped = 0;
  let suppressed = 0;
  for (const userId of ids) {
    const result = await publishOne(userId, input, settings, category, priority, critical);
    if (result === "created") created += 1;
    else if (result === "grouped") grouped += 1;
    else suppressed += 1;
  }
  return { created, grouped, suppressed };
}

async function publishOne(
  userId: string,
  input: PublishInput,
  settings: Awaited<ReturnType<typeof communicationSettings>>,
  category: NoticeCategory,
  priority: NoticePriority,
  critical: boolean,
): Promise<"created" | "grouped" | "suppressed"> {
  const preference = await prisma.notificationPreference.findUnique({ where: { userId_category: { userId, category } } });
  const inApp = critical || (preference?.inApp ?? true);
  if (!inApp) {
    await recordDelivery(userId, null, "IN_APP", "FAILED", "In-app notices are off for this category.");
    return "suppressed";
  }
  if (!critical) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await prisma.notification.count({ where: { userId, critical: false, createdAt: { gte: since } } });
    if (recent >= settings.notificationHourlyCap) {
      await recordDelivery(userId, null, "IN_APP", "FAILED", "Hourly notification limit reached. This non-critical notice was not added.");
      return "suppressed";
    }
  }
  const groupKey = input.groupKey || `${input.type}:${input.href ?? input.title}`;
  const windowStart = new Date(Date.now() - settings.groupWindowMinutes * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: { userId, groupKey, readAt: null, archivedAt: null, createdAt: { gte: windowStart } },
    orderBy: { createdAt: "desc" },
  });
  if (existing && !critical) {
    const eventCount = existing.eventCount + 1;
    await prisma.notification.update({
      where: { id: existing.id },
      data: { eventCount, body: groupedBody(input.title, eventCount), title: input.title },
    });
    return "grouped";
  }
  const duplicate = await prisma.notification.findFirst({
    where: { userId, type: input.type, title: input.title, href: input.href ?? null, createdAt: { gte: windowStart } },
  });
  if (duplicate && !input.groupKey) return "suppressed";
  const row = await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      category,
      priority,
      source: input.source ?? "SYSTEM",
      relatedType: input.relatedType ?? null,
      relatedId: input.relatedId ?? null,
      actionLabel: input.actionLabel ?? null,
      groupKey,
      critical,
      acknowledgementRequired: Boolean(input.acknowledgementRequired),
      expiresAt: input.expiresAt ?? null,
    },
  });
  await recordDelivery(userId, row.id, "IN_APP", "DELIVERED", "Stored in the notification center.");
  await deliverExternal(userId, row.id, input, category, priority, critical, preference, settings);
  return "created";
}

async function deliverExternal(
  userId: string,
  notificationId: string,
  input: PublishInput,
  category: NoticeCategory,
  priority: NoticePriority,
  critical: boolean,
  preference: { email: boolean; push: boolean; sms: boolean } | null,
  settings: Awaited<ReturnType<typeof communicationSettings>>,
) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const quiet = await prisma.communicationPreference.findUnique({ where: { userId } });
  const zone = zoneName(quiet?.timezone);
  const quietNow = inQuietHours(new Date(), quiet?.quietStart ?? null, quiet?.quietEnd ?? null, zone);
  const override = critical && priority === "URGENT" && settings.quietHoursOverrideCritical;
  const blockedByQuiet = quietNow && !override;
  if (settings.emailEnabled && preference?.email && user?.email) {
    if (blockedByQuiet) {
      await recordDelivery(userId, notificationId, "EMAIL", "FAILED", "Quiet hours. Non-critical email was not sent.");
    } else {
      const result = await emailProvider().send({ to: user.email, subject: input.title, text: input.body });
      await recordDelivery(userId, notificationId, "EMAIL", result.status === "submitted" ? "SUBMITTED" : "FAILED", result.detail, result.providerRef);
    }
  }
  if (settings.pushEnabled && preference?.push) {
    if (blockedByQuiet) {
      await recordDelivery(userId, notificationId, "PUSH", "FAILED", "Quiet hours. Push was not sent.");
    } else {
      const device = await prisma.pushSubscription.findFirst({ where: { userId, revokedAt: null } });
      if (!device) {
        await recordDelivery(userId, notificationId, "PUSH", "FAILED", "No push device is registered.");
      } else {
        const result = await pushProvider().send({ endpoint: device.endpoint, title: input.title, body: input.body });
        await recordDelivery(userId, notificationId, "PUSH", result.status === "submitted" ? "SUBMITTED" : "FAILED", result.detail);
      }
    }
  }
  if (settings.smsEnabled && preference?.sms && priority === "URGENT") {
    await recordDelivery(userId, notificationId, "SMS", "FAILED", "No phone number is stored for this account. SMS was not sent.");
  }
}

async function recordDelivery(userId: string, notificationId: string | null, channel: string, status: string, detail: string, providerRef?: string) {
  await prisma.notificationDelivery.create({
    data: { userId, notificationId, channel, status, detail, providerRef: providerRef ?? null },
  });
}

export async function listNotifications(userId: string, options: { category?: string; status?: string; take?: number; cursor?: string }) {
  const take = Math.min(30, Math.max(1, options.take ?? 20));
  const now = new Date();
  const status = options.status ?? "inbox";
  const items = await prisma.notification.findMany({
    where: {
      userId,
      ...(options.category ? { category: options.category } : {}),
      ...(status === "archived" ? { archivedAt: { not: null } } : { archivedAt: null }),
      ...(status === "unread" ? { readAt: null, archivedAt: null } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      ...(options.cursor ? { createdAt: { lt: new Date(options.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  const unread = await prisma.notification.count({
    where: { userId, readAt: null, archivedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
  });
  const zone = zoneName((await prisma.communicationPreference.findUnique({ where: { userId } }))?.timezone);
  return {
    unread,
    items: items.map((item) => ({
      id: item.id,
      title: item.eventCount > 1 ? item.title : item.title,
      body: item.body,
      href: item.href,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      displayTime: formatInZone(item.createdAt, zone),
      category: item.category,
      priority: item.priority,
      source: item.source,
      actionLabel: item.actionLabel,
      eventCount: item.eventCount,
      state: item.archivedAt ? "Archived" : item.readAt ? "Read" : "Unread",
      acknowledgementRequired: item.acknowledgementRequired,
      acknowledgedAt: item.acknowledgedAt?.toISOString() ?? null,
      critical: item.critical,
    })),
  };
}

export async function markNotificationsRead(userId: string, id?: string, all = false) {
  const now = new Date();
  if (all) {
    await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: now } });
    return;
  }
  if (!id) return;
  await prisma.notification.updateMany({ where: { id, userId }, data: { readAt: now } });
}

export async function archiveNotification(userId: string, id: string) {
  const row = await prisma.notification.findFirst({ where: { id, userId } });
  if (!row) return false;
  await prisma.notification.update({ where: { id }, data: { archivedAt: new Date(), readAt: row.readAt ?? new Date() } });
  return true;
}

export async function acknowledgeNotification(userId: string, id: string) {
  const row = await prisma.notification.findFirst({ where: { id, userId, acknowledgementRequired: true } });
  if (!row) return false;
  const now = new Date();
  await prisma.notification.update({ where: { id }, data: { acknowledgedAt: now, readAt: row.readAt ?? now } });
  await audit({ actorId: userId, action: "NOTIFICATION_ACKNOWLEDGED", entityType: "COMMUNICATION", entityId: id, metadata: { title: row.title } });
  return true;
}

export async function preferenceView(userId: string) {
  const rows = await prisma.notificationPreference.findMany({ where: { userId } });
  const quiet = await prisma.communicationPreference.findUnique({ where: { userId } });
  const byCategory = Object.fromEntries(rows.map((row) => [row.category, row]));
  return {
    timezone: zoneName(quiet?.timezone),
    quietStart: quiet?.quietStart ?? "",
    quietEnd: quiet?.quietEnd ?? "",
    categories: CATEGORIES.map((category) => ({
      category,
      inApp: byCategory[category]?.inApp ?? true,
      email: byCategory[category]?.email ?? false,
      push: byCategory[category]?.push ?? false,
      sms: byCategory[category]?.sms ?? false,
      criticalNote: category === "ADMIN" || category === "CERTIFICATE" || category === "EXAM" ? "Official notices in this category stay in the app." : null,
    })),
  };
}

export async function savePreference(userId: string, input: { category: string; inApp: boolean; email: boolean; push: boolean; sms: boolean; quietStart?: string; quietEnd?: string; timezone?: string }) {
  if (!CATEGORIES.includes(input.category as NoticeCategory)) throw new Error("Unknown category.");
  const official = input.category === "ADMIN" || input.category === "CERTIFICATE" || input.category === "EXAM";
  await prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category: input.category } },
    create: { userId, category: input.category, inApp: official ? true : input.inApp, email: input.email, push: input.push, sms: input.sms },
    update: { inApp: official ? true : input.inApp, email: input.email, push: input.push, sms: input.sms },
  });
  if (input.quietStart !== undefined || input.quietEnd !== undefined || input.timezone !== undefined) {
    await prisma.communicationPreference.upsert({
      where: { userId },
      create: { userId, quietStart: input.quietStart || null, quietEnd: input.quietEnd || null, timezone: input.timezone || null },
      update: { quietStart: input.quietStart || null, quietEnd: input.quietEnd || null, timezone: input.timezone || null },
    });
  }
}

/**
 * Quiet hours live on CommunicationPreference (one row per user) and are saved
 * on their own, so changing a notification category can never overwrite them.
 * An empty string clears the boundary; undefined leaves the stored value alone.
 */
export async function saveQuietHours(userId: string, input: { quietStart?: string; quietEnd?: string }) {
  const normalize = (value?: string) => (value === undefined ? undefined : value.trim() || null);
  const quietStart = normalize(input.quietStart);
  const quietEnd = normalize(input.quietEnd);
  if (quietStart === undefined && quietEnd === undefined) return;
  await prisma.communicationPreference.upsert({
    where: { userId },
    create: { userId, quietStart: quietStart ?? null, quietEnd: quietEnd ?? null },
    update: { quietStart: quietStart ?? null, quietEnd: quietEnd ?? null },
  });
}

export async function communicationAnalytics() {
  const [stored, read, failed, submitted, acknowledged] = await Promise.all([
    prisma.notificationDelivery.count({ where: { channel: "IN_APP", status: "DELIVERED" } }),
    prisma.notification.count({ where: { readAt: { not: null } } }),
    prisma.notificationDelivery.count({ where: { status: "FAILED" } }),
    prisma.notificationDelivery.count({ where: { status: "SUBMITTED" } }),
    prisma.notification.count({ where: { acknowledgedAt: { not: null } } }),
  ]);
  const sent = stored + submitted + failed;
  return {
    stored,
    read,
    failed,
    submitted,
    acknowledged,
    sent,
    note: "Counts only. This is not a ranking. Submitted means a provider accepted the message. It does not mean the inbox or handset confirmed delivery.",
  };
}

export async function retryFailedEmail() {
  const failed = await prisma.notificationDelivery.findMany({
    where: { channel: "EMAIL", status: "FAILED", attemptCount: { lt: 2 } },
    take: 20,
    include: { notification: true },
  });
  const provider = emailProvider();
  if (!provider.configured) return 0;
  let retried = 0;
  for (const delivery of failed) {
    if (!delivery.notification) continue;
    const user = await prisma.user.findUnique({ where: { id: delivery.userId }, select: { email: true } });
    if (!user?.email) continue;
    const result = await provider.send({ to: user.email, subject: delivery.notification.title, text: delivery.notification.body });
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        attemptCount: { increment: 1 },
        status: result.status === "submitted" ? "SUBMITTED" : "FAILED",
        detail: result.detail,
      },
    });
    retried += 1;
  }
  return retried;
}
