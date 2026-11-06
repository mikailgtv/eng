import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { listStudentAssessments } from "@/lib/assessment/queries";
import { PageHeader } from "@/components/ui/page-header";
import { StartPanel } from "@/components/assessment/start-panel";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await requirePageUser(["STUDENT"]);
  const items = await listStudentAssessments({ id: user.id, role: user.role, groupId: user.groupId });
  const item = items.find((a) => a.id === id);
  return { title: item?.title ?? "Assessment" };
}

/**
 * Assessment overview: title, description, counts and the Start flow with
 * its confirmation dialog. Only assessments visible to the student's group
 * resolve here — anything else is a 404.
 */
export default async function AssessmentOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requirePageUser(["STUDENT"]);
  const items = await listStudentAssessments({ id: user.id, role: user.role, groupId: user.groupId });
  const a = items.find((x) => x.id === id);
  if (!a) notFound();

  const noun = a.type === "EXAM" ? "exam" : "quiz";
  let blockedReason: string | null = null;
  if (a.status === "SCHEDULED") {
    blockedReason = `This ${noun} opens ${a.startAt ? "on " + a.startAt.toUTCString() : "soon"}. Come back then!`;
  } else if (!a.canStart && !a.activeAttemptId) {
    blockedReason =
      a.maxAttempts !== null && a.myAttempts >= a.maxAttempts
        ? "You have used all of your attempts for this assessment."
        : `This ${noun} is closed.`;
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/student/exams"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> My Exams
      </Link>

      <PageHeader
        title={a.title}
        description={a.description ?? undefined}
        actions={<span className="whitespace-nowrap rounded-full bg-primary-subtle px-3 py-1 text-xs font-semibold text-primary">{a.type === "EXAM" ? "Exam" : "Quiz"}</span>}
      />
      {a.courseTitle && <p className="mb-6 -mt-3 text-[13px] text-muted">{a.courseTitle}</p>}

      <StartPanel
        assessmentId={a.id}
        type={a.type}
        questionsCount={a.questionsCount}
        durationMinutes={a.durationMinutes}
        passingScore={a.passingScore}
        maxAttempts={a.maxAttempts}
        myAttempts={a.myAttempts}
        activeAttemptId={a.activeAttemptId}
        canStart={a.canStart}
        blockedReason={blockedReason}
      />

      <p className="mt-6 text-xs leading-5 text-muted">
        This is a formal assessment — your score is saved to your record and every attempt is kept. Practice
        exercises inside lessons stay separate and do not affect this result.
      </p>
    </div>
  );
}
