import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { getResultForStudent } from "@/lib/assessment/queries";
import { PageHeader } from "@/components/ui/page-header";
import { ResultView } from "@/components/assessment/result-view";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}

export const metadata: Metadata = { title: "Result" };

/**
 * A student's own result. Ownership and visibility (showResults /
 * showCorrectAnswers) are enforced in the query layer — a student can only
 * ever reach their own attempt here.
 */
export default async function ResultPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { attempt } = await searchParams;
  const user = await requirePageUser(["STUDENT"]);
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };

  // Resolve which attempt to show: explicit, else the latest finished one.
  let attemptId = attempt;
  if (attemptId) {
    const owned = await prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, studentId: user.id, assessmentId: id },
      select: { id: true },
    });
    if (!owned) attemptId = undefined;
  }
  if (!attemptId) {
    const latest = await prisma.assessmentAttempt.findFirst({
      where: { assessmentId: id, studentId: user.id, status: { not: "IN_PROGRESS" } },
      orderBy: { attemptNumber: "desc" },
      select: { id: true },
    });
    attemptId = latest?.id;
  }
  if (!attemptId) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <p className="py-16 text-center text-sm text-muted">No results yet for this assessment.</p>
        <div className="text-center">
          <Link href={`/student/exams/${id}`}>
            <Button variant="secondary">Back to assessment</Button>
          </Link>
        </div>
      </div>
    );
  }

  const result = await getResultForStudent(viewer, attemptId);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/student/exams"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> My Exams
      </Link>
      <PageHeader
        title={result.assessmentTitle}
        description={`${result.assessmentType === "EXAM" ? "Exam" : "Quiz"} result · Attempt ${result.attemptNumber}`}
      />
      <div className="mt-5">
        <ResultView result={result} typeLabel={result.assessmentType === "EXAM" ? "Exam" : "Quiz"} />
      </div>
    </div>
  );
}
