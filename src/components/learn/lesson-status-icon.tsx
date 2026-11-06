import { CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressStatus } from "@/lib/constants";

/**
 * Lesson completion status icon — always paired with visually-hidden text so
 * status is never communicated by color or icon alone.
 */
export function LessonStatusIcon({ status, className }: { status: ProgressStatus; className?: string }) {
  if (status === "COMPLETED") {
    return (
      <>
        <CheckCircle2 className={cn("h-5 w-5 shrink-0 text-emerald-600", className)} aria-hidden />
        <span className="sr-only">(completed)</span>
      </>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <>
        <PlayCircle className={cn("h-5 w-5 shrink-0 text-primary", className)} aria-hidden />
        <span className="sr-only">(in progress)</span>
      </>
    );
  }
  return (
    <>
      <Circle className={cn("h-5 w-5 shrink-0 text-muted/60", className)} aria-hidden />
      <span className="sr-only">(not started)</span>
    </>
  );
}

/** Short text badge for statuses, e.g. in lists where space is tight. */
export function LessonStatusText({ status }: { status: ProgressStatus }) {
  const labels = { NOT_STARTED: "Not started", IN_PROGRESS: "In progress", COMPLETED: "Completed" };
  return <span className="text-xs text-muted">{labels[status]}</span>;
}
