import { CheckCircle2, Clock3, ListChecks, Target, TrendingUp, XCircle } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { AssessmentResult } from "@/lib/assessment/queries";

/**
 * Result screen — ✓ Passed / ✗ Not Passed (icon + text, never color alone),
 * real numbers only, review + mistake analysis when the assessment allows it.
 */
export function ResultView({ result, typeLabel }: { result: AssessmentResult; typeLabel: string }) {
  if (!result.resultsVisible) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm font-medium text-foreground">Submitted — thank you!</p>
          <p className="mt-1 text-[13px] text-muted">
            Your {typeLabel.toLowerCase()} was submitted successfully. Your teacher will share the results.
          </p>
        </CardBody>
      </Card>
    );
  }

  const passed = result.passed === true;
  const failed = result.passed === false;

  return (
    <div className="space-y-6">
      {/* Score card */}
      <Card>
        <CardBody>
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            {passed && (
              <>
                <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden />
                <p className="text-lg font-semibold text-emerald-800">✓ Passed</p>
              </>
            )}
            {failed && (
              <>
                <XCircle className="h-10 w-10 text-danger" aria-hidden />
                <p className="text-lg font-semibold text-danger">✗ Not Passed</p>
              </>
            )}
            {!passed && !failed && (
              <p className="text-lg font-semibold text-foreground">Submitted</p>
            )}
            <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">
              {result.percentage !== null ? `${result.percentage}%` : "—"}
            </p>
            <p className="text-[13px] text-muted">
              {result.score ?? 0} / {result.totalPoints ?? 0} points · Passing score: {result.passingScore}%
            </p>
            {result.autoSubmitted && (
              <p className="mt-1 rounded-lg bg-amber-50 px-3 py-1.5 text-[13px] text-amber-900">
                {result.status === "EXPIRED"
                  ? "Time ran out — the server submitted your attempt automatically with your saved answers."
                  : "This attempt was closed and submitted automatically with your saved answers."}
              </p>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Clock3} label="Time used" value={result.timeSpentSec ? formatDuration(result.timeSpentSec) : "—"} />
            <Stat icon={ListChecks} label="Answered" value={`${result.answeredCount} / ${result.questionCount}`} />
            <Stat icon={CheckCircle2} label="Correct" value={String(result.correctCount)} />
            <Stat icon={XCircle} label="Incorrect" value={String(result.incorrectCount)} />
          </dl>
          <p className="mt-3 text-center text-xs text-muted">
            Submitted {formatDateTime(result.submittedAt)} · Attempt {result.attemptNumber}
          </p>
        </CardBody>
      </Card>

      {/* Skill performance — descriptive only */}
      {result.skillPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by skill</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted/70" aria-hidden />
          </CardHeader>
          <CardBody>
            <dl className="space-y-3">
              {result.skillPerformance.map((s) => (
                <div key={s.skill}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <dt className="font-medium text-foreground">{s.skill}</dt>
                    <dd className="tabular-nums text-muted">
                      {s.percent}% <span className="text-xs">({s.correct}/{s.total})</span>
                    </dd>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted/15">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, s.percent)}%` }}
                    />
                  </div>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted">A simple picture of how the questions went — not a measure of ability.</p>
          </CardBody>
        </Card>
      )}

      {/* Mistake analysis — learning aid */}
      {result.mistakes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Needs review</CardTitle>
            <Target className="h-4 w-4 text-muted/70" aria-hidden />
          </CardHeader>
          <CardBody>
            <ul className="flex flex-wrap gap-2">
              {result.mistakes.map((m) => (
                <li
                  key={m.label}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[13px] font-medium text-amber-900"
                >
                  {m.label} · {m.count} incorrect
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Topics from the questions you missed — good places to practice again.</p>
          </CardBody>
        </Card>
      )}

      {/* Question review (when enabled) */}
      {result.reviewAllowed && result.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Question review</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-border">
              {result.questions.map((q) => (
                <li key={q.questionId} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    {q.pendingManual ? (
                      <span className="mt-0.5 shrink-0 rounded-md bg-sky-50 px-1.5 py-0.5 text-xs font-semibold text-sky-800">
                        Review
                      </span>
                    ) : q.isCorrect ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground" dir="auto">
                        {q.number}. {q.questionText}
                      </p>
                      <dl className="mt-2 space-y-1 text-[13px]">
                        <div>
                          <dt className="sr-only">Your answer</dt>
                          <dd className="text-muted">
                            Your answer: <span className="font-medium text-foreground" dir="auto">{q.studentText}</span>
                          </dd>
                        </div>
                        {q.correctText !== null && !q.pendingManual && (
                          <div>
                            <dt className="sr-only">Correct answer</dt>
                            <dd className="text-muted">
                              Correct: <span className="font-medium text-foreground" dir="auto">{q.correctText}</span>
                            </dd>
                          </div>
                        )}
                        {q.pendingManual && (
                          <dd className="text-sky-800">This question is waiting for teacher review.</dd>
                        )}
                        {q.explanation && (
                          <div>
                            <dt className="sr-only">Explanation</dt>
                            <dd className="text-muted" dir="auto">{q.explanation}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {q.pointsEarned ?? 0}/{q.points}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border px-3 py-3 text-center">
      <dt className="flex items-center justify-center gap-1 text-xs text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
      </dt>
      <dd className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m} min ${s}s` : `${s}s`;
}
