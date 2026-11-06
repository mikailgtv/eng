"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { AudioPlayer } from "@/components/practice/audio-player";
import { ChoiceActivity } from "@/components/practice/choice-activity";
import { FillBlankActivity } from "@/components/practice/fill-blank-activity";
import { WordOrderActivity } from "@/components/practice/word-order-activity";
import { MatchingActivity } from "@/components/practice/matching-activity";
import { ListenTypeActivity } from "@/components/practice/listen-type-activity";
import { SpeakingActivity } from "@/components/practice/speaking-activity";
import { FlashcardActivity } from "@/components/practice/flashcard-activity";
import { PracticeSummary } from "@/components/practice/practice-summary";
import type { FeedbackState } from "@/components/practice/feedback-banner";
import { apiFetch } from "@/lib/client-api";
import type { SanitizedActivity } from "@/lib/activities/check";

export interface RunnerActivityState {
  status: "NOT_ATTEMPTED" | "COMPLETED" | "CORRECT" | "INCORRECT";
  attempts: number;
  lastAnswer: unknown;
}

export interface ActivityRunnerProps {
  activities: SanitizedActivity[];
  initialState: Record<string, RunnerActivityState>;
  /** Link target for "Continue Lesson" once practice is done. */
  nextLessonHref: string | null;
}

type ActivityRuntime = {
  status: "NOT_ATTEMPTED" | "COMPLETED" | "CORRECT" | "INCORRECT";
  feedback: FeedbackState | null;
  /** The most recent submitted answer this session (for mistake review). */
  lastAnswer: unknown;
};

/**
 * The practice session orchestrator: renders each activity with the right
 * interaction, submits attempts to the API (server computes correctness),
 * shows immediate feedback, then a summary with Review Mistakes / Try Again /
 * Continue Lesson. Hydrates from server state so a refresh keeps progress.
 */
