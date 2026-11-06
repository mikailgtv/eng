import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { assignedGroupIds } from "@/lib/teaching/access";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const ids = await assignedGroupIds({ id: user.id, role: user.role, groupId: user.groupId });
  const sessions = await prisma.classSession.findMany({
    where: { ...(ids === null ? {} : { groupId: { in: ids } }), status: { in: ["IN_PROGRESS", "COMPLETED"] } },
    include: {
      group: { select: { name: true } },
      attendance: true,
    },
    orderBy: { scheduledStart: "desc" },
    take: 30,
  });
  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight">Attendance</h1>
      <p className="mt-1 text-sm text-muted">Counts only. This page does not rank students.</p>
      {sessions.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No classes have attendance yet. Start a class from the schedule.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {sessions.map((session) => {
            const present = session.attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
            return (
              <li key={session.id}>
                <Link href={`/teacher/classes/${session.id}`} className="block rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:bg-muted/5">
                  <span className="font-medium">{session.title}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {session.group.name} · {formatDateTime(session.scheduledStart)} · {present} present or late · {session.attendance.filter((a) => a.status === "ABSENT").length} absent · {session.attendance.length} marked
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
