import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { groupAnalyticsForStaff, skillAnalyticsForStaff } from "@/lib/assessment/queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { AssessmentSettingsForm } from "@/components/assessment/assessment-settings-form";
import { QuestionPicker } from "@/components/assessment/question-picker";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: "Edit assessment" };

/**
 * The builder: settings + explicit question selection (order/points) +
 * real group & skill analytics once attempts exist. Every control works.
 */
export default async function EditAssessmentPage({ params }: PageProps) {
  const { id } = await params;
  await requirePageUser(["TEACHER", "ADMIN"]);

  const assessment = await prisma.assessment.findUnique({
    where: { id: id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { question: { select: { id: true, questionText: true, type: true, status: true } } },
      },
    },
  });
  if (!assessment) notFound();

  const [courses, analytics, skills] = await Promise.all([
    prisma.course.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { createdAt: "asc" }, select: { id: true, title: true } }),
    groupAnalyticsForStaff({ id: "server", role: "ADMIN", groupId: null }, id),
    skillAnalyticsForStaff(id),
  ]);

  const toUtc = (d: Date | null) => (d ? d.toISOString().slice(0, 16) : "");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/teacher/exams"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Assessments
      </Link>
      <PageHeader
        title={assessment.title}
        description={`${assessment.type === "EXAM" ? "Exam" : "Quiz"} · ${assessment.status === "SCHEDULED" ? "Scheduled" : assessment.status.charAt(0) + assessment.status.slice(1).toLowerCase()}`}
      />

      {/* Analytics (real attempts only) */}
      <section aria-labelledby="analytics" className="mb-8 mt-6">
        <h2 id="analytics" className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <BarChart3 className="h-4 w-4 text-muted" aria-hidden /> Results overview
        </h2>
        {analytics.every((g) => g.completed === 0) && skills.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-[13px] text-muted">
            No submitted attempts yet — analytics appear here as soon as students finish.
          </p>
        ) : (
          <div className="space-y-3">
            {analytics.map((g) => (
              <div key={g.groupId} className="rounded-xl border border-border bg-surface px-4 py-3.5">
                <p className="text-sm font-semibold text-foreground">{g.groupName}</p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-[13px] sm:grid-cols-5">
                  <Metric label="Students" value={String(g.students)} />
                  <Metric label="Completed" value={String(g.completed)} />
                  <Metric label="Average" value={g.average !== null ? `${g.average}%` : "—"} />
                  <Metric label="Passed" value={String(g.passed)} />
                  <Metric label="Not passed" value={String(g.notPassed)} />
                </dl>
              </div>
            ))}
            {skills.length > 0 && (
              <div className="rounded-xl border border-border bg-surface px-4 py-3.5">
                <p className="text-sm font-semibold text-foreground">Performance by skill</p>
                <ul className="mt-2 space-y-1.5">
                  {skills.map((s) => (
                    <li key={s.skill} className="flex items-center justify-between text-[13px]">
                      <span className="text-foreground">{s.skill}</span>
                      <span className="tabular-nums text-muted">
                        {s.percent}% ({s.correct}/{s.total})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted">Group summaries only — students are never ranked individually.</p>
          </div>
        )}
      </section>

      {/* Question selection */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <Link href="/teacher/questions" className="text-[13px] font-medium text-primary hover:underline">
            Manage question bank
          </Link>
        </CardHeader>
        <CardBody>
          <QuestionPicker
            assessmentId={assessment.id}
            initialSelected={assessment.questions
              .filter((l) => l.question.status !== "ARCHIVED")
              .map((l) => ({
                questionId: l.question.id,
                points: l.points,
                questionText: l.question.questionText,
                type: l.question.type,
              }))}
          />
        </CardBody>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardBody>
          <AssessmentSettingsForm
            mode="edit"
            scope={{ courses }}
            initial={{
              id: assessment.id,
              title: assessment.title,
              description: assessment.description ?? "",
              type: assessment.type,
              courseId: assessment.courseId ?? "",
              durationMinutes: assessment.durationMinutes !== null ? String(assessment.durationMinutes) : "",
              passingScore: assessment.passingScore,
              maxAttempts: assessment.maxAttempts !== null ? String(assessment.maxAttempts) : "",
              randomizeQuestions: assessment.randomizeQuestions,
              randomizeOptions: assessment.randomizeOptions,
              showResults: assessment.showResults,
              showCorrectAnswers: assessment.showCorrectAnswers,
              allowNavigation: assessment.allowNavigation,
              status: assessment.status,
              startAt: toUtc(assessment.startAt),
              endAt: toUtc(assessment.endAt),
            }}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
