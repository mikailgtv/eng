"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import type { ProgressStatus } from "@/lib/constants";

interface LessonCompleteButtonProps {
  lessonId: string;
  initialStatus: ProgressStatus;
  /** Server-computed completion-rule state (required activities not yet done). */
  requiredRemaining: number;
  requiredTotal: number;
  nextHref: string | null;
  nextTitle: string | null;
}

/**
 * "Mark as complete" — writes a REAL progress record. The completion rule is
 * enforced server-side (default: view + required activities attempted); the
 * button reflects the same state in the UI and surfaces a helpful hint when
 * practice is still pending. Time on page is reported best-effort.
 */
export function LessonCompleteButton({
  lessonId,
  initialStatus,
  requiredRemaining,
  requiredTotal,
  nextHref,
  nextTitle,
}: LessonCompleteButtonProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [status, setStatus] = useState<ProgressStatus>(initialStatus);
  const [remaining, setRemaining] = useState(requiredRemaining);
  const [busy, setBusy] = useState(false);
  const mountedAt = useRef(Date.now());

  const alreadyCompleted = status === "COMPLETED";
  const practicePending = remaining > 0;

  const timeSpent = useMemo(
    () => () => Math.round((Date.now() - mountedAt.current) / 1000),
    []
  );

  async function markComplete() {
    setBusy(true);
    try {
      await apiFetch(`/api/lessons/${lessonId}/complete`, {
        method: "POST",
        body: { timeSpentSec: timeSpent() },
      });
      setStatus("COMPLETED");
      notify("success", "Lesson completed. Great job!");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 422) {
        notify("error", "Finish the required practice exercises first — then mark the lesson complete.");
      } else {
        notify("error", err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (alreadyCompleted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-emerald-900">
              Lesson completed <span className="sr-only">(already marked as complete)</span>
            </p>
            {nextHref && <p className="truncate text-[13px] text-emerald-800/80">Next up: {nextTitle}</p>}
          </div>
          {nextHref && (
            <Link href={nextHref}>
              <Button size="sm" className="shrink-0">
                Next lesson <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Finished with this lesson?</p>
          {practicePending ? (
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] text-muted">
              <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
              {remaining} required exercise{remaining === 1 ? "" : "s"} left ({requiredTotal} total) — complete
              {remaining === 1 ? " it" : " them"} above, then mark the lesson done.
            </p>
          ) : (
            <p className="mt-0.5 text-[13px] text-muted">Mark it complete to save your progress.</p>
          )}
        </div>
        <Button size="lg" onClick={markComplete} loading={busy} className="w-full shrink-0 sm:w-auto">
          {busy ? "Saving…" : "Mark as complete"}
        </Button>
      </div>
    </div>
  );
}
