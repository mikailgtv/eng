"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CountdownTimer } from "@/components/assessment/countdown-timer";
import { AudioPlayer } from "@/components/practice/audio-player";
import { apiFetch, ApiClientError } from "@/lib/client-api";
import { cn } from "@/lib/utils";

export interface RunnerQuestion {
  id: string;
  number: number;
  type: string;
  points: number;
  questionText: string;
  skill: string | null;
  config: Record<string, unknown>;
  options: { id: string; text: string }[];
  answered: boolean;
}

interface RunnerState {
  attempt: {
    id: string;
    attemptNumber: number;
    status: string;
    deadlineAt: string | null;
    serverNow: string;
  };
  questions: RunnerQuestion[];
  answers: Record<string, unknown>;
}

type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * The assessment runner (quiz/exam). Server-authoritative: the deadline comes
 * from the attempt row, answers are saved progressively to the API, and the
 * final submission is graded server-side. Refreshing restores everything.
 */
export function ExamRunner({
  assessmentId,
  title,
  type,
  allowNavigation,
  initialState,
}: {
  assessmentId: string;
  title: string;
  type: string;
  allowNavigation: boolean;
  initialState: RunnerState;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialState.answers);
  const [current, setCurrent] = useState(0);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [syncError, setSyncError] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const submittingRef = useRef(false);

  const questions = initialState.questions;
  const attemptId = initialState.attempt.id;
  const q = questions[current];

  /* ---------------------------- answer saving ---------------------------- */
  const pendingRef = useRef(new Map<string, unknown>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const flushSave = useCallback(
    async (questionId: string) => {
      const payload = pendingRef.current.get(questionId);
      if (payload === undefined) return;
      setSaveStates((s) => ({ ...s, [questionId]: "saving" }));
      try {
        await apiFetch(`/api/assessments/${assessmentId}/attempts/${attemptId}/answer`, {
          method: "POST",
          body: { questionId, answer: payload },
        });
        pendingRef.current.delete(questionId);
        setSaveStates((s) => ({ ...s, [questionId]: "saved" }));
        setSyncError(false);
      } catch {
        setSaveStates((s) => ({ ...s, [questionId]: "error" }));
        setSyncError(true);
      }
    },
    [assessmentId, attemptId]
  );

  // Retry failed saves periodically — answers are never silently lost.
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (finished) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [finished]);

  useEffect(() => {
    function logIntegrity(kind: string) {
      if (finished) return;
      void apiFetch(`/api/assessments/attempts/${attemptId}/integrity`, {
        method: "POST",
        body: { kind },
      }).catch(() => undefined);
    }

    function onVisibility() {
      if (document.hidden) logIntegrity("TAB_HIDDEN");
    }
    function onBlur() {
      logIntegrity("FOCUS_LOST");
    }
    function onOnline() {
      logIntegrity("RECONNECT");
      for (const qid of pendingRef.current.keys()) void flushSave(qid);
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("online", onOnline);
    };
  }, [attemptId, finished, flushSave]);

  const setAnswer = useCallback(
    (questionId: string, answer: unknown) => {
      setAnswers((prev) => ({ ...prev, [questionId]: answer }));
      pendingRef.current.set(questionId, answer);
      setSaveStates((s) => ({ ...s, [questionId]: "saving" }));
      const existing = timersRef.current.get(questionId);
      if (existing) clearTimeout(existing);
      timersRef.current.set(
        questionId,
        setTimeout(() => void flushSave(questionId), 500)
      );
    },
    [flushSave]
  );

  // Make sure every pending save reaches the server before submitting.
  const flushAll = useCallback(async () => {
    const ids = [...pendingRef.current.keys()];
    await Promise.all(ids.map((id) => flushSave(id)));
  }, [flushSave]);

  /* ------------------------------ submission ------------------------------ */

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        await flushAll();
        await apiFetch(`/api/assessments/${assessmentId}/attempts/${attemptId}/submit`, { method: "POST" });
        setFinished(true);
        router.push(`/student/exams/${assessmentId}/result?attempt=${attemptId}`);
      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);
        if (err instanceof ApiClientError && (err.status === 409 || err.status === 422)) {
          // Already submitted / expired server-side → go to the result.
          router.push(`/student/exams/${assessmentId}/result?attempt=${attemptId}`);
        } else if (!auto) {
          setSubmitOpen(false);
          setSyncError(true);
        }
      }
    },
    [assessmentId, attemptId, flushAll, router]
  );

  const onExpire = useCallback(() => void doSubmit(true), [doSubmit]);

  /* ------------------------------ navigation ------------------------------ */

  const answeredCount = useMemo(() => questions.filter((x) => hasAnswer(x, answers[x.id])).length, [questions, answers]);

  if (finished) {
    return <p className="py-16 text-center text-sm text-muted">Submitting…</p>;
  }

  const canJump = allowNavigation;
  const saveState = q ? saveStates[q.id] ?? "idle" : "idle";

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Sticky header: title, timer, progress */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="text-xs text-muted">
              {type === "EXAM" ? "Exam" : "Quiz"} · Attempt {initialState.attempt.attemptNumber} · Answered{" "}
              <span className="font-semibold tabular-nums">{answeredCount}</span>/{questions.length}
            </p>
          </div>
          {initialState.attempt.deadlineAt && (
            <CountdownTimer
              deadlineAt={initialState.attempt.deadlineAt}
              serverNow={initialState.attempt.serverNow}
              onExpire={onExpire}
            />
          )}
        </div>
      </div>

      {syncError && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Some answers are not saved yet — check your connection. Your answers are kept and will retry automatically.</p>
        </div>
      )}

      {/* Question navigator */}
      <nav aria-label="Question navigation" className="mb-6 flex flex-wrap items-center gap-1.5">
        {questions.map((item, i) => {
          const isCurrent = i === current;
          const done = hasAnswer(item, answers[item.id]);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => (canJump || Math.abs(i - current) <= 1 ? setCurrent(i) : undefined)}
              disabled={!canJump && Math.abs(i - current) > 1}
              aria-label={`Question ${item.number}, ${done ? "answered" : "not answered"}${isCurrent ? ", current" : ""}`}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex h-11 min-w-11 items-center justify-center gap-0.5 rounded-lg border px-2 text-sm font-medium tabular-nums transition-colors",
                isCurrent
                  ? "border-primary bg-primary text-white"
                  : done
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-border bg-surface text-muted hover:bg-muted/10",
                !canJump && Math.abs(i - current) > 1 && "opacity-40"
              )}
            >
              {item.number}
              {done && <Check className="h-3 w-3" aria-hidden />}
            </button>
          );
        })}
      </nav>

      {/* Current question */}
      {q && (
        <article aria-label={`Question ${q.number} of ${questions.length}`} className="rounded-2xl border border-border bg-surface p-5 shadow-card sm:p-6">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Question {q.number} of {questions.length} · {q.points} point{q.points === 1 ? "" : "s"}
            </p>
            <span aria-live="polite" className="text-xs text-muted">
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved ✓"}
              {saveState === "error" && "Not saved"}
            </span>
          </div>
          <h2 className="text-[17px] font-semibold leading-7 text-foreground" dir="auto">
            {q.questionText}
          </h2>

          <div className="mt-5">
            <QuestionInput question={q} value={answers[q.id]} onChange={(a) => setAnswer(q.id, a)} disabled={false} />
          </div>
        </article>
      )}

      {/* Prev / next + submit */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="secondary"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Previous
        </Button>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>
            Next <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button onClick={() => setSubmitOpen(true)} variant="primary">
            <Send className="h-4 w-4" aria-hidden /> Submit
          </Button>
        )}
      </div>

      {/* Always-available submit on long exams */}
      {questions.length > 1 && current < questions.length - 1 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setSubmitOpen(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-[13px] font-medium text-primary hover:underline"
          >
            Submit now
          </button>
        </div>
      )}

      {/* Pre-submission review */}
      <Dialog
        open={submitOpen}
        onClose={submitting ? () => undefined : () => setSubmitOpen(false)}
        title="Submit your answers?"
        dismissible={!submitting}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSubmitOpen(false)}
              disabled={submitting}
              className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-muted/10 disabled:opacity-55"
            >
              Keep working
            </button>
            <Button onClick={() => void doSubmit(false)} loading={submitting}>
              {submitting ? "Submitting…" : "Submit final answers"}
            </Button>
          </>
        }
      >
        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted">Answered:</dt>
            <dd className="font-semibold tabular-nums text-foreground">
              {answeredCount} / {questions.length}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">Unanswered:</dt>
            <dd className={cn("font-semibold tabular-nums", questions.length - answeredCount > 0 ? "text-danger" : "text-foreground")}>
              {questions.length - answeredCount}
            </dd>
          </div>
        </dl>
        {questions.length - answeredCount > 0 && (
          <p className="mt-3 rounded-lg bg-danger-subtle px-3 py-2 text-[13px] text-danger">
            Unanswered questions are marked incorrect. You can go back before submitting.
          </p>
        )}
        <p className="mt-3 text-[13px] text-muted">Once submitted, you cannot change your answers.</p>
      </Dialog>
    </div>
  );
}

