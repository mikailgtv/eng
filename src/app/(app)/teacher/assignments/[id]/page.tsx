import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { assertAssignmentAccess } from "@/lib/teaching/access";
import { formatDateTime } from "@/lib/utils";
import { PublishAssignmentButton, ReviewForm } from "@/components/teaching/review-form";

export const metadata: Metadata = { title: "Assignment" };

export default async function TeacherAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const assignment = await assertAssignmentAccess({ id: user.id, role: user.role, groupId: user.groupId }, id).catch(() => null);
  if (!assignment) notFound();
  const full = await prisma.assignment.findUnique({
    where: { id: assignment.id },
    include: {
      group: { select: { name: true } },
      lesson: { select: { title: true } },
      submissions: { include: { student: { select: { firstName: true, lastName: true, employeeCode: true } } }, orderBy: { submittedAt: "desc" } },
    },
  });
  if (!full) notFound();
  const students = await prisma.user.count({ where: { groupId: full.groupId, role: "STUDENT", status: "ACTIVE" } });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="text-xs text-muted"><Link href="/teacher/assignments" className="underline">Assignments</Link></p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{full.title}</h1>
      <p className="mt-1 text-sm text-muted">
        {full.group.name} · {full.type} · {full.status} · due {formatDateTime(full.dueAt)}
        {full.lesson ? ` · ${full.lesson.title}` : ""}
        {full.allowLate ? " · late submissions allowed" : " · late submissions closed"}
      </p>
      {full.instructions && <p className="mt-3 text-sm">{full.instructions}</p>}
      {full.status === "DRAFT" && <div className="mt-4"><PublishAssignmentButton id={full.id} /></div>}
      <h2 className="mb-2 mt-6 text-sm font-semibold">Submissions ({full.submissions.length} of {students} students)</h2>
      {full.submissions.length === 0 ? (
        <p className="text-sm text-muted">No submissions yet.</p>
      ) : (
        <ul className="space-y-3">
          {full.submissions.map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
              <p className="font-medium">{row.student.firstName} {row.student.lastName} · {row.student.employeeCode}</p>
              <p className="text-xs text-muted">{row.status}{row.submittedAt ? ` · ${formatDateTime(row.submittedAt)}` : ""}{row.score !== null ? ` · score ${row.score}` : ""}</p>
              {row.textResponse && <p className="mt-2 whitespace-pre-wrap">{row.textResponse}</p>}
              {row.feedback && <p className="mt-2 text-muted">Feedback: {row.feedback}</p>}
              {row.status !== "GRADED" && row.textResponse && <ReviewForm submissionId={row.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
