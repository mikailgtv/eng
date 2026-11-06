import type { Metadata } from "next";
import Link from "next/link";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My assignments" };

export default async function StudentAssignmentsPage() {
  const user = await requirePageUser(["STUDENT"]);
  if (!user.groupId) {
    return <p className="text-sm text-muted">You are not in a learning group yet.</p>;
  }
  const [rows, speaking, listening] = await Promise.all([
    prisma.assignment.findMany({
      where: { groupId: user.groupId, status: "PUBLISHED" },
      include: { lesson: { select: { title: true } }, course: { select: { title: true } }, submissions: { where: { studentId: user.id } } },
      orderBy: { dueAt: "asc" },
    }),
    prisma.speakingAssignment.findMany({ where: { groupId: user.groupId, status: "PUBLISHED" }, orderBy: { dueAt: "asc" } }),
    prisma.listeningAssignment.findMany({ where: { groupId: user.groupId, status: "PUBLISHED" }, orderBy: { dueAt: "asc" } }),
  ]);
  return (
    <div className="mx-auto w-full max-w-lg">
      <h1 className="text-xl font-semibold tracking-tight">My assignments</h1>
      <p className="mt-1 text-sm text-muted">Write your answer in the box. File upload is not available.</p>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No assignments right now.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((row) => {
            const sub = row.submissions[0];
            const late = !sub && row.dueAt < new Date();
            const status = sub?.status ?? (late ? "LATE" : "NOT_STARTED");
            return (
              <li key={row.id}>
                <Link href={`/student/assignments/${row.id}`} className="block rounded-xl border border-border bg-surface px-4 py-3">
                  <span className="font-medium">{row.title}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {row.course?.title ?? "Course"}{row.lesson ? ` · ${row.lesson.title}` : ""} · due {formatDateTime(row.dueAt)} · {label(status)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {(speaking.length > 0 || listening.length > 0) && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold">Speaking and listening practice</h2>
          <p className="mt-1 text-xs text-muted">These are practice tasks. They are not exams and they do not change a grade.</p>
          <ul className="mt-3 space-y-2">
            {speaking.map((row) => (
              <li key={row.id}>
                <Link href="/student/speaking" className="block rounded-xl border border-border px-4 py-3 text-sm">
                  <span className="font-medium">{row.title}</span>
                  <span className="mt-1 block text-xs text-muted">Speaking · {row.topic} · due {formatDateTime(row.dueAt)} · {row.gradingMode === "AI_FEEDBACK" ? "AI feedback only" : row.gradingMode === "TEACHER_REVIEW" ? "Teacher review" : "Completion"}</span>
                </Link>
              </li>
            ))}
            {listening.map((row) => (
              <li key={row.id}>
                <Link href="/student/listening" className="block rounded-xl border border-border px-4 py-3 text-sm">
                  <span className="font-medium">{row.title}</span>
                  <span className="mt-1 block text-xs text-muted">Listening · due {formatDateTime(row.dueAt)} · practice score only</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function label(status: string) {
  if (status === "NOT_STARTED") return "Not started";
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "SUBMITTED") return "Submitted";
  if (status === "LATE") return "Late";
  if (status === "GRADED") return "Reviewed";
  return status;
}
