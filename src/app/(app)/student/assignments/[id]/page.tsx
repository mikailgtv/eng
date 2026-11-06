import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { SubmitAssignment } from "@/components/teaching/submit-assignment";

export const metadata: Metadata = { title: "Assignment" };

export default async function StudentAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageUser(["STUDENT"]);
  const assignment = await prisma.assignment.findFirst({
    where: { id: id, groupId: user.groupId ?? "__none__", status: "PUBLISHED" },
    include: { lesson: { select: { title: true } }, submissions: { where: { studentId: user.id } } },
  });
  if (!assignment) notFound();
  const sub = assignment.submissions[0];
  const closed = assignment.dueAt < new Date() && !assignment.allowLate && !sub;

  return (
    <div className="mx-auto w-full max-w-lg">
      <p className="text-xs text-muted"><Link href="/student/assignments" className="underline">My assignments</Link></p>
      <h1 className="mt-1 text-xl font-semibold">{assignment.title}</h1>
      <p className="mt-1 text-sm text-muted">Due {formatDateTime(assignment.dueAt)}{assignment.lesson ? ` · ${assignment.lesson.title}` : ""}</p>
      {assignment.instructions && <p className="mt-3 text-sm">{assignment.instructions}</p>}
      {sub?.status === "GRADED" && (
        <p className="mt-4 rounded-lg border border-border px-3 py-2 text-sm">Reviewed{sub.score !== null ? ` · score ${sub.score}` : ""}{sub.feedback ? ` · ${sub.feedback}` : ""}</p>
      )}
      {sub && sub.status !== "GRADED" && <p className="mt-4 text-sm text-muted">Submitted {sub.submittedAt ? formatDateTime(sub.submittedAt) : ""}. You can update the text until it is reviewed.</p>}
      {closed ? (
        <p className="mt-4 text-sm text-muted">The due time has passed and late submissions are not allowed.</p>
      ) : sub?.status === "GRADED" ? null : (
        <div className="mt-4"><SubmitAssignment assignmentId={assignment.id} initial={sub?.textResponse ?? ""} /></div>
      )}
    </div>
  );
}
