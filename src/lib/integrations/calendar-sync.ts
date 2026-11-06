import { prisma } from "../prisma";

export interface IcalExportOptions {
  userId: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export class CalendarSyncService {
  /**
   * Generates a standard RFC 5545 iCalendar feed for classes, exams, and shifts.
   */
  public static async generateUserIcs(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        group: {
          include: {
            sessions: {
              take: 20,
              orderBy: { scheduledStart: "asc" },
            },
          },
        },
        taughtSessions: {
          take: 20,
          orderBy: { scheduledStart: "asc" },
        },
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const events: string[] = [];
    const now = new Date();

    const sessions = user.role === "TEACHER" ? user.taughtSessions : (user.group?.sessions || []);

    for (const sess of sessions) {
      const dtStart = sess.scheduledStart.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const dtEnd = sess.scheduledEnd.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      const uid = `eb_session_${sess.id}@englishbridge.org`;

      events.push(`BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"}
DTSTART:${dtStart}
DTEND:${dtEnd}
SUMMARY:${escapeIcsText(sess.title || "English Learning Session")}
DESCRIPTION:EnglishBridge interactive synchronous session.
LOCATION:EnglishBridge Virtual Classroom
STATUS:CONFIRMED
END:VEVENT`);
    }

    // Format iCalendar container
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//EnglishBridge Enterprise LMS//Shift-Aware Calendar Sync//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      `X-WR-CALNAME:EnglishBridge - ${user.firstName} ${user.lastName}`,
      "X-WR-TIMEZONE:UTC",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    return icsContent;
  }

  /**
   * Records or updates synchronization mapping to external calendars (Google/Outlook).
   */
  public static async recordSyncMapping(
    userId: string,
    provider: "GOOGLE" | "OUTLOOK" | "ICAL" | "APPLE",
    lmsEventType: string,
    lmsEventId: string,
    externalEventId: string
  ) {
    return await prisma.calendarSyncMapping.upsert({
      where: {
        userId_lmsEventType_lmsEventId: {
          userId,
          lmsEventType,
          lmsEventId,
        },
      },
      create: {
        userId,
        provider,
        lmsEventType,
        lmsEventId,
        externalEventId,
        status: "SYNCED",
        lastSyncedAt: new Date(),
      },
      update: {
        externalEventId,
        status: "SYNCED",
        lastSyncedAt: new Date(),
      },
    });
  }
}
