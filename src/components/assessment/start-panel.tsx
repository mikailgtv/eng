"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, CheckCircle2, Clock3, ListChecks, Target, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";

interface StartPanelProps {
  assessmentId: string;
  /** assessment type label: QUIZ or EXAM */
  type: string;
  questionsCount: number;
  durationMinutes: number | null;
  passingScore: number;
  maxAttempts: number | null;
  myAttempts: number;
  activeAttemptId: string | null;
  canStart: boolean;
  blockedReason?: string | null;
}

/**
 * The pre-exam screen: everything the student needs to know, then an explicit
 * confirmation ("Once you start, the exam timer will begin.") before the
 * server creates the attempt and the official clock starts.
 */
export function StartPanel(props: StartPanelProps) {
  const router = useRouter();
  const { notify } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const noun = props.type === "EXAM" ? "exam" : "quiz";

  async function begin() {
    setBusy(true);
    try {
      const attempt = await apiFetch<{ id: string }>(`/api/assessments/${props.assessmentId}/start`, {
        method: "POST",
      });
      router.push(`/student/exams/${props.assessmentId}/take?attempt=${attempt.id}`);
    } catch (err) {
      setBusy(false);
      setConfirming(false);
      notify("error", err instanceof ApiClientError ? err.message : "Could not start. Please try again.");
    }
  }

  return (
    <div>
      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Fact icon={ListChecks} label="Questions" value={String(props.questionsCount)} />
        <Fact
          icon={Clock3}
          label="Time"
          value={props.durationMinutes ? `${props.durationMinutes} min` : "No limit"}
        />
        <Fact icon={Target} label="Passing score" value={`${props.passingScore}%`} />
        <Fact
          icon={Undo2}
          label="Attempts"
          value={props.maxAttempts ? `${props.myAttempts} of ${props.maxAttempts} used` : `${props.myAttempts} used · unlimited`}
        />
      </dl>

      {props.activeAttemptId ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900">You have an attempt in progress.</p>
              <p className="mt-0.5 text-[13px] text-amber-800/90">
                Your timer is still running — continue where you left off.
              </p>
            </div>
            <Button
              onClick={() => router.push(`/student/exams/${props.assessmentId}/take?attempt=${props.activeAttemptId}`)}
              className="shrink-0"
            >
              <AlarmClock className="h-4 w-4" aria-hidden /> Resume {noun}
            </Button>
          </div>
        </div>
      ) : props.canStart ? (
        <>
          <Button size="lg" className="w-full sm:w-auto" onClick={() => setConfirming(true)}>
            Start {noun === "exam" ? "Exam" : "Quiz"}
          </Button>
          <ConfirmDialog
            open={confirming}
            onClose={() => setConfirming(false)}
            onConfirm={begin}
            busy={busy}
            title={`Start this ${noun}?`}
            message="Once you start, the exam timer will begin. Make sure you have enough time before you continue."
            confirmLabel={`Start ${noun === "exam" ? "Exam" : "Quiz"}`}
          />
        </>
      ) : (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
          <p>{props.blockedReason ?? "This assessment is not open for you right now."}</p>
        </div>
      )}
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3.5 py-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
      </dt>
      <dd className="mt-1 text-[15px] font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}