export function ActivityRunner({ activities, initialState, nextLessonHref }: ActivityRunnerProps) {
  const router = useRouter();
  const [runtime, setRuntime] = useState<Record<string, ActivityRuntime>>(() => {
    const initial: Record<string, ActivityRuntime> = {};
    for (const a of activities) {
      const s = initialState[a.id];
      initial[a.id] = {
        status: s?.status ?? "NOT_ATTEMPTED",
        feedback: null,
        lastAnswer: s?.lastAnswer ?? null,
      };
    }
    return initial;
  });
  const [reviewOpen, setReviewOpen] = useState(false);

  function update(id: string, patch: Partial<ActivityRuntime>) {
    setRuntime((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  async function submitAnswer(activity: SanitizedActivity, answer: unknown): Promise<FeedbackState> {
    const result = await apiFetch<{ attemptNumber: number; feedback: FeedbackState }>(
      `/api/activities/${activity.id}/attempts`,
      { method: "POST", body: buildPayload(activity.type, answer) }
    );
    update(activity.id, {
      feedback: result.feedback,
      status:
        result.feedback.isCorrect === true
          ? "CORRECT"
          : result.feedback.isCorrect === false
            ? "INCORRECT"
            : "COMPLETED", // self-reported progress only — not scored
      lastAnswer: answer,
    });
    // Refresh server-rendered page state (progress, completion gate) quietly.
    router.refresh();
    return result.feedback;
  }

  async function submitFlashcards(
    activity: SanitizedActivity,
    marks: { word: string; vocabularyId?: string; response: "KNOWN" | "NEED_REVIEW" }[]
  ): Promise<void> {
    await apiFetch(`/api/activities/${activity.id}/attempts`, { method: "POST", body: { marks } });
    update(activity.id, {
      status: "COMPLETED",
      feedback: null,
      lastAnswer: marks,
    });
    router.refresh();
  }

  const summary = useMemo(() => {
    const answered = activities.filter((a) => runtime[a.id]?.status !== "NOT_ATTEMPTED");
    const correct = activities.filter((a) => runtime[a.id]?.status === "CORRECT");
    const wrong = activities.filter((a) => runtime[a.id]?.status === "INCORRECT");
    const selfAssessed = activities.filter((a) => a.type === "SPEAKING_PROMPT" || a.type === "FLASHCARD");
    const scorable = activities.filter((a) => !selfAssessed.includes(a));
    const scorableCorrect = scorable.filter((a) => runtime[a.id]?.status === "CORRECT");
    return {
      total: activities.length,
      correct: correct.length,
      wrong,
      scorePercent: scorable.length === 0 ? null : Math.round((scorableCorrect.length / scorable.length) * 100),
      allDone: activities.length > 0 && answered.length === activities.length,
    };
  }, [activities, runtime]);

  function tryAgain() {
    // Reset only the incorrect ones — already-correct activities stay done.
    setRuntime((prev) => {
      const next = { ...prev };
      for (const a of activities) {
        if (next[a.id]?.status === "INCORRECT") {
          next[a.id] = { ...next[a.id], status: "NOT_ATTEMPTED", feedback: null };
        }
      }
      return next;
    });
    setReviewOpen(false);
  }

  if (activities.length === 0) return null;

  return (
    <div>
      <ol className="space-y-4">
        {activities.map((activity, i) => {
          const rt = runtime[activity.id];
          const locked = rt?.status === "CORRECT" || rt?.status === "COMPLETED";
          const initial = initialState[activity.id];
          return (
            <li key={activity.id}>
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-card sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">
                    Exercise {i + 1} of {activities.length}
                    {activity.required && <span className="ml-2 font-medium normal-case">(needed to finish)</span>}
                  </p>
                  {locked && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      ✓ Done
                    </span>
                  )}
                </div>

                {activity.instructions && <p className="mb-2.5 text-[13px] text-muted">{activity.instructions}</p>}

                <ActivityBody
                  activity={activity}
                  locked={locked}
                  initialAnswer={rt?.status === "NOT_ATTEMPTED" ? initial?.lastAnswer ?? null : rt?.lastAnswer ?? null}
                  onSubmit={(answer) => submitAnswer(activity, answer)}
                  onSubmitFlashcards={(marks) => submitFlashcards(activity, marks)}
                />
              </div>
            </li>
          );
        })}
      </ol>

      {summary.allDone && (
        <div className="mt-6">
          <PracticeSummary
            total={summary.total}
            correct={summary.correct}
            wrongCount={summary.wrong.length}
            scorePercent={summary.scorePercent}
            reviewOpen={reviewOpen}
            onToggleReview={() => setReviewOpen((v) => !v)}
            onTryAgain={tryAgain}
            nextLessonHref={nextLessonHref}
          />
          {reviewOpen && summary.wrong.length > 0 && (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-rose-900">Review your mistakes</h3>
              <ul className="mt-3 space-y-3">
                {summary.wrong.map((activity) => {
                  const rt = runtime[activity.id];
                  const c = activity.config as Record<string, unknown>;
                  const prompt =
                    (c.question as string) ??
                    (c.statement as string) ??
                    (c.sentenceWithBlank as string) ??
                    (c.prompt as string) ??
                    (c.text as string) ??
                    activity.title ??
                    "Exercise";
                  const { studentAnswer } = describeAnswer(activity.type, rt?.lastAnswer);
                  return (
                    <li key={activity.id} className="rounded-xl border border-rose-200 bg-surface px-3.5 py-3">
                      <p className="text-sm font-medium text-foreground" dir="auto">
                        {prompt}
                      </p>
                      <p className="mt-1.5 text-[13px] text-rose-700">
                        ✗ Your answer: <span className="font-medium" dir="auto">{studentAnswer}</span>
                      </p>
                      {rt?.feedback?.correctText && (
                        <p className="mt-0.5 text-[13px] text-emerald-700">
                          ✓ Correct: <span className="font-semibold" dir="auto">{rt.feedback.correctText}</span>
                        </p>
                      )}
                      {rt?.feedback?.explanation && (
                        <p className="mt-1 text-[13px] text-muted">{rt.feedback.explanation}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Human-readable rendering of a raw answer payload for the review panel. */
function describeAnswer(type: string, answer: unknown): { studentAnswer: string } {
  const a = answer as Record<string, unknown> | null;
  if (!a) return { studentAnswer: "—" };
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "VOCABULARY_RECOGNITION":
    case "LISTEN_AND_CHOOSE":
      return { studentAnswer: `Option ${(a.optionId as string) ?? "—"}` };
    case "TRUE_FALSE":
      return { studentAnswer: a.value ? "True" : "False" };
    case "FILL_BLANK":
      return { studentAnswer: String(a.text ?? "—") };
    case "WORD_ORDER":
      return { studentAnswer: ((a.order as string[]) ?? []).join(" ") || "—" };
    case "MATCHING":
      return {
        studentAnswer:
          ((a.pairs as { left: string; right: string }[]) ?? [])
            .map((p) => `${p.left} → ${p.right}`)
            .join(", ") || "—",
      };
    case "LISTEN_AND_TYPE":
      return { studentAnswer: String(a.text ?? "—") };
    default:
      return { studentAnswer: "—" };
  }
}

function ActivityBody({
  activity,
  locked,
  initialAnswer,
  onSubmit,
  onSubmitFlashcards,
}: {
  activity: SanitizedActivity;
  locked: boolean;
  initialAnswer: unknown;
  onSubmit: (answer: unknown) => Promise<FeedbackState>;
  onSubmitFlashcards: (marks: { word: string; vocabularyId?: string; response: "KNOWN" | "NEED_REVIEW" }[]) => Promise<void>;
}) {
  const c = activity.config as Record<string, unknown>;

  switch (activity.type) {
    case "MULTIPLE_CHOICE":
    case "VOCABULARY_RECOGNITION":
    case "LISTEN_AND_CHOOSE": {
      const promptText =
        activity.type === "LISTEN_AND_CHOOSE" ? String(c.question ?? "") : String(c.prompt ?? c.question ?? "");
      const chosen = (initialAnswer as { optionId?: string } | null)?.optionId ?? null;
      return (
        <div>
          {activity.type === "LISTEN_AND_CHOOSE" && typeof c.audioUrl === "string" && (
            <div className="mb-3.5">
              <AudioPlayer src={c.audioUrl} label="Listening audio" />
            </div>
          )}
          <ChoiceActivity
            promptText={promptText}
            options={(c.options as { id: string; text: string }[]) ?? []}
            initialOptionId={chosen}
            locked={locked}
            onSubmit={(optionId) => onSubmit({ optionId })}
          />
        </div>
      );
    }

    case "TRUE_FALSE": {
      const chosen = (initialAnswer as { value?: boolean } | null)?.value;
      return (
        <ChoiceActivity
          promptText={String(c.statement ?? "")}
          options={[
            { id: "true", text: "True — درست" },
            { id: "false", text: "False — نادرست" },
          ]}
          initialOptionId={chosen === undefined || chosen === null ? null : chosen ? "true" : "false"}
          locked={locked}
          onSubmit={(optionId) => onSubmit({ value: optionId === "true" })}
        />
      );
    }

    case "FILL_BLANK":
      return (
        <FillBlankActivity
          sentenceWithBlank={String(c.sentenceWithBlank ?? "")}
          options={(c.options as string[]) ?? undefined}
          initialText={((initialAnswer as { text?: string } | null)?.text) ?? null}
          locked={locked}
          onSubmit={(text) => onSubmit({ text })}
        />
      );

    case "WORD_ORDER":
      return (
        <WordOrderActivity
          tokens={(c.tokens as string[]) ?? []}
          initialOrder={((initialAnswer as { order?: string[] } | null)?.order) ?? null}
          locked={locked}
          onSubmit={(order) => onSubmit({ order })}
        />
      );

    case "MATCHING":
      return (
        <MatchingActivity
          lefts={(c.lefts as string[]) ?? []}
          rights={(c.rights as string[]) ?? []}
          instruction={c.instruction as string | undefined}
          initialPairs={((initialAnswer as { pairs?: { left: string; right: string }[] } | null)?.pairs) ?? null}
          locked={locked}
          onSubmit={(pairs) => onSubmit({ pairs })}
        />
      );

    case "LISTEN_AND_TYPE":
      return (
        <ListenTypeActivity
          audioUrl={(c.audioUrl as string) ?? null}
          initialText={((initialAnswer as { text?: string } | null)?.text) ?? null}
          locked={locked}
          onSubmit={(text) => onSubmit({ text })}
        />
      );

    case "SPEAKING_PROMPT":
      return (
        <SpeakingActivity
          text={String(c.text ?? "")}
          tip={(c.tip as string) ?? null}
          translation={(c.translation as string) ?? null}
          modelAudioUrl={(c.modelAudioUrl as string) ?? null}
          alreadyPracticed={locked}
          onSubmit={() => onSubmit({ selfReported: true }).then(() => undefined)}
        />
      );

    case "FLASHCARD":
      return (
        <FlashcardActivity
          items={(c.items as { vocabularyId?: string; word: string; translation?: string; phonetic?: string; example?: string }[]) ?? []}
          onSubmit={(marks) => onSubmitFlashcards(marks)}
        />
      );

    default:
      return (
        <p role="alert" className="flex items-center gap-2 text-[13px] text-muted">
          <ArrowRight className="h-4 w-4" aria-hidden /> This activity type is not supported yet.
        </p>
      );
  }
}

function buildPayload(type: string, answer: unknown): unknown {
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "VOCABULARY_RECOGNITION":
    case "LISTEN_AND_CHOOSE":
      return { optionId: (answer as { optionId: string }).optionId };
    case "TRUE_FALSE":
      return { value: (answer as { value: boolean }).value };
    case "FILL_BLANK":
      return { text: (answer as { text: string }).text };
    case "WORD_ORDER":
      return { order: (answer as { order: string[] }).order };
    case "MATCHING":
      return { pairs: (answer as { pairs: { left: string; right: string }[] }).pairs };
    case "LISTEN_AND_TYPE":
      return { text: (answer as { text: string }).text };
    case "SPEAKING_PROMPT":
      return { selfReported: true };
    default:
      return answer;
  }
}