/* ------------------------------ input renderers ------------------------------ */

function hasAnswer(q: RunnerQuestion, value: unknown): boolean {
  if (value === undefined || value === null) return false;
  switch (q.type) {
    case "MULTIPLE_CHOICE":
    case "LISTENING":
      return typeof (value as { optionId?: string })?.optionId === "string";
    case "TRUE_FALSE":
      return typeof (value as { value?: boolean })?.value === "boolean";
    case "FILL_BLANK":
      return String((value as { text?: string })?.text ?? "").trim().length > 0;
    case "WORD_ORDER":
      return ((value as { order?: string[] })?.order?.length ?? 0) === ((q.config.tokens as string[]) ?? []).length;
    case "MATCHING": {
      const lefts = (q.config.lefts as string[]) ?? [];
      return ((value as { pairs?: unknown[] })?.pairs?.length ?? 0) >= lefts.length && lefts.length > 0;
    }
    default:
      return String((value as { text?: string })?.text ?? "").trim().length > 0;
  }
}

function QuestionInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: RunnerQuestion;
  value: unknown;
  onChange: (answer: unknown) => void;
  disabled: boolean;
}) {
  switch (question.type) {
    case "MULTIPLE_CHOICE":
    case "LISTENING":
      return <ChoiceInput question={question} value={value} onChange={onChange} disabled={disabled} />;
    case "TRUE_FALSE":
      return <TrueFalseInput value={value} onChange={onChange} disabled={disabled} />;
    case "FILL_BLANK":
      return <FillInput value={value} onChange={onChange} disabled={disabled} />;
    case "WORD_ORDER":
      return <WordOrderInput question={question} value={value} onChange={onChange} disabled={disabled} />;
    case "MATCHING":
      return <MatchingInput question={question} value={value} onChange={onChange} disabled={disabled} />;
    case "WRITING":
      return <WritingInput value={value} onChange={onChange} disabled={disabled} />;
    case "SPEAKING":
      return <SpeakingInput value={value} onChange={onChange} disabled={disabled} />;
    default:
      return (
        <ManualNotice />
      );
  }
}

