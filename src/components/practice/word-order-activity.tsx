"use client";

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { FeedbackBanner, type FeedbackState } from "@/components/practice/feedback-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface WordOrderActivityProps {
  tokens: string[];
  initialOrder?: string[] | null;
  initialFeedback?: FeedbackState | null;
  locked?: boolean;
  onSubmit: (order: string[]) => Promise<FeedbackState>;
}

/**
 * Word-order exercise built for touch: tap tokens to add them to the answer
 * line, tap an answer token to remove it. No drag-and-drop, comfortable with
 * one hand on a phone. Full keyboard support (tokens are buttons).
 */
export function WordOrderActivity({ tokens, initialOrder, initialFeedback, locked, onSubmit }: WordOrderActivityProps) {
  const [pool, setPool] = useState<string[]>(() => {
    if (initialOrder && initialOrder.length > 0) {
      const remaining = [...tokens];
      for (const used of initialOrder) {
        const idx = remaining.indexOf(used);
        if (idx >= 0) remaining.splice(idx, 1);
      }
      return remaining;
    }
    return tokens;
  });
  const [answer, setAnswer] = useState<string[]>(initialOrder ?? []);
  const [feedback, setFeedback] = useState<FeedbackState | null>(initialFeedback ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLocked = Boolean(locked) || feedback?.isCorrect === true;

  function addToken(token: string, index: number) {
    setPool((p) => p.filter((_, i) => i !== index));
    setAnswer((a) => [...a, token]);
  }

  function removeToken(token: string, index: number) {
    setAnswer((a) => a.filter((_, i) => i !== index));
    setPool((p) => [...p, token]);
  }

  function reset() {
    setPool(tokens);
    setAnswer([]);
    setFeedback(null);
    setError(null);
  }

  async function submit() {
    if (answer.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit(answer);
      setFeedback(result);
    } catch {
      setError("Could not save your answer. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Answer line */}
      <div
        role="group"
        aria-label="Your sentence"
        className={cn(
          "flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed p-2.5",
          isLocked && feedback?.isCorrect === true && "border-emerald-300 bg-emerald-50/50",
          isLocked && feedback?.isCorrect === false && "border-rose-300 bg-rose-50/40",
          !isLocked && "border-border bg-muted/5"
        )}
        dir="auto"
      >
        {answer.length === 0 && (
          <span className="px-1 text-[13px] text-muted">Tap the words below to build the sentence…</span>
        )}
        {answer.map((token, i) => (
          <button
            key={`${token}-${i}`}
            type="button"
            onClick={() => !isLocked && removeToken(token, i)}
            disabled={isLocked}
            aria-label={`Remove word: ${token}`}
            className={cn(
              "inline-flex min-h-10 max-w-full items-center break-words rounded-lg border px-3 py-2 text-[15px] font-medium shadow-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              isLocked
                ? "border-border bg-surface text-foreground"
                : "border-primary/30 bg-primary-subtle text-foreground hover:border-danger/40 hover:bg-danger-subtle"
            )}
            dir="auto"
          >
            {token}
          </button>
        ))}
      </div>

      {/* Token pool */}
      {!isLocked && (
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Available words">
          {pool.map((token, i) => (
            <button
              key={`${token}-${i}`}
              type="button"
              onClick={() => addToken(token, i)}
              aria-label={`Add word: ${token}`}
              className="inline-flex min-h-11 max-w-full items-center break-words rounded-lg border border-border bg-surface px-3.5 py-2.5 text-[15px] font-medium text-foreground shadow-sm transition-colors hover:bg-primary-subtle/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              dir="auto"
            >
              {token}
            </button>
          ))}
        </div>
      )}

      {!isLocked && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={submit} disabled={answer.length === 0 || pool.length > 0} loading={busy} className="min-h-11">
            {busy ? "Checking…" : "Check answer"}
          </Button>
          <Button variant="ghost" onClick={reset} disabled={busy} className="min-h-11">
            <RotateCcw className="h-4 w-4" aria-hidden /> Reset
          </Button>
          {pool.length > 0 && answer.length > 0 && (
            <span className="text-[13px] text-muted">Use all the words to check.</span>
          )}
          {error && <p role="alert" className="text-[13px] text-danger">{error}</p>}
        </div>
      )}

      {feedback && (
        <div className="mt-4">
          <FeedbackBanner feedback={feedback} />
          {feedback.isCorrect === false && (
            <button
              type="button"
              onClick={reset}
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline"
            >
              <X className="h-3.5 w-3.5" aria-hidden /> Try again
            </button>
          )}
          {feedback.isCorrect === true && (
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-emerald-800">
              <Check className="h-3.5 w-3.5" aria-hidden /> {feedback.correctText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
