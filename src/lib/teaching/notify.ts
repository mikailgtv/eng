import { logSafeError } from "@/lib/logging";
import { publishNotification } from "@/lib/communication/hub";

export type NotifyInput = {
  type: string;
  title: string;
  body: string;
  href?: string | null;
  category?: string;
  priority?: string;
  source?: string;
  relatedType?: string;
  relatedId?: string;
  actionLabel?: string;
  groupKey?: string;
  critical?: boolean;
  acknowledgementRequired?: boolean;
  expiresAt?: Date | null;
};

/**
 * Shared notifier used by Phases 5–11.
 * Failures are logged and do not undo the academic action that triggered them.
 */
export async function notifyUsers(userIds: string[], input: NotifyInput) {
  try {
    await publishNotification({ userIds, ...input });
  } catch (err) {
    logSafeError("notification.write-failed", err);
  }
}

export async function notifyGroupStudents(groupId: string, input: NotifyInput) {
  const { prisma } = await import("@/lib/prisma");
  const students = await prisma.user.findMany({
    where: { groupId, role: "STUDENT", status: "ACTIVE" },
    select: { id: true },
  });
  await notifyUsers(students.map((student) => student.id), input);
}
