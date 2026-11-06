import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { getResultForStaff } from "@/lib/assessment/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ResultView } from "@/components/assessment/result-view";
import { fullName } from "@/lib/utils";

interface PageProps {
  params: Promise<{ attemptId: string }>;
}

export const metadata: Metadata = { title: "Student result" };

/**
 * Staff view of one student's attempt — teachers may only open attempts of
 * students in their own groups (checked server-side in getResultForStaff).
 * Staff always see the full review, independent of student-facing settings.
 */
export default async function StaffResultPage({ params }: PageProps) {
  const { attemptId } = await params;
  const user = await requirePageUser(["TEACHER", "ADMIN"]);
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  // A missing attempt is a 404 for the reader, not a server fault. The query
  // throws ApiError so API routes can answer with a status; a page has to turn
  // that one case into notFound() itself. Everything else — notably the 403 for
  // a learner outside the teacher's groups — keeps propagating unchanged.
  let result: Awaited<ReturnType<typeof getResultForStaff>>;
  try {
    result = await getResultForStaff(viewer, attemptId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  const sitting = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    select: { student: { select: { firstName: true, lastName: true, group: { select: { name: true } } } } },
  });
  const who = sitting
    ? `${fullName(sitting.student)}${sitting.student.group ? ` · ${sitting.student.group.name}` : ""}`
    : "Student";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/teacher/results"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Results
      </Link>
      <PageHeader
        title={result.assessmentTitle}
        description={`${who} · ${result.assessmentType === "EXAM" ? "Exam" : "Quiz"} · Attempt ${result.attemptNumber}`}
      />
      <div className="mt-5">
        <ResultView result={result} typeLabel={result.assessmentType === "EXAM" ? "Exam" : "Quiz"} />
      </div>
    </div>
  );
}
