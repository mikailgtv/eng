"use client";

import { useState } from "react";
import { FeedbackBanner, type FeedbackState } from "@/components/practice/feedback-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChoiceConfig {
  question?: string;
  prompt?: string;
  statement?: string;
  options: { id: string; text: string }[];
}

export interface ChoiceActivityProps {
  promptText: string;
  options: { id: string; text: string }[];
  disabled?: boolean;
  /** Previously submitted answer (refresh persistence). */
  initialOptionId?: string | null;
  initialFeedback?: FeedbackState | null;
  locked?: boolean;
  submitLabel?: string;
  onSubmit: (optionId: string) => Promise<FeedbackState>;
}

/**
 * Shared option-list interaction used by MULTIPLE_CHOICE, TRUE_FALSE,
 * VOCABULARY_RECOGNITION and LISTEN_AND_CHOOSE.
 * The answer is not revealed until submitted; large touch targets; the
 * chosen option is marked with a visible radio indicator.
 */
export function ChoiceActivity({
  promptText,
  options,
  disabled,
  initialOptionId,
  initialFeedback,
  locked,
  submitLabel = "Check answer",
  onSubmit,
}: ChoiceActivityProps) {
  const [selected, setSelected] = useState<string | null>(initialOptionId ?? null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(initialFeedback ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked = Boolean(locked) || feedback?.isCorrect === true;

  async function submit() {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(selected);
      setFeedback(result);
    } catch {
      // Keep the student's selection so they can retry without re-answering.
      setError("Could not save your answer. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-[15px] font-medium leading-7 text-foreground sm:text-base" dir="auto">
        {promptText}
      </p>

      <fieldset className="mt-3.5" disabled={isLocked}>
        <legend className="sr-only">Choose one answer</legend>
        <div className="grid gap-2">
          {options.map((option) => {
            const active = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={isLocked}
                onClick={() => setSelected(option.id)}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  active
                    ? "border-primary bg-primary-subtle/70 text-foreground"
                    : "border-border bg-surface text-foreground hover:bg-muted/10",
                  isLocked && "cursor-default opacity-90"
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-primary" : "border-muted/50"
                  )}
                >
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                </span>
                <span dir="auto" className="min-w-0 flex-1">{option.text}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {!isLocked && (
        <div className="mt-3.5 flex flex-col items-start gap-2">
          <Button onClick={submit} disabled={!selected || disabled} loading={busy} className="min-h-11 w-full sm:w-auto">
            {busy ? "Checking…" : submitLabel}
          </Button>
          {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
        </div>
      )}

      {feedback && (
        <div className="mt-3.5">
          <FeedbackBanner feedback={feedback} />
        </div>
      )}
    </div>
  );
}
