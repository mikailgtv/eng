import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PracticeSummaryProps {
  total: number;
  correct: number;
  wrongCount: number;
  scorePercent: number | null;
  reviewOpen: boolean;
  onToggleReview: () => void;
  onTryAgain: () => void;
  nextLessonHref: string | null;
}

/**
 * End-of-practice summary. Clearly labelled "Practice Score" — this is NOT a
 * formal exam result. Buttons: Review Mistakes, Try Again, Continue Lesson.
 */
export function PracticeSummary({
  total,
  correct,
  wrongCount,
  scorePercent,
  reviewOpen,
  onToggleReview,
  onTryAgain,
  nextLessonHref,
}: PracticeSummaryProps) {
  const needsReview = wrongCount;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5" role="status">
      <div className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">Practice complete</h3>
          <p className="text-[13px] text-muted">
            This is your <span className="font-semibold text-foreground">Practice Score</span> — a way to see how
            you are doing, not an exam.
          </p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-muted/5 px-2 py-3">
          <dt className="text-xs text-muted">Correct</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
            {correct} / {total}
          </dd>
        </div>
        {scorePercent !== null && (
          <div className="rounded-xl bg-muted/5 px-2 py-3">
            <dt className="text-xs text-muted">Score</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-primary">{scorePercent}%</dd>
          </div>
        )}
        <div className="rounded-xl bg-muted/5 px-2 py-3">
          <dt className="text-xs text-muted">Needs review</dt>
          <dd className={needsReview > 0 ? "mt-0.5 text-lg font-semibold tabular-nums text-rose-600" : "mt-0.5 text-lg font-semibold tabular-nums text-emerald-600"}>
            {needsReview}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {needsReview > 0 && (
          <Button variant="secondary" onClick={onToggleReview} aria-expanded={reviewOpen} className="min-h-11">
            {reviewOpen ? "Hide mistakes" : "Review mistakes"}
          </Button>
        )}
        {needsReview > 0 && (
          <Button variant="ghost" onClick={onTryAgain} className="min-h-11">
            Try again
          </Button>
        )}
        {nextLessonHref ? (
          <Link href={nextLessonHref} className="sm:ml-auto">
            <Button className="min-h-11 w-full sm:w-auto">
              Continue lesson <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        ) : (
          <p className="text-[13px] text-muted sm:ml-auto sm:self-center">
            🎉 That was the last exercise in this lesson.
          </p>
        )}
      </div>
    </div>
  );
}
