import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { finalizeIfExpired, getAttemptState } from "@/lib/assessment/engine";
import { ExamRunner } from "@/components/assessment/exam-runner";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ attempt?: string }>;
}

export const metadata: Metadata = { title: "Assessment in progress" };

/**
 * The exam room. Loads the ACTIVE attempt for the session student; finished
 * attempts redirect to the result, missing attempts redirect to the overview.
 * All state is server-fetched so a refresh restores the same attempt, the
 * same question order and the same (server) deadline.
 */
export default async function TakeAssessmentPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { attempt: attemptParam } = await searchParams;
  const user = await requirePageUser(["STUDENT"]);
  const attemptId = attemptParam;

  const attempt = attemptId
    ? await prisma.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: { assessment: { select: { id: true, title: true, type: true, allowNavigation: true } } },
      })
    : null;

  if (
    !attempt ||
    attempt.studentId !== user.id ||
    attempt.assessment.id !== id
  ) {
    // No (valid) attempt specified — resume the active one if there is any.
    const active = await prisma.assessmentAttempt.findFirst({
      where: { assessmentId: id, studentId: user.id, status: "IN_PROGRESS" },
      select: { id: true },
    });
    if (active) redirect(`/student/exams/${id}/take?attempt=${active.id}`);
    redirect(`/student/exams/${id}`);
  }

  if (attempt.status !== "IN_PROGRESS") {
    redirect(`/student/exams/${id}/result?attempt=${attempt.id}`);
  }

  await finalizeIfExpired(attempt.id);
  const fresh = await prisma.assessmentAttempt.findUnique({ where: { id: attempt.id } });
  if (!fresh || fresh.status !== "IN_PROGRESS") {
    redirect(`/student/exams/${id}/result?attempt=${attempt.id}`);
  }

  const state = await getAttemptState({ id: user.id, role: user.role, groupId: user.groupId }, attempt.id);

  return (
    <ExamRunner
      assessmentId={attempt.assessment.id}
      title={attempt.assessment.title}
      type={attempt.assessment.type}
      allowNavigation={attempt.assessment.allowNavigation}
      initialState={{
        attempt: {
          id: state.attempt.id,
          attemptNumber: state.attempt.attemptNumber,
          status: state.attempt.status,
          deadlineAt: state.attempt.deadlineAt ? state.attempt.deadlineAt.toISOString() : null,
          serverNow: state.attempt.serverNow.toISOString(),
        },
        questions: state.questions as never[],
        answers: state.answers,
      }}
    />
  );
}