function WritingInput({ value, onChange, disabled }: { value: unknown; onChange: (a: unknown) => void; disabled: boolean }) {
  const text = ((value as { text?: string } | undefined)?.text) ?? "";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <div className="space-y-2">
      <label htmlFor="writing-response" className="text-xs font-medium text-muted">
        Write your response below. Word count: <span className="font-semibold text-foreground tabular-nums">{words}</span> words ({text.length} chars).
      </label>
      <textarea
        id="writing-response"
        rows={6}
        disabled={disabled}
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Type your answer here..."
        className="w-full rounded-xl border border-border bg-surface p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <p className="text-[12px] text-muted">Drafts save automatically. This writing submission will be reviewed using an official rubric.</p>
    </div>
  );
}

function SpeakingInput({ value, onChange, disabled }: { value: unknown; onChange: (a: unknown) => void; disabled: boolean }) {
  const text = ((value as { text?: string } | undefined)?.text) ?? "";
  return (
    <div className="space-y-2">
      <label htmlFor="speaking-response" className="text-xs font-medium text-muted">
        Speaking response / transcript
      </label>
      <textarea
        id="speaking-response"
        rows={4}
        disabled={disabled}
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder="Type or confirm your spoken response transcript..."
        className="w-full rounded-xl border border-border bg-surface p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <p className="text-[12px] text-muted">Speech evaluation is completed by your teacher using official rubrics. Speech recognition data is strictly distinct from teacher grading.</p>
    </div>
  );
}

