import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedbackState = {
  isCorrect: boolean | null;
  correctText: string | null;
  explanation: string | null;
};

/**
 * Immediate feedback banner. Correctness is communicated with icon + text
 * (never color alone), announced politely to screen readers, and uses calm,
 * beginner-friendly language.
 */
export function FeedbackBanner({ feedback }: { feedback: FeedbackState }) {
  if (feedback.isCorrect === null) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-3"
      >
        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-sky-900">Practiced!</p>
          {feedback.explanation && <p className="mt-0.5 text-[13px] text-sky-800">{feedback.explanation}</p>}
        </div>
      </div>
    );
  }

  const correct = feedback.isCorrect;
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3",
        correct ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
      )}
    >
      {correct ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden />
      )}
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", correct ? "text-emerald-900" : "text-rose-900")}>
          {correct ? "✓ Correct!" : "✗ Not quite."}
        </p>
        {!correct && feedback.correctText && (
          <p className="mt-0.5 text-[13px] text-rose-800">
            The correct answer is: <span className="font-semibold" dir="auto">{feedback.correctText}</span>
          </p>
        )}
        {feedback.explanation && (
          <p className={cn("mt-0.5 text-[13px]", correct ? "text-emerald-800" : "text-rose-800")}>
            {feedback.explanation}
          </p>
        )}
      </div>
    </div>
  );
}
