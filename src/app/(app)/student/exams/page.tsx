import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, CalendarClock, CheckCircle2, ClipboardList, FileText, History, PlayCircle, XCircle } from "lucide-react";
import { requirePageUser } from "@/lib/guards";
import { listMyAttemptHistory, listStudentAssessments } from "@/lib/assessment/queries";
import { prisma } from "@/lib/prisma";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "My Exams" };

/**
 * "My Exams" — available quizzes/exams (open & scheduled) plus the student's
 * full assessment history. All data is real, from assessment_attempts.
 */
export default async function StudentExamsPage() {
  const user = await requirePageUser(["STUDENT"]);
  const viewer = { id: user.id, role: user.role, groupId: user.groupId };
  const [available, history] = await Promise.all([
    listStudentAssessments(viewer),
    listMyAttemptHistory(viewer),
  ]);

  const [diagnostics, placements] = await Promise.all([
    prisma.diagnosticProfile.findMany({ where: { studentId: user.id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.placementResult.findMany({ where: { studentId: user.id }, orderBy: { createdAt: "desc" }, take: 1 }),
  ]);

  const open = available.filter((a) => a.status === "OPEN");
  const upcoming = available.filter((a) => a.status === "SCHEDULED");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">My Exams</h1>
        <p className="mt-1 text-sm text-muted">Quizzes and exams from your courses, and all of your results.</p>
      </header>

      {/* Open now */}
      {placements.length > 0 && (
        <section aria-labelledby="placement-info" className="mb-6">
          <Card className="border-primary/30 bg-primary-subtle/30">
            <CardBody className="p-4 text-sm">
              <p className="font-semibold text-foreground">Initial Placement</p>
              <p className="text-muted">
                Recommended starting level: <span className="font-semibold text-primary">{placements[0].officialOverride ?? placements[0].recommendedLevel}</span>
                {placements[0].officialOverride ? " (Teacher approved override)" : ""}.
              </p>
              <p className="mt-1 text-xs text-muted">Placement is an initial pathway recommendation, distinct from an official course grade.</p>
            </CardBody>
          </Card>
        </section>
      )}

      {diagnostics.length > 0 && (
        <section aria-labelledby="diagnostic-info" className="mb-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Latest Diagnostic Insights</CardTitle></CardHeader>
            <CardBody className="p-4 pt-0 space-y-2 text-xs">
              {diagnostics.map((d) => {
                const skills = JSON.parse(d.skills) as { label: string; percent: number; recommendation: string }[];
                return (
                  <div key={d.id} className="rounded-lg border border-border p-2.5">
                    <p className="font-medium text-foreground">Diagnostic focus: {skills.map((s) => `${s.label} (${s.percent}%)`).join(", ")}</p>
                    <p className="text-muted mt-1">{skills.find((s) => s.percent < 70)?.recommendation ?? "Diagnostic complete. Practice recommendations updated."}</p>
                    <p className="text-[11px] text-muted mt-0.5">Diagnostic results provide targeted practice recommendations and are not official grades.</p>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </section>
      )}

      <section aria-labelledby="open-now" className="mb-8">
        <h2 id="open-now" className="mb-3 text-[15px] font-semibold text-foreground">
          Open now
        </h2>
        {open.length === 0 ? (
          <Card>
            <EmptyState
              icon={ClipboardList}
              title="No quizzes or exams are open right now."
              description="When your teacher opens an assessment, it will appear here."
              className="py-8"
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {open.map((a) => (
              <li key={a.id}>
                <Card className="overflow-hidden">
                  <CardBody>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={a.type === "EXAM" ? "primary" : "neutral"}>
                            {a.type === "EXAM" ? "Exam" : "Quiz"}
                          </Pill>
                          {a.activeAttemptId && <Pill tone="warning">In progress</Pill>}
                        </div>
                        <p className="mt-1.5 font-semibold text-foreground">{a.title}</p>
                        <p className="text-[13px] text-muted">
                          {a.courseTitle} · {a.questionsCount} questions ·{" "}
                          {a.durationMinutes ? `${a.durationMinutes} min` : "no time limit"} · pass {a.passingScore}% ·{" "}
                          {a.maxAttempts
                            ? `${a.maxAttempts} attempt${a.maxAttempts === 1 ? "" : "s"}`
                            : "unlimited attempts"}
                        </p>
                      </div>
                      <Link href={`/student/exams/${a.id}`} className="shrink-0">
                        <Button size="sm" variant={a.canStart || a.activeAttemptId ? "primary" : "secondary"}>
                          <PlayCircle className="h-4 w-4" aria-hidden />
                          {a.activeAttemptId ? "Resume" : a.myAttempts > 0 ? "Try again" : "Start"}
                        </Button>
                      </Link>
                    </div>
                    {a.lastPercentage !== null && (
                      <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
                        {a.lastPassed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                        ) : (
                          <XCircle className="h-4 w-4 text-danger" aria-hidden />
                        )}
                        Last attempt:{" "}
                        <span className="font-semibold tabular-nums text-foreground">{a.lastPercentage}%</span>
                      </p>
                    )}
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming" className="mb-8">
          <h2 id="upcoming" className="mb-3 text-[15px] font-semibold text-foreground">
            Upcoming
          </h2>
          <ul className="space-y-3">
            {upcoming.map((a) => (
              <li key={a.id}>
                <Card>
                  <CardBody>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Pill tone="primary">Exam</Pill>
                        <p className="mt-1.5 font-semibold text-foreground">{a.title}</p>
                        <p className="flex items-center gap-1.5 text-[13px] text-muted">
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                          Opens {a.startAt ? formatDateTime(a.startAt) : "soon"} · {a.questionsCount} questions ·{" "}
                          {a.durationMinutes ? `${a.durationMinutes} min` : "no limit"}
                        </p>
                      </div>
                      <Link href={`/student/exams/${a.id}`} className="shrink-0">
                        <Button size="sm" variant="secondary">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* History */}
      <section aria-labelledby="history">
        <h2 id="history" className="mb-3 text-[15px] font-semibold text-foreground">
          My results
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>Assessment history</CardTitle>
            <History className="h-4 w-4 text-muted/70" aria-hidden />
          </CardHeader>
          <CardBody className="p-0">
            {history.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No attempts yet."
                description="Your quiz and exam results will be listed here."
                className="py-8"
              />
            ) : (
              <ul className="divide-y divide-border">
                {history.map((h) => (
                  <li key={h.attemptId}>
                    <Link
                      href={`/student/exams/${h.assessmentId}/result?attempt=${h.attemptId}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5 transition-colors hover:bg-muted/5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{h.title}</span>
                        <span className="block text-xs text-muted">
                          {h.type === "EXAM" ? "Exam" : "Quiz"} · Attempt {h.attemptNumber} ·{" "}
                          {formatDate(h.submittedAt ?? h.startedAt)}
                        </span>
                      </span>
                      {h.resultsVisible && h.percentage !== null ? (
                        <span className="flex items-center gap-2 text-sm">
                          <span className="font-semibold tabular-nums text-foreground">{h.percentage}%</span>
                          {h.passed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" aria-hidden /> Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger-subtle px-2 py-0.5 text-xs font-medium text-danger">
                              <XCircle className="h-3 w-3" aria-hidden /> Not Passed
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">Submitted</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </section>

      <p className="mt-6 flex items-center gap-2 text-xs text-muted">
        <BookOpenCheck className="h-3.5 w-3.5" aria-hidden />
        Practice exercises live inside each lesson — this page is only for quizzes and exams.
      </p>
    </div>
  );
}

function Pill({ tone, children }: { tone: "primary" | "neutral" | "warning"; children: React.ReactNode }) {
  const styles = {
    primary: "border-primary/25 bg-primary-subtle text-primary",
    neutral: "border-border bg-muted/10 text-foreground",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 ${styles}`}
    >
      {children}
    </span>
  );
}