function ChoiceInput({ question, value, onChange, disabled }: { question: RunnerQuestion; value: unknown; onChange: (a: unknown) => void; disabled: boolean }) {
  const selected = (value as { optionId?: string } | undefined)?.optionId ?? null;
  const audioUrl = question.config.audioUrl as string | undefined;
  const groupName = `q-${question.id}`;
  return (
    <div>
      {audioUrl && (
        <div className="mb-4 rounded-xl border border-border bg-background p-3">
          <AudioPlayer src={audioUrl} label="Listen to the audio" compact={false} />
        </div>
      )}
      <div role="radiogroup" aria-label="Answer options" className="space-y-2">
        {question.options.map((opt) => {
          const checked = selected === opt.id;
          return (
            <label
              key={opt.id}
              className={cn(
                "flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50",
                checked ? "border-primary bg-primary-subtle/60" : "border-border bg-surface hover:bg-muted/5"
              )}
            >
              <input
                type="radio"
                name={groupName}
                className="sr-only"
                checked={checked}
                disabled={disabled}
                onChange={() => onChange({ optionId: opt.id })}
              />
              <span
                aria-hidden
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                  checked ? "border-primary" : "border-muted/50"
                )}
              >
                {checked && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
              </span>
              <span dir="auto">{opt.text}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function TrueFalseInput({ value, onChange, disabled }: { value: unknown; onChange: (a: unknown) => void; disabled: boolean }) {
  const selected = (value as { value?: boolean } | undefined)?.value;
  return (
    <div role="radiogroup" aria-label="True or false" className="flex gap-3">
      {[
        { label: "True", v: true },
        { label: "False", v: false },
      ].map((opt) => {
        const checked = selected === opt.v;
        return (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange({ value: opt.v })}
            className={cn(
              "min-h-12 flex-1 rounded-xl border px-4 py-3 text-[15px] font-medium transition-colors",
              checked ? "border-primary bg-primary-subtle/60 text-primary" : "border-border bg-surface text-foreground hover:bg-muted/5"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function FillInput({ value, onChange, disabled }: { value: unknown; onChange: (a: unknown) => void; disabled: boolean }) {
  const text = (value as { text?: string } | undefined)?.text ?? "";
  return (
    <div>
      <label htmlFor="fill-answer" className="mb-1.5 block text-[13px] font-medium text-muted">
        Type your answer
      </label>
      <input
        id="fill-answer"
        type="text"
        autoCapitalize="off"
        autoComplete="off"
        inputMode="text"
        dir="auto"
        disabled={disabled}
        value={text}
        onChange={(e) => onChange({ text: e.target.value })}
        className="min-h-12 w-full max-w-md rounded-xl border border-border bg-surface px-4 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  );
}

function WordOrderInput({ question, value, onChange, disabled }: { question: RunnerQuestion; value: unknown; onChange: (a: unknown) => void; disabled: boolean }) {
  const tokens = (question.config.tokens as string[]) ?? [];
  const order = useMemo(() => (value as { order?: string[] } | undefined)?.order ?? [], [value]);
  const usedCount = (t: string) => order.filter((x) => x === t).length;
  const availableCount = (t: string) => tokens.filter((x) => x === t).length;

  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-muted">Tap the words in the correct order</p>
      <div
        aria-label="Your sentence"
        className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-border p-2.5"
      >
        {order.length === 0 && <span className="px-1 text-sm text-muted">Tap words below to build the sentence…</span>}
        {order.map((t, i) => (
          <button
            key={`${t}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => {
              const next = [...order];
              next.splice(order.lastIndexOf(t), 1);
              onChange({ order: next });
            }}
            aria-label={`Remove word ${t}`}
            className="inline-flex min-h-10 max-w-full items-center gap-1 break-words rounded-lg border border-primary/40 bg-primary-subtle/60 px-3 py-2 text-[15px] font-medium text-foreground"
          >
            {t} <X className="h-3 w-3 text-muted" aria-hidden />
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Available words">
        {tokens.map((t, i) => {
          const usable = usedCount(t) < availableCount(t);
          return (
            <button
              key={`${t}-${i}`}
              type="button"
              disabled={disabled || !usable}
              onClick={() => onChange({ order: [...order, t] })}
              aria-label={`Add word ${t}`}
              className={cn(
                "inline-flex min-h-10 max-w-full items-center break-words rounded-lg border px-3 py-2 text-[15px] font-medium shadow-sm transition-colors",
                usable ? "border-border bg-surface hover:bg-primary-subtle/40" : "border-border/50 bg-muted/10 text-muted opacity-50"
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchingInput({ question, value, onChange, disabled }: { question: RunnerQuestion; value: unknown; onChange: (a: unknown) => void; disabled: boolean }) {
  const lefts = (question.config.lefts as string[]) ?? [];
  const rights = (question.config.rights as string[]) ?? [];
  const pairs = (value as { pairs?: { left: string; right: string }[] } | undefined)?.pairs ?? [];
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const rightByLeft = new Map(pairs.map((p) => [p.left, p.right]));
  const usedRights = new Set(pairs.map((p) => p.right));

  function tapLeft(left: string) {
    if (disabled) return;
    if (rightByLeft.has(left)) {
      // undo pairing
      onChange({ pairs: pairs.filter((p) => p.left !== left) });
      setSelectedLeft(null);
    } else {
      setSelectedLeft(selectedLeft === left ? null : left);
    }
  }
  function tapRight(right: string) {
    if (disabled || !selectedLeft) return;
    onChange({ pairs: [...pairs.filter((p) => p.left !== selectedLeft), { left: selectedLeft, right }] });
    setSelectedLeft(null);
  }

  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-muted">
        Tap an item on the left, then its pair on the right. Tap a pair to undo it.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div role="group" aria-label="Left column" className="space-y-2">
          {lefts.map((left) => {
            const paired = rightByLeft.get(left);
            const active = selectedLeft === left;
            return (
              <button
                key={left}
                type="button"
                disabled={disabled}
                onClick={() => tapLeft(left)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[15px] font-medium transition-colors",
                  active
                    ? "border-primary bg-primary-subtle/60 ring-2 ring-primary/40"
                    : paired
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-border bg-surface hover:bg-muted/5"
                )}
              >
                <span className="min-w-0 flex-1 break-words" dir="auto">
                  {left}
                </span>
                {paired && (
                  <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-800" dir="auto">
                    {paired}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="Right column" className="space-y-2">
          {rights.map((right) => {
            const used = usedRights.has(right);
            return (
              <button
                key={right}
                type="button"
                disabled={disabled || !selectedLeft}
                onClick={() => tapRight(right)}
                className={cn(
                  "flex min-h-12 w-full items-center rounded-xl border px-3 py-2.5 text-left text-[15px] transition-colors",
                  used
                    ? "border-border/50 bg-muted/10 text-muted"
                    : "border-border bg-surface hover:bg-primary-subtle/40 disabled:opacity-50"
                )}
              >
                <span className="min-w-0 flex-1 break-words" dir="auto">
                  {right}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-[13px] text-muted">
        {lefts.length - pairs.length} pair{lefts.length - pairs.length === 1 ? "" : "s"} left
      </p>
    </div>
  );
}

function ManualNotice() {
  return (
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
      This question type is graded by a teacher later. Do your best — it will not count into your automatic score yet.
    </p>
  );
}
