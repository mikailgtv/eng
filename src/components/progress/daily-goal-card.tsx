"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Target, Settings2 } from "lucide-react";

type GoalType = "LESSONS" | "REVIEW_CARDS" | "ACTIVITIES";
type Goal = { type: GoalType; value: number; enabled: boolean };
type Progress = { type: GoalType; target: number; completed: number; remaining: number; percent: number; enabled: boolean; dayKey: string };

const TYPE_LABEL: Record<GoalType, string> = {
  LESSONS: "lessons",
  REVIEW_CARDS: "review cards",
  ACTIVITIES: "practice activities",
};

const TYPE_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "LESSONS", label: "Lessons" },
  { value: "REVIEW_CARDS", label: "Review cards" },
  { value: "ACTIVITIES", label: "Activities" },
];

const VALUE_OPTIONS: Record<GoalType, number[]> = {
  LESSONS: [1, 2, 3],
  REVIEW_CARDS: [5, 10, 15, 20],
  ACTIVITIES: [3, 5, 10],
};

export function DailyGoalCard({ initialGoal, initialProgress }: { initialGoal: Goal; initialProgress: Progress }) {
  const [goal, setGoal] = useState<Goal>(initialGoal);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [editing, setEditing] = useState(false);
  const [draftType, setDraftType] = useState<GoalType>(initialGoal.type);
  const [draftValue, setDraftValue] = useState<number>(initialGoal.value);
  const [draftEnabled, setDraftEnabled] = useState<boolean>(initialGoal.enabled);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/student/daily-goal", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: draftType, value: draftValue, enabled: draftEnabled }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error?.message || "Could not save goal.");
        const g = json.data.goal as Goal;
        const p = json.data.progress as Progress;
        setGoal(g);
        setProgress(p);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save.");
      }
    });
  };

  return (
    <Card data-testid="daily-goal-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-indigo-600" aria-hidden /> Daily goal
        </CardTitle>
        <span className="text-xs text-muted">UTC day · updates from real activity</span>
      </CardHeader>
      <CardBody>
        {!editing ? (
          <>
            {goal.enabled ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{progress.completed}</span> of{" "}
                    <span className="font-semibold">{progress.target}</span> {TYPE_LABEL[progress.type]} today
                    {progress.remaining > 0 ? (
                      <span className="text-muted"> · {progress.remaining} remaining</span>
                    ) : (
                      <span className="ml-1 inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" aria-hidden /> Completed!
                      </span>
                    )}
                  </p>
                  <span className="text-xs tabular-nums text-muted">{progress.percent}%</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent} aria-label={`Daily goal progress ${progress.completed} of ${progress.target} ${TYPE_LABEL[progress.type]}`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all" style={{ width: `${progress.percent}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted">
                  Goal: <span className="font-medium text-foreground">{progress.target} {TYPE_LABEL[progress.type]} per day</span> · counted from completed lessons, review cards or practice activities with UTC day boundaries. Disabled goals keep all history.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">Daily goal is paused. Your activity history is still saved. Enable a goal to track progress.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="md" variant="secondary" onClick={() => setEditing(true)} className="min-h-11">
                <Settings2 className="h-4 w-4" aria-hidden /> Change goal
              </Button>
              {!goal.enabled && (
                <Button
                  size="md"
                  onClick={() => {
                    setDraftEnabled(true);
                    setDraftType(goal.type);
                    setDraftValue(goal.value);
                    // immediate save via API with enabled true
                    startTransition(async () => {
                      const res = await fetch("/api/student/daily-goal", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: goal.type, value: goal.value, enabled: true }),
                      });
                      const json = await res.json();
                      if (res.ok && json.success) {
                        setGoal(json.data.goal);
                        setProgress(json.data.progress);
                      }
                    });
                  }}
                  className="min-h-11"
                >
                  Enable goal
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground">Choose a daily target</legend>
              <p className="text-xs text-muted">Only lessons, review cards and practice activities can be tracked honestly. Minutes from page-open time are not counted.</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Goal type">
                {TYPE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={draftType === o.value}
                    onClick={() => {
                      setDraftType(o.value);
                      const opts = VALUE_OPTIONS[o.value];
                      if (!opts.includes(draftValue)) setDraftValue(opts[0]!);
                    }}
                    className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${draftType === o.value ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-border bg-white text-foreground hover:bg-muted/5"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor="goal-value">
                  How many per day?
                </label>
                <div className="flex flex-wrap gap-2" id="goal-value">
                  {VALUE_OPTIONS[draftType].map((v) => (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={draftValue === v}
                      onClick={() => setDraftValue(v)}
                      className={`min-h-11 min-w-11 rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${draftValue === v ? "bg-indigo-600 text-white" : "border border-border bg-white text-foreground hover:bg-muted/5"}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-2">
                <input
                  type="checkbox"
                  checked={draftEnabled}
                  onChange={(e) => setDraftEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-foreground">Goal enabled</span>
                <span className="text-xs text-muted">Paused goals keep history</span>
              </label>
            </fieldset>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="md" onClick={save} loading={isPending} className="min-h-11">
                Save goal
              </Button>
              <Button size="md" variant="secondary" onClick={() => setEditing(false)} className="min-h-11">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
