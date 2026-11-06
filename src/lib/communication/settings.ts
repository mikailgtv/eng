import { prisma } from "@/lib/prisma";

const DEFAULTS: Record<string, string> = {
  studentToStudent: "false",
  readReceipts: "false",
  maxAttachmentBytes: "5000000",
  smsEnabled: "false",
  emailEnabled: "false",
  pushEnabled: "false",
  quietHoursOverrideCritical: "false",
  retentionDaysNotifications: "180",
  retentionDaysMessages: "365",
  reminderClassMinutes: "30",
  assignmentRemindDays: "3,1",
  examRemindHours: "24",
  adaptiveReviewThreshold: "5",
  notificationHourlyCap: "20",
  groupWindowMinutes: "1440",
  messageEditMinutes: "15",
  disabledCategories: "",
};

export async function communicationSettings() {
  const rows = await prisma.communicationSetting.findMany({ where: { scopeKey: "GLOBAL" } });
  const values = { ...DEFAULTS };
  for (const row of rows) values[row.key] = row.value;
  return {
    raw: values,
    studentToStudent: values.studentToStudent === "true",
    readReceipts: values.readReceipts === "true",
    maxAttachmentBytes: Number(values.maxAttachmentBytes) || 5_000_000,
    smsEnabled: values.smsEnabled === "true",
    emailEnabled: values.emailEnabled === "true",
    pushEnabled: values.pushEnabled === "true",
    quietHoursOverrideCritical: values.quietHoursOverrideCritical === "true",
    retentionDaysNotifications: Number(values.retentionDaysNotifications) || 180,
    retentionDaysMessages: Number(values.retentionDaysMessages) || 365,
    reminderClassMinutes: Number(values.reminderClassMinutes) || 30,
    assignmentRemindDays: values.assignmentRemindDays.split(",").map((item) => Number(item)).filter((item) => item > 0),
    examRemindHours: Number(values.examRemindHours) || 24,
    adaptiveReviewThreshold: Number(values.adaptiveReviewThreshold) || 5,
    notificationHourlyCap: Number(values.notificationHourlyCap) || 20,
    groupWindowMinutes: Number(values.groupWindowMinutes) || 1440,
    messageEditMinutes: Number(values.messageEditMinutes) || 15,
    disabledCategories: values.disabledCategories.split(",").map((item) => item.trim()).filter(Boolean),
  };
}

export async function saveCommunicationSetting(actorId: string, key: string, value: string) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
    throw new Error("That communication setting is not recognized.");
  }
  await prisma.communicationSetting.upsert({
    where: { scopeKey_key: { scopeKey: "GLOBAL", key } },
    create: { scopeKey: "GLOBAL", key, value, updatedById: actorId },
    update: { value, updatedById: actorId },
  });
}
